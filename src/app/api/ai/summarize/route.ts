// IMPORTANT: NO export const runtime = "edge" — must use Node.js runtime.

import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { query } from "@/config/db";
import { getActiveSubscription } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Require active subscription (any plan) ───────────────────────
  const sub = await getActiveSubscription(uid);
  if (!sub) {
    return NextResponse.json(
      { error: "Active subscription required for AI summaries.", code: "NO_SUBSCRIPTION", action: "/subscription" },
      { status: 402 },
    );
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { scanId } = body;
  if (!scanId) return NextResponse.json({ error: "scanId required" }, { status: 400 });

  // ── Check if summary already cached ─────────────────────────────
  const cached = await query(
    `SELECT content FROM ai_summaries WHERE scan_id=$1 AND user_uid=$2 LIMIT 1`,
    [scanId, uid],
  );
  if (cached.rows.length) {
    return NextResponse.json({ success: true, content: cached.rows[0].content, cached: true });
  }

  // ── Fetch scan result ────────────────────────────────────────────
  const scanRes = await query(
    `SELECT s.result, s.tool_id, s.target, t.name AS tool_name
     FROM scans s JOIN tools t ON s.tool_id = t.id
     WHERE s.id=$1 AND s.user_uid=$2 AND s.status='completed' LIMIT 1`,
    [scanId, uid],
  );
  if (!scanRes.rows.length) {
    return NextResponse.json({ error: "Scan not found or not completed" }, { status: 404 });
  }

  const scan = scanRes.rows[0];

  // ── Stream from DeepSeek ─────────────────────────────────────────
  const systemPrompt = `You are a Chief Information Security Officer presenting to a Corporate Board.
Summarize this tool scan for both technical staff and non-technical executives.
Structure:
1. *Executive Summary*: Overall Vulnerabilities Summary in plain English.
2. *Risk Level*: Assign Critical / High / Medium / Low.
3. *Business Impact*: What happens if issues are not fixed.
4. Mitigations: Detailed Mitigations for top 3 Findings as bullet points.
5. *Top 3 Findings*: Important or High Level issues as bullet points.
5. *Next Steps*: Clear, jargon-free action items.`;

  const userPrompt = `Scan Tool: ${scan.tool_name}
Target: ${scan.target}
Results: ${JSON.stringify(scan.result, null, 2).slice(0, 8000)}`;

  try {
    const deepseekRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model:  "deepseek-chat",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
      }),
    });

    if (!deepseekRes.ok) {
      throw new Error(`DeepSeek API error: ${deepseekRes.status}`);
    }

    // ── Stream response to client ────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const reader  = deepseekRes.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(l => l.startsWith("data:"));

          for (const line of lines) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed  = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                fullContent += content;
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch { /* skip malformed chunk */ }
          }
        }

        // Save to cache after stream completes
        if (fullContent) {
          query(
            `INSERT INTO ai_summaries (scan_id, user_uid, tool_id, content, model)
             VALUES ($1, $2, $3, $4, 'deepseek-chat')
             ON CONFLICT (scan_id) DO UPDATE SET content=EXCLUDED.content, updated_at=NOW()`,
            [scanId, uid, scan.tool_id, fullContent],
          ).catch(console.error);
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });

  } catch (err: any) {
    console.error("[AISummarize]", err?.message);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
