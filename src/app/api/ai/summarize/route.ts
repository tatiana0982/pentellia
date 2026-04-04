// src/app/api/ai/summarize/route.ts
// ⚠ NO edge runtime — uses Node.js crypto via @/lib/auth
import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { query } from "@/config/db";
import { getRate } from "@/lib/credits";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

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

  // ── Fetch AI summary cost from DB (no hardcoding) ──────────────────
  // pricing_rates.ai_summary is the authoritative price.
  let AI_COST: number;
  try {
    AI_COST = await getRate("ai_summary");
  } catch (err) {
    console.error("[AI Summarize] Could not fetch ai_summary rate:", err);
    return NextResponse.json({ error: "Pricing service unavailable" }, { status: 503 });
  }

  // ── Atomic credit deduction ────────────────────────────────────────
  // Single UPDATE WHERE balance >= cost — race-condition safe.
  const deducted = await query(
    `UPDATE user_credits
     SET balance     = balance - $1,
         total_spent = total_spent + $1,
         updated_at  = NOW()
     WHERE user_uid = $2 AND balance >= $1
     RETURNING balance`,
    [AI_COST, uid],
  ).catch(() => null);

  if (!deducted?.rows.length) {
    const balRes  = await query(
      `SELECT COALESCE(balance, 0) AS b FROM user_credits WHERE user_uid = $1`,
      [uid],
    ).catch(() => null);
    const current = parseFloat(balRes?.rows?.[0]?.b ?? "0");
    return NextResponse.json(
      {
        error:     `Insufficient credits. AI summary costs ₹${AI_COST}. Available: ₹${current.toFixed(2)}.`,
        code:      "INSUFFICIENT_CREDITS",
        required:  AI_COST,
        available: current,
      },
      { status: 402 },
    );
  }
  const balanceAfter = parseFloat(deducted.rows[0].balance);

  // ── Log transaction immediately (before stream starts) ────────────
  // Logged here so the audit record is never lost if the stream errors.
  await query(
    `INSERT INTO credit_transactions
       (user_uid, type, amount, balance_after, description, ref_type, ref_id, tool_id)
     VALUES ($1, 'debit', $2, $3, 'AI Executive Summary', 'ai_summary', $4, 'ai')`,
    [uid, AI_COST, balanceAfter, scanId || "unknown"],
  ).catch(() => {});

  // Balance alert
  try {
    const { checkBalanceAndNotify } = await import("@/lib/notifications");
    checkBalanceAndNotify(uid).catch(() => {});
  } catch {}

  // ── Fetch DeepSeek API key ────────────────────────────────────────
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    // Refund — config error is not the user's fault
    await query(
      `UPDATE user_credits SET balance = balance + $1, total_spent = total_spent - $1 WHERE user_uid = $2`,
      [AI_COST, uid],
    ).catch(() => {});
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const prompt = `You are a Senior Security Analyst presenting to a Corporate Board.
Summarize this ${toolName} scan for both technical staff and non-technical executives.

Structure:
1. **Executive Summary**: High-level overview in plain English.
2. **Risk Level**: Assign Critical / High / Medium / Low.
3. **Business Impact**: What happens if issues are not fixed.
4. **Top 3 Findings**: Most important issues as bullet points.
5. **Next Steps**: Clear, jargon-free action items.

Data: ${JSON.stringify(scanData).slice(0, 12_000)}`;

  const dsRes = await fetch(DEEPSEEK_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body:    JSON.stringify({
      model:       "deepseek-chat",
      messages:    [{ role: "user", content: prompt }],
      stream:      true,
      temperature: 0.3,
    }),
  });

  if (!dsRes.ok) {
    // Refund — DeepSeek API error
    await query(
      `UPDATE user_credits SET balance = balance + $1, total_spent = total_spent - $1 WHERE user_uid = $2`,
      [AI_COST, uid],
    ).catch(() => {});
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  let accumulated = "";
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
            if (content) { accumulated += content; controller.enqueue(encoder.encode(content)); }
          } catch { /* incomplete chunk */ }
        }
      }
      controller.close();

      // Persist summary to DB (cache for free reuse)
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