// src/app/api/dashboard/scans/route.ts
// Gate: checkUsageLimit() — subscription + monthly + daily limits.
// All calls to Flask engine use TOOLS_BASE_URL + X-API-Key header (server-side only).

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { checkUsageLimit } from "@/lib/subscription";

// ── Determine scan type from tool category ────────────────────────────
const DEEP_CATEGORIES = new Set([
  "web", "vulnerability", "exploit", "injection", "composite", "cloud",
]);

async function getScanType(toolId: string): Promise<"deep" | "light"> {
  const res = await query(
    `SELECT category FROM tools WHERE id = $1 LIMIT 1`,
    [toolId],
  );
  if (!res.rows.length) return "light";
  const cat = (res.rows[0].category as string).toLowerCase().trim();
  return DEEP_CATEGORIES.has(cat) ? "deep" : "light";
}

// ── Resolve which Flask endpoint to hit ───────────────────────────────
// discovery → POST /discovery  (interactive multi-phase)
// authtest  → POST /authtest   (interactive auth testing)
// default   → POST /scan       (jsspider, breachintel, subdomainfinder, etc.)
function resolveFlaskEndpoint(
  base: string,
  tool: string,
  params: Record<string, any> | undefined,
): { endpoint: string; payload: object } {
  if (params?.discovery === true) {
    return { endpoint: `${base}/discovery`, payload: { params } };
  }
  if (params?.authtest === true || tool === "authtest") {
    return { endpoint: `${base}/authtest`, payload: { params } };
  }
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
        `SELECT s.id, s.target, s.status, s.tool_id, s.created_at, s.completed_at,
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
    console.error("[Scans GET]", err?.message);
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

    // ── Guard: env vars must be set ──────────────────────────────────
    const toolsBaseUrl = process.env.TOOLS_BASE_URL;
    const toolsApiKey  = process.env.TOOLS_API_KEY;

    if (!toolsBaseUrl || !toolsApiKey) {
      console.error("[Scans POST] TOOLS_BASE_URL or TOOLS_API_KEY not set in environment");
      return NextResponse.json(
        { error: "Scan engine not configured. Contact support." },
        { status: 503 },
      );
    }

    // ── Gate: check limits (soft read) ─────────────────────────────────
    const scanType    = await getScanType(tool);
    const usageStatus = await checkUsageLimit(uid, scanType);

    if (!usageStatus.allowed) {
      return NextResponse.json(
        { error: usageStatus.reason, code: usageStatus.code,
          monthlyUsed: usageStatus.monthlyUsed, monthlyLimit: usageStatus.monthlyLimit,
          dailyUsed: usageStatus.dailyUsed, dailyLimit: usageStatus.dailyLimit, action: "/subscription" },
        { status: usageStatus.code === "NO_SUBSCRIPTION" || usageStatus.code === "PLAN_EXPIRED" ? 402 : 429 },
      );
    }

    // ── Atomic pre-increment: reserve slot BEFORE calling Flask ──────────
    // Fixes TOCTOU race: two concurrent requests can both pass checkUsageLimit.
    // The atomic UPDATE ... WHERE col < limit ensures only one wins.
    const col          = scanType === "deep" ? "deep_scans_used" : scanType === "light" ? "light_scans_used" : "reports_used";
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

    // ── Route to Flask (usage already debited — refund on failure) ────────
    const { endpoint, payload: basePayload } = resolveFlaskEndpoint(toolsBaseUrl, tool, params);
    const payload = { ...basePayload, target };
    let toolsRes: Response;
    try {
      toolsRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": toolsApiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (fetchErr: any) {
      // Refund usage — Flask never received the request
      await query(`UPDATE daily_usage    SET ${col} = GREATEST(0, ${col} - 1) WHERE user_uid = $1 AND date = CURRENT_DATE`, [uid]);
      await query(`UPDATE usage_tracking SET ${col} = GREATEST(0, ${col} - 1), updated_at = NOW() WHERE user_uid = $1 AND period_start = $2`, [uid, started_at]);
      console.error(`[Scans POST] Network error: ${fetchErr?.cause?.code ?? fetchErr?.message}`);
      return NextResponse.json({ error: "Scan engine unreachable.", detail: fetchErr?.cause?.code ?? fetchErr?.message }, { status: 503 });
    }

    const toolsData = await toolsRes.json();
    if (!toolsRes.ok) {
      // Refund usage — Flask rejected the scan
      await query(`UPDATE daily_usage    SET ${col} = GREATEST(0, ${col} - 1) WHERE user_uid = $1 AND date = CURRENT_DATE`, [uid]);
      await query(`UPDATE usage_tracking SET ${col} = GREATEST(0, ${col} - 1), updated_at = NOW() WHERE user_uid = $1 AND period_start = $2`, [uid, started_at]);
      throw new Error(toolsData.error || `Scan engine returned ${toolsRes.status}`);
    }

    // ── Insert scan record (usage already committed above) ────────────────
    const dbRes = await query(
      `INSERT INTO scans (user_uid, tool_id, target, params, external_job_id, status)
       VALUES ($1, $2, $3, $4, $5, 'queued') RETURNING id`,
      [uid, tool, target, JSON.stringify(params), toolsData.job_id],
    );
    const scanId = dbRes.rows[0].id;
    // No incrementUsage call — usage was already atomically pre-incremented above.

    await createNotification(
      uid, "Scan Started", `Scan initiated for ${target}`, "info",
    );

    return NextResponse.json({ success: true, scanId, jobId: toolsData.job_id });

  } catch (error: any) {
    console.error("[Scans POST]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to start scan" }, { status: 500 });
  }
}
