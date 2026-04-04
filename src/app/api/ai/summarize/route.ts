// src/app/api/ai/summarize/route.ts
// ⚠ NO edge runtime — uses Node.js crypto via @/lib/auth
//
// Billing: token-based pricing, all rates from pricing_rates DB.
//   Cost = (prompt_tokens / 1_000_000) * token_input_rate
//         + (completion_tokens / 1_000_000) * token_output_rate
//
// CRITICAL RULE: Deduction and transaction log happen BEFORE the stream starts.
// Reasoning: code inside ReadableStream.start() that runs after controller.close()
// may be terminated by the runtime once the HTTP response is fully consumed.
// Any billing after close() risks being silently dropped.
//
// Flow:
//   1. Build prompt, estimate input tokens (chars / 3.5)
//   2. Add conservative output estimate (2000 tokens)
//   3. Fetch rates from DB, compute estimated cost
//   4. Check balance covers estimate
//   5. DEDUCT estimated amount atomically — log transaction immediately
//   6. Start DeepSeek stream with stream_options.include_usage = true
//   7. After stream: get actual token counts from usage chunk
//   8. If actual cost differs from estimate → issue adjustment transaction
import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { query } from "@/config/db";
import { getRate, getBalance } from "@/lib/credits";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// Conservative output token ceiling for pre-deduction estimate
const OUTPUT_TOKEN_ESTIMATE = 2000;
// Token estimate from characters: 1 token ≈ 3.5 chars
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

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

    // ── Return cached summary — zero charge ───────────────────────
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

  // ── Fetch both token rates from DB ────────────────────────────────
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

  // ── Build prompt and estimate cost ────────────────────────────────
  const prompt = `You are a Senior Security Analyst presenting to a Corporate Board.
Summarize this ${toolName} scan for both technical staff and non-technical executives.

Structure:
1. **Executive Summary**: High-level overview in plain English.
2. **Risk Level**: Assign Critical / High / Medium / Low.
3. **Business Impact**: What happens if issues are not fixed.
4. **Top 3 Findings**: Most important issues as bullet points.
5. **Next Steps**: Clear, jargon-free action items.

Data: ${JSON.stringify(scanData).slice(0, 12_000)}`;

  const estimatedInputTokens  = estimateTokens(prompt);
  const estimatedOutputTokens = OUTPUT_TOKEN_ESTIMATE;
  const estimatedCost = Math.round(
    ((estimatedInputTokens / 1_000_000) * inputRate
    + (estimatedOutputTokens / 1_000_000) * outputRate) * 10_000,
  ) / 10_000;

  // ── Balance check against estimate ────────────────────────────────
  const balance = await getBalance(uid);
  if (balance < estimatedCost) {
    return NextResponse.json(
      {
        error:     `Insufficient credits. Estimated cost: ₹${estimatedCost.toFixed(4)}. Available: ₹${balance.toFixed(2)}.`,
        code:      "INSUFFICIENT_CREDITS",
        available: balance,
        required:  estimatedCost,
      },
      { status: 402 },
    );
  }

  // ── DEDUCT ESTIMATED COST NOW — before stream starts ─────────────
  // This is the only place billing happens. Code after controller.close()
  // is unreliable in serverless runtimes — never put billing there.
  const deducted = await query(
    `UPDATE user_credits
     SET balance     = balance - $1,
         total_spent = total_spent + $1,
         updated_at  = NOW()
     WHERE user_uid = $2 AND balance >= $1
     RETURNING balance`,
    [estimatedCost, uid],
  ).catch(() => null);

  if (!deducted?.rows.length) {
    return NextResponse.json(
      { error: "Insufficient credits or deduction failed.", code: "INSUFFICIENT_CREDITS" },
      { status: 402 },
    );
  }
  const balanceAfterEstimate = parseFloat(deducted.rows[0].balance);

  // ── LOG TRANSACTION NOW — before stream starts ────────────────────
  // Using "estimating..." so we can identify if adjustment is needed.
  const txRes = await query(
    `INSERT INTO credit_transactions
       (user_uid, type, amount, balance_after, description, ref_type, ref_id, tool_id)
     VALUES ($1, 'debit', $2, $3,
       $4,
       'ai_summary', $5, 'ai')
     RETURNING id`,
    [
      uid,
      estimatedCost,
      balanceAfterEstimate,
      `AI Summary: ~${estimatedInputTokens} input + ~${estimatedOutputTokens} output tokens (estimating)`,
      scanId || "unknown",
    ],
  ).catch(() => null);

  const txId = txRes?.rows?.[0]?.id ?? null;

  // Low-balance check
  if (balanceAfterEstimate < 500) {
    import("@/lib/notifications").then(({ checkBalanceAndNotify }) =>
      checkBalanceAndNotify(uid).catch(() => {}),
    ).catch(() => {});
  }

  // ── DeepSeek API ─────────────────────────────────────────────────
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    // Refund the pre-deduction and remove the transaction
    await query(
      `UPDATE user_credits SET balance = balance + $1, total_spent = total_spent - $1 WHERE user_uid = $2`,
      [estimatedCost, uid],
    ).catch(() => {});
    if (txId) {
      await query(`DELETE FROM credit_transactions WHERE id = $1`, [txId]).catch(() => {});
    }
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const dsRes = await fetch(DEEPSEEK_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body:    JSON.stringify({
      model:          "deepseek-chat",
      messages:       [{ role: "user", content: prompt }],
      stream:         true,
      temperature:    0.3,
      stream_options: { include_usage: true }, // Final chunk includes token counts
    }),
  });

  if (!dsRes.ok) {
    // Refund on API failure
    await query(
      `UPDATE user_credits SET balance = balance + $1, total_spent = total_spent - $1 WHERE user_uid = $2`,
      [estimatedCost, uid],
    ).catch(() => {});
    if (txId) {
      await query(`DELETE FROM credit_transactions WHERE id = $1`, [txId]).catch(() => {});
    }
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  // ── Stream and capture actual token usage ─────────────────────────
  let accumulated    = "";
  let promptTokens   = estimatedInputTokens;
  let outputTokens   = estimatedOutputTokens;
  let usageCaptured  = false;

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
            // DeepSeek sends usage in the final chunk when stream_options.include_usage = true
            if (json.usage && !usageCaptured) {
              promptTokens  = json.usage.prompt_tokens     || estimatedInputTokens;
              outputTokens  = json.usage.completion_tokens || Math.ceil(accumulated.length / 3.5);
              usageCaptured = true;
            }
          } catch { /* incomplete chunk */ }
        }
      }
      controller.close();

      // ── Post-stream: adjust transaction to reflect actual token usage ──
      // This is a best-effort update — it runs after close() so it might
      // not always complete in serverless environments, but the billing
      // has already been applied safely above.
      try {
        if (!usageCaptured) {
          outputTokens = Math.ceil(accumulated.length / 3.5);
        }
        const actualCost = Math.round(
          ((promptTokens / 1_000_000) * inputRate
          + (outputTokens / 1_000_000) * outputRate) * 10_000,
        ) / 10_000;

        const diff = Math.round((estimatedCost - actualCost) * 10_000) / 10_000;

        if (txId && diff !== 0) {
          if (diff > 0) {
            // Refund the overcharge
            await query(
              `UPDATE user_credits SET balance = balance + $1, total_spent = total_spent - $1, updated_at = NOW() WHERE user_uid = $2`,
              [diff, uid],
            );
            const newBal = await query(
              `SELECT COALESCE(balance,0) AS b FROM user_credits WHERE user_uid = $1`, [uid],
            );
            await query(
              `INSERT INTO credit_transactions (user_uid, type, amount, balance_after, description, ref_type, ref_id, tool_id)
               VALUES ($1, 'credit', $2, $3, 'AI Summary adjustment (actual < estimate)', 'ai_adjustment', $4, 'ai')`,
              [uid, diff, parseFloat(newBal.rows[0]?.b ?? "0"), scanId || "unknown"],
            );
          } else {
            // Charge the small extra (actual > estimate — uncommon)
            const extra = Math.abs(diff);
            await query(
              `UPDATE user_credits SET balance = balance - $1, total_spent = total_spent + $1, updated_at = NOW() WHERE user_uid = $2 AND balance >= $1`,
              [extra, uid],
            );
            const newBal = await query(
              `SELECT COALESCE(balance,0) AS b FROM user_credits WHERE user_uid = $1`, [uid],
            );
            await query(
              `INSERT INTO credit_transactions (user_uid, type, amount, balance_after, description, ref_type, ref_id, tool_id)
               VALUES ($1, 'debit', $2, $3, 'AI Summary adjustment (actual > estimate)', 'ai_adjustment', $4, 'ai')`,
              [uid, extra, parseFloat(newBal.rows[0]?.b ?? "0"), scanId || "unknown"],
            );
          }
        }

        // Update the original transaction description with actual token counts
        if (txId) {
          await query(
            `UPDATE credit_transactions
             SET description = $1, amount = $2
             WHERE id = $3`,
            [
              `AI Summary: ${promptTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens`,
              actualCost,
              txId,
            ],
          );
        }

        // Persist summary to DB cache
        if (accumulated && scanId) {
          const toolId = (await query(
            `SELECT tool_id FROM scans WHERE id = $1`, [scanId],
          ).catch(() => null))?.rows?.[0]?.tool_id || "unknown";

          await query(
            `INSERT INTO ai_summaries (scan_id, user_uid, tool_id, content)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (scan_id) DO UPDATE SET content = $4, updated_at = NOW()`,
            [scanId, uid, toolId, accumulated],
          ).catch(() => {});
        }
      } catch (err) {
        console.error("[AI Summarize] Post-stream adjustment error:", err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}