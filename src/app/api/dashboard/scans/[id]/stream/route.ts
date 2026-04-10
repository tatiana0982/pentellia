// src/app/api/dashboard/scans/[id]/stream/route.ts
// Server-Sent Events endpoint for real-time scan status updates.
// Replaces the client-side setInterval polling pattern.
//
// Client connects once with EventSource.
// Server polls Flask (increasing backoff) and pushes only on status change.
// Closes automatically when scan reaches terminal state.
// Vercel max execution: 60s — client auto-reconnects via EventSource.

import { NextRequest } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// Vercel serverless max = 60s. We run for max 55s then send a "reconnect" event.
const MAX_RUNTIME_MS   = 55_000;
const INITIAL_DELAY_MS = 2_000;   // first check after 2s
const MAX_DELAY_MS     = 8_000;   // max interval between Flask checks
const TERMINAL         = new Set(["completed", "failed", "cancelled"]);

function sse(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return new Response("Unauthorized", { status: 401 });

  const { id: scanId } = await params;

  const encoder = new TextEncoder();
  let   closed  = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(sse(event, data))); }
        catch { closed = true; }
      };

      // ── Load scan from DB ──────────────────────────────────────
      const scanRes = await query(
        `SELECT s.*, t.name AS tool_name FROM scans s
         LEFT JOIN tools t ON s.tool_id = t.id
         WHERE s.id=$1 AND s.user_uid=$2 AND s.deleted_at IS NULL LIMIT 1`,
        [scanId, uid],
      );

      if (!scanRes.rows.length) {
        send("error", { message: "Scan not found" });
        controller.close();
        return;
      }

      let scan           = scanRes.rows[0];
      const toolsBaseUrl = process.env.TOOLS_BASE_URL;
      const apiKey       = process.env.TOOLS_API_KEY || "";

      // Send initial state immediately
      send("status", { scan });

      // Already terminal — close immediately
      if (TERMINAL.has(scan.status)) {
        send("close", { reason: "terminal" });
        controller.close();
        return;
      }

      // ── Poll Flask with exponential backoff ────────────────────
      const startTime = Date.now();
      let   delay     = INITIAL_DELAY_MS;
      let   lastStatus = scan.status;

      while (!closed) {
        await new Promise(r => setTimeout(r, delay));

        // Max runtime check — tell client to reconnect
        if (Date.now() - startTime > MAX_RUNTIME_MS) {
          send("reconnect", { after: 1000 });
          break;
        }

        if (!toolsBaseUrl || !scan.external_job_id) break;

        // Check Flask status
        let flaskData: any = null;
        try {
          const r = await fetch(`${toolsBaseUrl}/status/${scan.external_job_id}`, {
            headers: { "X-API-Key": apiKey },
            signal:  AbortSignal.timeout(8_000),
          });
          if (r.ok) flaskData = await r.json();
        } catch { /* network hiccup — keep polling */ }

        const newStatus = flaskData?.status ?? scan.status;

        // Check for pending confirmations
        let confirmations: any[] = [];
        if (!TERMINAL.has(newStatus)) {
          try {
            const cr = await fetch(`${toolsBaseUrl}/confirmations/${scan.external_job_id}`, {
              headers: { "X-API-Key": apiKey },
              signal:  AbortSignal.timeout(5_000),
            });
            if (cr.ok) {
              const cd = await cr.json();
              confirmations = cd?.confirmations ?? cd ?? [];
            }
          } catch { /* non-critical */ }
        }

        // Push update if anything changed
        if (newStatus !== lastStatus || confirmations.length > 0) {
          lastStatus = newStatus;

          if (newStatus === "completed" && scan.status !== "completed") {
            // Fetch results and update DB
            let result: any = { error: "Could not fetch results" };
            try {
              const rr = await fetch(
                `${toolsBaseUrl}/results/${scan.external_job_id}?normalized=true`,
                { headers: { "X-API-Key": apiKey }, signal: AbortSignal.timeout(15_000) },
              );
              if (rr.ok) result = await rr.json();
            } catch { /* keep error placeholder */ }

            const updated = await query(
              `UPDATE scans SET status='completed', result=$1, completed_at=NOW()
               WHERE id=$2 RETURNING *`,
              [JSON.stringify(result), scanId],
            );
            scan = { ...scan, ...updated.rows[0], tool_name: scan.tool_name };
          } else if (newStatus !== scan.status) {
            await query(`UPDATE scans SET status=$1 WHERE id=$2`, [newStatus, scanId]);
            scan.status = newStatus;
          }

          send("status", { scan, confirmations, pythonStatus: flaskData });
        }

        if (TERMINAL.has(newStatus)) {
          send("close", { reason: "terminal" });
          break;
        }

        // Backoff: 2s → 4s → 8s → 8s → ...
        delay = Math.min(delay * 1.5, MAX_DELAY_MS);
      }

      if (!closed) controller.close();
      closed = true;
    },
    cancel() { closed = true; },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":                "text/event-stream",
      "Cache-Control":               "no-cache, no-transform",
      "Connection":                  "keep-alive",
      "X-Accel-Buffering":           "no",   // disable Nginx buffering
    },
  });
}