// src/app/api/ai/summarize/route.ts
// ⚠ NO edge runtime — uses Node.js crypto via @/lib/auth
//
// Pricing: token-based, all rates from pricing_rates DB table.
//   Cost = (prompt_tokens / 1_000_000) * token_input_rate
//         + (completion_tokens / 1_000_000) * token_output_rate
//
// Flow:
//   1. Estimate input tokens from prompt length (chars / 3.5 ≈ conservative)
//   2. Check balance covers minimum estimate
//   3. Stream with stream_options.include_usage = true
//   4. Parse final usage chunk → exact prompt_tokens + completion_tokens
//   5. Deduct exact amount atomically after stream completes
//   6. Log single transaction: "AI Summary: Npk in + Npk out tokens"
import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { query } from "@/config/db";
import { getRate, getBalance } from "@/lib/credits";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// Token estimation: 1 token ≈ 3.5 characters (conservative — avoids under-charging)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// Minimum INR balance required before we even attempt — covers a generous estimate
const MINIMUM_BALANCE_INR = 5;

export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { scanData, toolName, scanId } = body;
  if (!scanData || !toolName) {
    return NextResponse.json({ error: "Missing scan data" }, { status: 400 });
  }

  // ── Validate scan ownership ────────────────────────────────────────
  if (scanId) {
    const check = await query(
      `SELECT id FROM scans WHERE id = $1 AND user_uid = $2 LIMIT 1`,
      [scanId, uid],
    ).catch(() => null);
    if (!check?.rows.length) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // ── Return cached summary — no charge ─────────────────────────
    const cached = await query(
      `SELECT content FROM ai_summaries WHERE scan_id = $1 LIMIT 1`,
      [scanId],
    ).catch(() => null);
    if (cached?.rows?.[0]?.content) {
      const enc = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(enc.encode(cached.rows[0].content));
            c.close();
          },
        }),
        { headers: { "Content-Type": "text/plain" } },
      );
    }
  }

  // ── Fetch token rates from DB ──────────────────────────────────────
  let inputRate: number;
  let outputRate: number;
  try {
    [inputRate, outputRate] = await Promise.all([
      getRate("token_input"),
      getRate("token_output"),
    ]);
  } catch (err) {
    console.error("[AI Summarize] Could not fetch token rates:", err);
    return NextResponse.json({ error: "Pricing service unavailable" }, { status: 503 });
  }

  // ── Balance check against conservative estimate ────────────────────
  // We don't know the exact cost until stream completes, so check minimum.
  const balance = await getBalance(uid);
  if (balance < MINIMUM_BALANCE_INR) {
    return NextResponse.json(
      {
        error:     `Insufficient credits. Minimum ₹${MINIMUM_BALANCE_INR} required for AI summary. Available: ₹${balance.toFixed(2)}.`,
        code:      "INSUFFICIENT_CREDITS",
        available: balance,
      },
      { status: 402 },
    );
  }

  // ── DeepSeek API key ──────────────────────────────────────────────
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  // ── Build prompt ──────────────────────────────────────────────────
  const prompt = `You are a Senior Security Analyst presenting to a Corporate Board.
Summarize this ${toolName} scan for both technical staff and non-technical executives.

Structure:
1. **Executive Summary**: High-level overview in plain English.
2. **Risk Level**: Assign Critical / High / Medium / Low.
3. **Business Impact**: What happens if issues are not fixed.
4. **Top 3 Findings**: Most important issues as bullet points.
5. **Next Steps**: Clear, jargon-free action items.

Data: ${JSON.stringify(scanData).slice(0, 12_000)}`;

  const estimatedInputTokens = estimateTokens(prompt);

  const dsRes = await fetch(DEEPSEEK_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body:    JSON.stringify({
      model:          "deepseek-chat",
      messages:       [{ role: "user", content: prompt }],
      stream:         true,
      temperature:    0.3,
      stream_options: { include_usage: true }, // DeepSeek sends usage in final chunk
    }),
  });

  if (!dsRes.ok) {
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  // ── Streaming with usage capture ─────────────────────────────────
  let accumulated   = "";
  let promptTokens  = estimatedInputTokens; // fallback to estimate if API doesn't return usage
  let outputTokens  = 0;
  let usageCaptured = false;

  const stream = new ReadableStream({
    async start(controller) {
      const reader  = dsRes.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let   buffer  = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleaned = line.replace(/^data: /, "").trim();
          if (!cleaned || cleaned === "[DONE]") continue;

          try {
            const json    = JSON.parse(cleaned);
            const content = json.choices?.[0]?.delta?.content || "";
            if (content) {
              accumulated += content;
              controller.enqueue(encoder.encode(content));
            }

            // Capture usage from final chunk (stream_options.include_usage)
            if (json.usage && !usageCaptured) {
              promptTokens  = json.usage.prompt_tokens     || estimatedInputTokens;
              outputTokens  = json.usage.completion_tokens || Math.ceil(accumulated.length / 3.5);
              usageCaptured = true;
            }
          } catch { /* incomplete chunk */ }
        }
      }
      controller.close();

      // If usage not in stream (API fallback), estimate from actual output
      if (!usageCaptured) {
        outputTokens = Math.ceil(accumulated.length / 3.5);
      }

      // ── Deduct exact token-based cost ─────────────────────────────
      const exactCost = (promptTokens / 1_000_000) * inputRate
                      + (outputTokens / 1_000_000) * outputRate;
      // Round to 4 decimal places to avoid floating point noise in DB
      const roundedCost = Math.round(exactCost * 10_000) / 10_000;

      if (roundedCost > 0) {
        const deducted = await query(
          `UPDATE user_credits
           SET balance     = balance - $1,
               total_spent = total_spent + $1,
               updated_at  = NOW()
           WHERE user_uid = $2 AND balance >= $1
           RETURNING balance`,
          [roundedCost, uid],
        ).catch(() => null);

        const balanceAfter = deducted?.rows?.[0]
          ? parseFloat(deducted.rows[0].balance)
          : balance - roundedCost;

        // Log transaction with token breakdown
        await query(
          `INSERT INTO credit_transactions
             (user_uid, type, amount, balance_after, description, ref_type, ref_id, tool_id)
           VALUES ($1, 'debit', $2, $3, $4, 'ai_summary', $5, 'ai')`,
          [
            uid,
            roundedCost,
            balanceAfter,
            `AI Summary: ${promptTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens`,
            scanId || "unknown",
          ],
        ).catch(() => {});

        // Low-balance alert
        if (balanceAfter < 500) {
          import("@/lib/notifications").then(({ checkBalanceAndNotify }) =>
            checkBalanceAndNotify(uid).catch(() => {}),
          ).catch(() => {});
        }
      }

      // ── Persist summary to DB (cache for free reuse) ──────────────
      if (accumulated && scanId) {
        const toolId = (await query(
          `SELECT tool_id FROM scans WHERE id = $1`,
          [scanId],
        ).catch(() => null))?.rows?.[0]?.tool_id || "unknown";

        await query(
          `INSERT INTO ai_summaries (scan_id, user_uid, tool_id, content)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (scan_id) DO UPDATE SET content = $4, updated_at = NOW()`,
          [scanId, uid, toolId, accumulated],
        ).catch(() => {});
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}