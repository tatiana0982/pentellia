// src/app/api/dashboard/scans/[id]/stream/route.ts
// REPLACED SSE with fast status-check endpoint.
// SSE required 55s open connection — Vercel Hobby kills functions at 10s.
// Frontend now polls this with exponential backoff instead.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

async function safeFetch(url: string, opts?: RequestInit) {
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(8_000), ...opts });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } catch { return { ok: false, status: 0, json: null }; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: scanId } = await params;

  const scanRes = await query(
    `SELECT s.*, t.name AS tool_name FROM scans s
     LEFT JOIN tools t ON s.tool_id = t.id
     WHERE s.id=$1 AND s.user_uid=$2 AND s.deleted_at IS NULL LIMIT 1`,
    [scanId, uid],
  );
  if (!scanRes.rows.length) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  let scan = scanRes.rows[0];

  if (TERMINAL.has(scan.status)) {
    return NextResponse.json({ success: true, scan, confirmations: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const base   = process.env.TOOLS_BASE_URL;
  const apiKey = process.env.TOOLS_API_KEY || "";

  if (!base || !scan.external_job_id) {
    return NextResponse.json({ success: true, scan, confirmations: [] });
  }

  const statusRes = await safeFetch(`${base}/status/${scan.external_job_id}`, { headers: { "X-API-Key": apiKey } });

  if (statusRes.status === 404) {
    const u = await query(`UPDATE scans SET status='failed', result='{"error":"Job not found"}'::jsonb, completed_at=NOW() WHERE id=$1 RETURNING *`, [scanId]);
    return NextResponse.json({ success: true, scan: { ...scan, ...u.rows[0] }, confirmations: [] });
  }
  if (!statusRes.ok) return NextResponse.json({ success: true, scan, confirmations: [] });

  const flaskData = statusRes.json;
  const newStatus = flaskData?.status ?? scan.status;

  let confirmations: any[] = [];
  if (!TERMINAL.has(newStatus)) {
    const cr = await safeFetch(`${base}/confirmations/${scan.external_job_id}`, { headers: { "X-API-Key": apiKey } });
    if (cr.ok) confirmations = cr.json?.confirmations ?? cr.json ?? [];
  }

  if (newStatus === "completed" && scan.status !== "completed") {
    const rr = await safeFetch(`${base}/results/${scan.external_job_id}?normalized=true`, { headers: { "X-API-Key": apiKey } });
    const result = rr.ok && rr.json ? rr.json : { error: "Could not fetch results" };
    const u = await query(`UPDATE scans SET status='completed', result=$1, completed_at=NOW() WHERE id=$2 RETURNING *`, [JSON.stringify(result), scanId]);
    scan = { ...scan, ...u.rows[0], tool_name: scan.tool_name };
    createNotification(uid, "Scan Complete", `Scan for ${scan.target} finished.`, "success", true).catch(() => {});
  } else if (newStatus !== scan.status) {
    if (newStatus === "failed") createNotification(uid, "Scan Failed", `Scan for ${scan.target} failed.`, "error").catch(() => {});
    await query(`UPDATE scans SET status=$1 WHERE id=$2`, [newStatus, scanId]);
    scan.status = newStatus;
  }

  return NextResponse.json({ success: true, scan, pythonStatus: flaskData, confirmations }, { headers: { "Cache-Control": "no-store" } });
}