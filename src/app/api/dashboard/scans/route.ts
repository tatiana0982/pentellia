// src/app/api/dashboard/scans/route.ts
// Gate: checkUsageLimit() — subscription + monthly + daily limits.
// All calls to Flask engine use TOOLS_BASE_URL + X-API-Key header (server-side only).

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { checkUsageLimit } from "@/lib/subscription";
import { classifyScan } from "@/lib/scan-classifier";

// ── Resolve which Flask endpoint to hit ───────────────────────────────
// discovery → POST /discovery  (interactive multi-phase asset discovery)
// authtest  → POST /authtest   (interactive auth testing)
// default   → POST /scan       (all other tools: jsspider, breachintel,
//                               subdomainfinder, nmap, nuclei, etc.)
function resolveFlaskEndpoint(
  base: string,
  tool: string,
  params: Record<string, any> | undefined,
): { endpoint: string; payload: object } {
  const slug = tool.toLowerCase();

  // discovery: routed to /discovery endpoint (interactive multi-phase)
  if (slug === "discovery") {
    return { endpoint: `${base}/discovery`, payload: { target: undefined, params } };
  }

  // authtest: routed to /authtest endpoint (interactive auth testing)
  if (slug === "authtest") {
    return { endpoint: `${base}/authtest`, payload: { target: undefined, params } };
  }

  // All other tools (jsspider, breachintel, subdomainfinder, nmap, etc.)
  // use the standard /scan endpoint with { tool, target, params }
  return { endpoint: `${base}/scan`, payload: { tool, params } };
}

