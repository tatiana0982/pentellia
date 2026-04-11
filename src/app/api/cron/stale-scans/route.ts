// src/app/api/cron/stale-scans/route.ts
// Runs every 15 min via Vercel Cron.
// Finds scans that have been queued/running for 2+ hours and marks them
// as failed. This handles Flask restart scenarios where the job_id was lost.
// Also attempts to fetch results for scans that completed on Flask but
// whose status update was missed (e.g., network timeout during polling).

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const toolsBaseUrl = process.env.TOOLS_BASE_URL;
  const apiKey       = process.env.TOOLS_API_KEY || "";
  const results      = { recovered: 0, marked_failed: 0 };

  try {
    // ── 1. Find scans stuck in queued/running state for 2+ hours ─
    const stale = await query(
      `SELECT id, external_job_id, user_uid, target FROM scans
       WHERE status IN ('queued', 'running')
         AND created_at < NOW() - INTERVAL '2 hours'
         AND deleted_at IS NULL`,
    );

    for (const scan of stale.rows) {
      if (!toolsBaseUrl || !scan.external_job_id) {
        // No way to check — mark failed
        await query(
          `UPDATE scans SET status = 'failed', completed_at = NOW(),
           result = '{"error":"Job timed out — scan engine may have restarted"}'::jsonb
           WHERE id = $1`,
          [scan.id],
        );
        results.marked_failed++;
        continue;
      }

      // Try to recover from Flask
      try {
        const statusRes = await fetch(`${toolsBaseUrl}/status/${scan.external_job_id}`, {
          headers: { "X-API-Key": apiKey },
          signal:  AbortSignal.timeout(8_000),
        });

        if (!statusRes.ok) {
          // 404 = job lost
          await query(
            `UPDATE scans SET status = 'failed', completed_at = NOW(),
             result = '{"error":"Job not found on scan engine"}'::jsonb
             WHERE id = $1`,
            [scan.id],
          );
          results.marked_failed++;
          continue;
        }

        const flaskStatus = await statusRes.json();

        if (flaskStatus.status === "completed") {
          // Fetch results and save
          const resultRes = await fetch(
            `${toolsBaseUrl}/results/${scan.external_job_id}?normalized=true`,
            { headers: { "X-API-Key": apiKey }, signal: AbortSignal.timeout(15_000) },
          );
          const result = resultRes.ok ? await resultRes.json() : { error: "Could not fetch results" };

          await query(
            `UPDATE scans SET status = 'completed', result = $1, completed_at = NOW() WHERE id = $2`,
            [JSON.stringify(result), scan.id],
          );
          results.recovered++;

        } else if (flaskStatus.status === "failed") {
          await query(
            `UPDATE scans SET status = 'failed', completed_at = NOW() WHERE id = $1`,
            [scan.id],
          );
          results.marked_failed++;
        }
        // If still running — leave it alone, retry next cycle
      } catch {
        // Network error — skip, retry next cycle
      }
    }

    if (results.recovered > 0 || results.marked_failed > 0) {
      console.log("[Cron/StaleScans]", results);
    }
    return NextResponse.json({ success: true, results });

  } catch (err: any) {
    console.error("[Cron/StaleScans] Failed:", err?.message);
    return NextResponse.json({ error: "Failed", detail: err?.message }, { status: 500 });
  }
}