// src/app/api/dashboard/scans/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";
import { createNotification } from "@/lib/notifications";
import {
  getScanCostFromDB,
  deductCredits,
  isScanAlreadyCharged,
} from "@/lib/credits";

async function getUid() {
  const cookieStore    = await cookies();
  const sessionCookie  = cookieStore.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

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

// ── Charge for a completed scan (idempotency-safe) ────────────────────
// Always called AFTER the scan result is persisted to DB.
// Skips silently if the scan was already charged (handles polling duplicates).
async function chargeForScan(uid: string, scanId: string, toolId: string, target: string) {
  try {
    // Idempotency guard — polling calls this path multiple times
    const alreadyCharged = await isScanAlreadyCharged(scanId);
    if (alreadyCharged) return;

    // Fetch the correct rate from DB based on tool category
    const { rateKey, amount } = await getScanCostFromDB(toolId);

    const result = await deductCredits(
      uid,
      amount,
      `Scan: ${toolId} → ${target}`,
      "scan",
      scanId,
      toolId,
    );

    if (!result.success) {
      // Log the failure — the scan already completed so we cannot roll it back,
      // but we must record the deduction attempt for reconciliation.
      console.error(
        `[Billing] Failed to charge scan ${scanId} (${rateKey} ₹${amount}): ${result.error}`,
      );
    } else {
      console.log(
        `[Billing] Scan ${scanId} charged: ${rateKey} ₹${amount}. Balance after: ₹${result.balanceAfter}`,
      );
    }
  } catch (err) {
    console.error(`[Billing] chargeForScan error for scan ${scanId}:`, err);
  }
}

// ── POST: CMS interactive confirmation ───────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const body = await req.json();
    const { confirm, external_job_id } = body;

    const dbRes = await query(
      `SELECT external_job_id FROM scans WHERE id = $1 AND user_uid = $2`,
      [id, uid],
    );
    if (!dbRes.rows.length) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    const dbJobId = dbRes.rows[0].external_job_id;
    if (external_job_id !== dbJobId)
      return NextResponse.json({ error: "Job ID mismatch" }, { status: 400 });

    const { ok, json, status } = await safeFetch(
      `${process.env.TOOLS_BASE_URL}/confirm-cms/${external_job_id}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": process.env.TOOLS_API_KEY || "" },
        body:    JSON.stringify({ confirm }),
      },
    );
    if (!ok) return NextResponse.json({ error: "Python server error" }, { status: status || 502 });
    return NextResponse.json({ success: true, data: json });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── GET: Poll scan status + deduct on completion ──────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const dbRes = await query(
      `SELECT s.*, t.name AS tool_name
       FROM scans s LEFT JOIN tools t ON s.tool_id = t.id
       WHERE s.id = $1 AND s.user_uid = $2`,
      [id, uid],
    );
    if (!dbRes.rows.length)
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    let scan = dbRes.rows[0];

    // Already finished — ensure it was charged, then return
    if (["completed", "failed", "cancelled"].includes(scan.status)) {
      if (scan.status === "completed") {
        // Non-blocking — fire and forget, idempotency guard inside
        chargeForScan(uid, scan.id, scan.tool_id, scan.target).catch(() => {});
      }
      return NextResponse.json({ success: true, scan });
    }

    const toolsBase = process.env.TOOLS_BASE_URL;
    const apiKey    = process.env.TOOLS_API_KEY || "";
    const jobId     = scan.external_job_id;

    // Fetch current status from Flask
    const statusResult = await safeFetch(`${toolsBase}/status/${jobId}`, {
      headers: { "X-API-Key": apiKey },
    });

    // Flask unreachable — return current DB state
    if (statusResult.status === 0) {
      console.error(`[Scan] Flask unreachable: ${statusResult.error}`);
      return NextResponse.json({ success: true, scan, confirmations: [] });
    }

    // Job missing on Flask — mark failed (no charge for failed scans)
    if (statusResult.status === 404) {
      const updateRes = await query(
        `UPDATE scans SET status='failed', result=$1, completed_at=NOW() WHERE id=$2 RETURNING *`,
        [JSON.stringify({ error: "Job no longer exists on scan server" }), id],
      );
      scan = { ...scan, ...updateRes.rows[0] };
      createNotification(uid, "Scan Failed", `Scan for ${scan.target} was lost.`, "error").catch(() => {});
      return NextResponse.json({ success: true, scan });
    }

    if (!statusResult.ok) {
      return NextResponse.json({ success: true, scan, confirmations: [] });
    }

    const statusData = statusResult.json;
    const newStatus  = statusData?.status;

    // Fetch confirmations if still running
    let confirmations: any[] = [];
    if (!["completed", "failed", "cancelled"].includes(newStatus)) {
      const confResult = await safeFetch(`${toolsBase}/confirmations/${jobId}`, {
        headers: { "X-API-Key": apiKey },
      });
      if (confResult.ok && confResult.json) {
        confirmations = confResult.json.confirmations || confResult.json || [];
      }
    }

    // Still running
    if (newStatus !== "completed") {
      if (newStatus && newStatus !== scan.status) {
        await query(`UPDATE scans SET status=$1 WHERE id=$2`, [newStatus, id]);
        scan.status = newStatus;
        if (newStatus === "failed") {
          createNotification(uid, "Scan Failed", `Scan for ${scan.target} failed.`, "error").catch(() => {});
        }
      }
      return NextResponse.json({ success: true, scan, pythonStatus: statusData, confirmations });
    }

    // ── SCAN COMPLETED ──────────────────────────────────────────────
    const isDiscovery = scan.tool_id === "discovery" || scan.tool_name === "Asset Discovery";
    const resultUrl   = isDiscovery
      ? `${toolsBase}/results/${jobId}`
      : `${toolsBase}/results/${jobId}?normalized=true`;

    const resultResult = await safeFetch(resultUrl, { headers: { "X-API-Key": apiKey } });
    const resultData   = resultResult.json ?? { error: "Failed to fetch results" };

    const finalStatus = resultData.error ? "failed" : "completed";
    const updateRes = await query(
      `UPDATE scans SET status=$1, result=$2, completed_at=NOW() WHERE id=$3 RETURNING *`,
      [finalStatus, JSON.stringify(resultData), id],
    );
    scan = { ...scan, ...updateRes.rows[0] };

    // ── BILLING: deduct scan cost from wallet ───────────────────────
    // Only charge for successfully completed scans, not failed ones.
    if (finalStatus === "completed") {
      chargeForScan(uid, scan.id, scan.tool_id, scan.target).catch((err) =>
        console.error("[Billing] chargeForScan failed:", err),
      );
    }

    const notifTitle = finalStatus === "completed" ? "Scan Completed" : "Scan Failed";
    const notifMsg   = finalStatus === "completed"
      ? `Scan finished for ${scan.target}. Click to view.`
      : `Scan for ${scan.target} failed.`;
    createNotification(uid, notifTitle, notifMsg, finalStatus === "completed" ? "success" : "error").catch(() => {});

    return NextResponse.json({ success: true, scan });
  } catch (err: any) {
    console.error("[Scan GET]", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV !== "production" ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

// ── DELETE ────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const res = await query(
      `DELETE FROM scans WHERE id=$1 AND user_uid=$2 RETURNING *`,
      [id, uid],
    );
    if (!res.rowCount) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}