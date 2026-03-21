// src/app/api/dashboard/scans/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

// ─── POST — CMS confirmation / interactive confirm ────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { confirm, external_job_id } = body;

  try {
    const dbRes = await query(
      `SELECT external_job_id FROM scans WHERE id = $1 AND user_uid = $2`,
      [id, uid],
    );
    if (!dbRes.rows.length) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const dbJobId = dbRes.rows[0].external_job_id;
    if (external_job_id !== dbJobId) {
      return NextResponse.json({ error: "Job ID mismatch" }, { status: 400 });
    }

    const toolsBase = process.env.TOOLS_BASE_URL!;
    const apiKey    = process.env.TOOLS_API_KEY || "";

    const pythonRes = await fetch(`${toolsBase}/confirm-cms/${external_job_id}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body:    JSON.stringify({ confirm }),
      signal:  AbortSignal.timeout(15_000),
    });

    if (!pythonRes.ok) {
      return NextResponse.json({ error: "Upstream service error" }, { status: 502 });
    }

    const data = await pythonRes.json();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET — poll scan status, sync results from external API ───────────
export async function GET(req: NextRequest, { params }: Params) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const dbRes = await query(
      `SELECT s.*, t.name AS tool_name,
              a.summary AS ai_summary
       FROM scans s
       LEFT JOIN tools t ON s.tool_id = t.id
       LEFT JOIN ai_summaries a ON a.scan_id = s.id
       WHERE s.id = $1 AND s.user_uid = $2`,
      [id, uid],
    );

    if (!dbRes.rows.length) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    let scan = dbRes.rows[0];

    // If already terminal, return immediately — no external call needed
    if (["completed", "failed", "cancelled"].includes(scan.status)) {
      return NextResponse.json({ success: true, scan });
    }

    // Sync with external Python API
    const externalJobId = scan.external_job_id;
    const toolsBase     = process.env.TOOLS_BASE_URL!;
    const apiKey        = process.env.TOOLS_API_KEY || "";

    const statusRes = await fetch(`${toolsBase}/status/${externalJobId}`, {
      headers: { "X-API-Key": apiKey },
      signal:  AbortSignal.timeout(15_000),
    });

    // Handle zombie job (job missing from worker)
    if (statusRes.status === 404) {
      const update = await query(
        `UPDATE scans SET status = 'failed', completed_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id],
      );
      scan = { ...scan, ...update.rows[0] };
      createNotification(uid, "Scan Failed", `Scan for ${scan.target} could not be found on the worker.`, "error").catch(() => {});
      return NextResponse.json({ success: true, scan });
    }

    if (!statusRes.ok) {
      return NextResponse.json({ success: true, scan }); // return cached state
    }

    const pythonStatus = await statusRes.json();

    // Pass interactive confirmations back to the client
    if (pythonStatus.confirmations?.length) {
      return NextResponse.json({ success: true, scan, confirmations: pythonStatus.confirmations, pythonStatus });
    }

    if (pythonStatus.status === "running" || pythonStatus.status === "queued") {
      await query(`UPDATE scans SET status = $1 WHERE id = $2`, [pythonStatus.status, id]).catch(() => {});
      return NextResponse.json({ success: true, scan: { ...scan, status: pythonStatus.status }, pythonStatus });
    }

    if (pythonStatus.status === "completed" || pythonStatus.status === "failed") {
      const isDiscovery = scan.tool_id === "discovery" || scan.tool_name === "Asset Discovery";
      const resultUrl   = isDiscovery
        ? `${toolsBase}/results/${externalJobId}`
        : `${toolsBase}/results/${externalJobId}?normalized=true`;

      const resultRes  = await fetch(resultUrl, { headers: { "X-API-Key": apiKey }, signal: AbortSignal.timeout(30_000) });
      const resultData = await resultRes.json();

      const newStatus  = resultData.error ? "failed" : "completed";
      const updateRes  = await query(
        `UPDATE scans SET status = $1, result = $2, completed_at = NOW()
         WHERE id = $3 RETURNING *`,
        [newStatus, JSON.stringify(resultData), id],
      );
      scan = { ...scan, ...updateRes.rows[0] };

      if (newStatus === "completed") {
        createNotification(uid, "Scan Completed", `Scan finished for ${scan.target}.`, "success").catch(() => {});
      } else {
        createNotification(uid, "Scan Failed", `Scan for ${scan.target} failed.`, "error").catch(() => {});
      }
    }

    return NextResponse.json({ success: true, scan });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE — remove scan ────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const res = await query(
      `DELETE FROM scans WHERE id = $1 AND user_uid = $2 RETURNING id`,
      [id, uid],
    );
    if (!res.rowCount) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete scan" }, { status: 500 });
  }
}