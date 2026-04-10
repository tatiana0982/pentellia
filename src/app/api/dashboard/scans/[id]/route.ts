// src/app/api/dashboard/scans/[id]/route.ts
// Phase 3: Credit billing REMOVED. Scan completion just updates status.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";


import { createNotification } from "@/lib/notifications";
import { getUid } from "@/lib/auth";  // ← central getUid, no checkRevoked


async function safeFetch(url: string, opts?: RequestInit) {
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(20_000), ...opts });
    let json: any = null;
    try { json = await res.json(); } catch { json = null; }
    return { ok: res.ok, status: res.status, json };
  } catch (err: any) {
    return { ok: false, status: 0, json: null, error: err.message };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const scanRes = await query(
    `SELECT s.*, t.name AS tool_name, t.category
     FROM scans s
     LEFT JOIN tools t ON s.tool_id = t.id
     WHERE s.id = $1 AND s.user_uid = $2 AND s.deleted_at IS NULL
     LIMIT 1`,
    [id, uid],
  );

  if (!scanRes.rows.length) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  let scan = scanRes.rows[0];

  if (["completed", "failed", "cancelled"].includes(scan.status)) {
    return NextResponse.json({ success: true, scan });
  }

  const toolsBaseUrl  = process.env.TOOLS_BASE_URL;
  const apiKey        = process.env.TOOLS_API_KEY || "";
  const externalJobId = scan.external_job_id;

  if (!externalJobId || !toolsBaseUrl) {
    return NextResponse.json({ success: true, scan });
  }

  const statusRes = await safeFetch(`${toolsBaseUrl}/status/${externalJobId}`, {
    headers: { "X-API-Key": apiKey },
  });

  if (statusRes.status === 404) {
    console.error(`[Scans/id] Job ${externalJobId} missing on engine. Marking failed.`);
    const updateRes = await query(
      `UPDATE scans SET status = 'failed', result = $1, completed_at = NOW()
       WHERE id = $2 RETURNING *`,
      [JSON.stringify({ error: "Job lost on scan engine" }), id],
    );
    scan = { ...scan, ...updateRes.rows[0] };
    await createNotification(uid, "Scan Failed", `Scan for ${scan.target} was lost.`, "error");
    return NextResponse.json({ success: true, scan });
  }

  if (!statusRes.ok) {
    return NextResponse.json({ success: true, scan });
  }

  const statusData = statusRes.json;
  const newStatus  = statusData?.status;

  let confirmations: any[] = [];
  if (!["completed", "failed", "cancelled"].includes(newStatus)) {
    try {
      const confRes = await safeFetch(`${toolsBaseUrl}/confirmations/${externalJobId}`, {
        headers: { "X-API-Key": apiKey },
      });
      if (confRes.ok) confirmations = confRes.json?.confirmations ?? confRes.json ?? [];
    } catch { /* non-critical */ }
  }

  if (newStatus !== "completed") {
    if (newStatus !== scan.status) {
      if (newStatus === "failed") {
        await createNotification(uid, "Scan Failed", `Scan for ${scan.target} failed.`, "error");
      }
      await query(`UPDATE scans SET status = $1 WHERE id = $2`, [newStatus, id]);
      scan.status = newStatus;
    }
    return NextResponse.json({ success: true, scan, pythonStatus: statusData, confirmations });
  }

  if (newStatus === "completed" && scan.status !== "completed") {
    const resultRes = await safeFetch(`${toolsBaseUrl}/result/${externalJobId}`, {
      headers: { "X-API-Key": apiKey },
    });
    const result  = resultRes.ok && resultRes.json ? resultRes.json : { error: "Could not fetch results" };
    const updated = await query(
      `UPDATE scans SET status = 'completed', result = $1, completed_at = NOW()
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(result), id],
    );
    scan = { ...scan, ...updated.rows[0] };
    await createNotification(
      uid, "Scan Complete", `Security scan for ${scan.target} has finished.`, "success", true,
    );
  }

  return NextResponse.json({ success: true, scan, pythonStatus: statusData, confirmations });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await query(
    `UPDATE scans SET status = 'cancelled' WHERE id = $1 AND user_uid = $2 RETURNING id`,
    [id, uid],
  );
  if (!res.rows.length) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await query(
    `UPDATE scans SET deleted_at = NOW() WHERE id = $1 AND user_uid = $2 RETURNING id`,
    [id, uid],
  );
  if (!res.rows.length) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}