// ── GET — list scans ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = new URL(req.url).searchParams;
  const page   = Math.max(1, parseInt(sp.get("page")  || "1"));
  const limit  = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "10")));
  const offset = (page - 1) * limit;

  try {
    const [scansRes, countRes] = await Promise.all([
      query(
        `SELECT s.id, s.target, s.status, s.tool_id, s.scan_type, s.created_at, s.completed_at,
                t.name AS tool_name
         FROM scans s JOIN tools t ON s.tool_id = t.id
         WHERE s.user_uid = $1 AND s.deleted_at IS NULL
         ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(
        `SELECT COUNT(*) FROM scans WHERE user_uid = $1 AND deleted_at IS NULL`,
        [uid],
      ),
    ]);

    const totalScans = parseInt(countRes.rows[0].count);
    return NextResponse.json({
      success: true,
      scans:   scansRes.rows,
      pagination: { page, limit, totalScans, totalPages: Math.ceil(totalScans / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
}

// ── POST — start a scan ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { tool, target, params } = body;

    if (!tool || !target) {
      return NextResponse.json({ error: "Missing tool or target" }, { status: 400 });
    }

    const toolsBaseUrl = process.env.TOOLS_BASE_URL;
    const toolsApiKey  = process.env.TOOLS_API_KEY;

    if (!toolsBaseUrl || !toolsApiKey) {
      return NextResponse.json(
        { error: "Scan engine not configured. Contact support." },
        { status: 503 },
      );
    }

    // ── Classify scan from actual params, not tool category ───────────
    // Old getScanType(tool) queried the tools table and returned "deep"
    // for any tool in category web/vulnerability/exploit/composite —
    // meaning nmap with type='1' (light) was still counted as deep.
    //
    // classifyScan reads the actual params the user submitted, applies
    // rules derived from reading every tool function in f.py, and
    // returns the correct type. No DB roundtrip. Pure + deterministic.
    const scanType = classifyScan(tool, params ?? {});

    // ── Gate: check limits ─────────────────────────────────────────────
    const usageStatus = await checkUsageLimit(uid, scanType);

    if (!usageStatus.allowed) {
      return NextResponse.json(
        {
          error:        usageStatus.reason,
          code:         usageStatus.code,
          monthlyUsed:  usageStatus.monthlyUsed,
          monthlyLimit: usageStatus.monthlyLimit,
          dailyUsed:    usageStatus.dailyUsed,
          dailyLimit:   usageStatus.dailyLimit,
          action:       "/subscription",
        },
        { status: usageStatus.code === "NO_SUBSCRIPTION" || usageStatus.code === "PLAN_EXPIRED" ? 402 : 429 },
      );
    }

    // ── Atomic pre-increment ──────────────────────────────────────────
    const col          = scanType === "deep" ? "deep_scans_used" : "light_scans_used";
    const dailyLimit   = usageStatus.dailyLimit;
    const monthlyLimit = usageStatus.monthlyLimit;

    const dailyIncr = await query(
      `INSERT INTO daily_usage (user_uid, date, ${col}) VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (user_uid, date) DO UPDATE
         SET ${col} = daily_usage.${col} + 1, updated_at = NOW()
         WHERE daily_usage.${col} < $2
       RETURNING ${col}`,
      [uid, dailyLimit],
    );
    if (!dailyIncr.rows.length) {
      return NextResponse.json(
        { error: `Daily ${scanType} limit reached concurrently. Try again shortly.`, code: "DAILY_LIMIT", action: "/subscription" },
        { status: 429 },
      );
    }

    const subRow = await query(
      `SELECT started_at, expires_at FROM user_subscriptions
       WHERE user_uid = $1 AND status = 'active' AND expires_at > NOW() LIMIT 1`, [uid],
    );
    if (!subRow.rows.length) {
      await query(`UPDATE daily_usage SET ${col} = GREATEST(0, ${col} - 1) WHERE user_uid = $1 AND date = CURRENT_DATE`, [uid]);
      return NextResponse.json({ error: "Subscription expired", code: "PLAN_EXPIRED" }, { status: 402 });
    }
    const { started_at, expires_at } = subRow.rows[0];

    const monthlyIncr = await query(
      `INSERT INTO usage_tracking (user_uid, period_start, period_end, ${col}) VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_uid, period_start) DO UPDATE
         SET ${col} = usage_tracking.${col} + 1, updated_at = NOW()
         WHERE usage_tracking.${col} < $4
       RETURNING ${col}`,
      [uid, started_at, expires_at, monthlyLimit],
    );
    if (!monthlyIncr.rows.length) {
      await query(`UPDATE daily_usage SET ${col} = GREATEST(0, ${col} - 1) WHERE user_uid = $1 AND date = CURRENT_DATE`, [uid]);
      return NextResponse.json(
        { error: `Monthly ${scanType} limit reached concurrently. Upgrade for more.`, code: "MONTHLY_LIMIT", action: "/subscription" },
        { status: 429 },
      );
    }

    // ── Call Flask ─────────────────────────────────────────────────────
    const { endpoint, payload: basePayload } = resolveFlaskEndpoint(toolsBaseUrl, tool, params);
    const payload = { ...basePayload, target };

    let toolsRes: Response;
    try {
      toolsRes = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": toolsApiKey },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(30_000),
      });
    } catch (fetchErr: any) {
      await query(`UPDATE daily_usage    SET ${col} = GREATEST(0, ${col} - 1) WHERE user_uid = $1 AND date = CURRENT_DATE`, [uid]);
      await query(`UPDATE usage_tracking SET ${col} = GREATEST(0, ${col} - 1), updated_at = NOW() WHERE user_uid = $1 AND period_start = $2`, [uid, started_at]);
      return NextResponse.json({ error: "Scan engine unreachable.", detail: fetchErr?.cause?.code ?? fetchErr?.message }, { status: 503 });
    }

    const toolsData = await toolsRes.json();
    if (!toolsRes.ok) {
      await query(`UPDATE daily_usage    SET ${col} = GREATEST(0, ${col} - 1) WHERE user_uid = $1 AND date = CURRENT_DATE`, [uid]);
      await query(`UPDATE usage_tracking SET ${col} = GREATEST(0, ${col} - 1), updated_at = NOW() WHERE user_uid = $1 AND period_start = $2`, [uid, started_at]);
      throw new Error(toolsData.error || `Scan engine returned ${toolsRes.status}`);
    }

    // ── Insert scan — scan_type stored for audit and dashboard reporting
    const dbRes = await query(
      `INSERT INTO scans (user_uid, tool_id, target, params, external_job_id, scan_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued') RETURNING id`,
      [uid, tool, target, JSON.stringify(params), toolsData.job_id, scanType],
    );
    const scanId = dbRes.rows[0].id;

    await createNotification(uid, "Scan Started", `Scan initiated for ${target}`, "info");

    return NextResponse.json({ success: true, scanId, jobId: toolsData.job_id, scanType });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to start scan" }, { status: 500 });
  }
}