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
    const resultRes = await safeFetch(`${toolsBaseUrl}/results/${externalJobId}?normalized=true`, {
      headers: { "X-API-Key": apiKey },
    });
    let result: any = resultRes.ok && resultRes.json ? resultRes.json : { error: "Could not fetch results" };

    // ── BREACH RECORDS INJECTION ──────────────────────────────────────────────
    // Fetch raw (non-normalized) result to extract individual credential records
    // and inject them into each breach finding's evidence for UI rendering.
    // This is purely additive — normalized data is unchanged, records are added.
    try {
      const tool = (scan.tool_name || scan.scan_type || "").toLowerCase();
      if (tool.includes("breach") && result?.findings?.length) {
        const rawRes = await safeFetch(`${toolsBaseUrl}/results/${externalJobId}`, {
          headers: { "X-API-Key": apiKey },
        });
        if (rawRes.ok && rawRes.json) {
          // Raw result may be wrapped in { result: { results: [...] } } or have results at top level
          const rawData = rawRes.json?.result ?? rawRes.json;
          const rawRecords: any[] = rawData?.results ?? rawData?.data?.results ?? [];

          if (rawRecords.length > 0) {
            result = {
              ...result,
              findings: result.findings.map((finding: any) => {
                const source = finding.evidence?.additional?.source;
                if (!source) return finding;

                // Match raw records to this finding's source
                const matched = rawRecords.filter((r: any) => {
                  const rSrc = String(r.sources ?? r.source ?? "");
                  return rSrc === source || rSrc.includes(source) || source.includes(rSrc);
                });

                if (!matched.length) return finding;

                return {
                  ...finding,
                  evidence: {
                    ...finding.evidence,
                    additional: {
                      ...finding.evidence?.additional,
                      records: matched.map((r: any) => ({
                        password:      r.password      ?? null,
                        sha1:          r.sha1          ?? null,
                        hash:          r.hash          ?? null,
                        sources:       r.sources       ?? r.source ?? null,
                        hash_password: r.hash_password ?? false,
                      })),
                    },
                  },
                };
              }),
            };
          }
        }
      }
    } catch (injectErr) {
      // Non-critical — if injection fails, proceed with normalized result as-is
      console.warn("[breach-inject] Failed to inject raw records:", injectErr);
    }
    // ── END BREACH RECORDS INJECTION ─────────────────────────────────────────

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

// ── POST — CMS confirmation (webscan pauses for user consent) ─────────────────
// Frontend sends { confirm: true/false, external_job_id } when user responds
// to the "CMS detected — run deep scanner?" modal.
//
// Routing strategy (resilient to engine version):
//   1. Try the standard confirmation flow first:
//        GET  /confirmations/{job_id}  → find pending CMS_DETECTED confirmation
//        POST /confirm/{job_id}/{request_id}  body: {"response":"confirm"|"skip"}
//      This is the spec'd path on current engines and is the only path that
//      reliably unblocks the WebScan worker waiting at Phase 4.
//   2. If no CMS confirmation can be located on the engine, fall back to the
//      legacy POST /confirm-cms/{job_id} endpoint (older engines). Surfaces
//      the engine's actual error message instead of a generic one.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: scanId } = await params;

  // Verify scan belongs to this user
  const scanRes = await query(
    `SELECT external_job_id FROM scans
     WHERE id = $1 AND user_uid = $2 AND deleted_at IS NULL LIMIT 1`,
    [scanId, uid],
  );
  if (!scanRes.rows.length) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const confirm       = Boolean(body.confirm);
  // Accept external_job_id from body (sent by frontend) OR fall back to DB value
  const externalJobId = body.external_job_id || scanRes.rows[0].external_job_id;

  const toolsBaseUrl = process.env.TOOLS_BASE_URL;
  const apiKey       = process.env.TOOLS_API_KEY || "";

  if (!toolsBaseUrl || !externalJobId) {
    return NextResponse.json({ error: "Scan engine not configured or job ID missing" }, { status: 503 });
  }

  // ── Step 1: Discover the CMS confirmation request_id on the engine ─────────
  // Look up the live confirmations list and pick the pending CMS one.
  // Matching is permissive so it works whether the engine emits the type as
  // "cms_detected", "CMS_DETECTED", or only signals it through the message.
  let cmsRequestId: string | null = null;
  try {
    const confRes = await fetch(`${toolsBaseUrl}/confirmations/${externalJobId}`, {
      headers: { "X-API-Key": apiKey },
      signal:  AbortSignal.timeout(5_000),
    });
    if (confRes.ok) {
      const confJson = await confRes.json().catch(() => ({}));
      const list: any[] = Array.isArray(confJson)
        ? confJson
        : Array.isArray(confJson?.confirmations)
          ? confJson.confirmations
          : [];

      const isCms = (c: any) => {
        const status = c?.status;
        const isPending = !status || status === "pending";
        if (!isPending) return false;
        const t = String(c?.type   ?? "").toLowerCase();
        const m = String(c?.message ?? c?.prompt ?? "").toLowerCase();
        if (t === "cms_detected" || t.includes("cms")) return true;
        if (m.includes("wordpress") || m.includes("drupal") || m.includes("joomla")) return true;
        if (m.includes("wpscan")    || m.includes("droopescan") || m.includes("joomscan")) return true;
        return false;
      };

      let match = list.find(isCms);
      // If nothing matches by type/message but there is exactly one pending
      // confirmation, treat that as the CMS one. This handles engines that
      // emit a generic "type" while signalling CMS through state alone.
      if (!match) {
        const pending = list.filter((c: any) => !c?.status || c?.status === "pending");
        if (pending.length === 1) match = pending[0];
      }
      if (match) cmsRequestId = match.request_id || match.id || null;
    }
  } catch { /* fall through to legacy */ }

  // ── Step 2: Use the standard confirmation endpoint when we have an id ──────
  if (cmsRequestId) {
    try {
      const newRes = await fetch(
        `${toolsBaseUrl}/confirm/${externalJobId}/${cmsRequestId}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
          body:    JSON.stringify({ response: confirm ? "confirm" : "skip" }),
          signal:  AbortSignal.timeout(10_000),
        },
      );
      const newData = await newRes.json().catch(() => ({}));
      if (newRes.ok) {
        return NextResponse.json({
          success:   true,
          confirmed: confirm,
          message:   newData.message ?? (confirm ? "CMS scan activated" : "CMS scan bypassed"),
        });
      }
      // If the standard endpoint exists and rejected the response, surface that
      // error directly — don't silently retry through the legacy path because
      // it would re-send the same intent and the user would see flapping toasts.
      return NextResponse.json(
        { error: newData.error || newData.message || "Confirmation rejected by engine" },
        { status: newRes.status },
      );
    } catch (err: any) {
      // Network error on the new endpoint → fall through to legacy.
    }
  }

  // ── Step 3: Legacy fallback — only reached when the new flow couldn't ──────
  // identify a request_id (older engines) or the new endpoint was unreachable.
  try {
    const res = await fetch(`${toolsBaseUrl}/confirm-cms/${externalJobId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body:    JSON.stringify({ confirm }),
      signal:  AbortSignal.timeout(10_000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.message || "CMS confirmation could not be delivered" },
        { status: res.status },
      );
    }

    return NextResponse.json({
      success:   true,
      confirmed: confirm,
      message:   data.message ?? (confirm ? "CMS scan activated" : "CMS scan bypassed"),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Scan engine unreachable", detail: err?.message }, { status: 503 });
  }
}