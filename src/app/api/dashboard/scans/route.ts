// src/app/api/dashboard/scans/route.ts
// Phase 3: Domain gate REMOVED. Credit gate REMOVED.
// Gate: checkUsageLimit() — subscription + monthly + daily limits.
// All calls to Flask engine use TOOLS_BASE_URL + X-API-Key header (server-side only).

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { checkUsageLimit, incrementUsage } from "@/lib/subscription";

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

    // ── Gate: Require active subscription + usage within limits ──────
    const scanType    = await getScanType(tool);
    const usageStatus = await checkUsageLimit(uid, scanType);

    if (!usageStatus.allowed) {
      const httpStatus =
        usageStatus.code === "NO_SUBSCRIPTION" || usageStatus.code === "PLAN_EXPIRED"
          ? 402 : 429;
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
        { status: httpStatus },
      );
    }

    // ── Route to correct Flask endpoint (server-side, key never exposed) ──
    const { endpoint, payload: basePayload } = resolveFlaskEndpoint(toolsBaseUrl, tool, params);
    const payload = { ...basePayload, target };

    console.log(`[Scans POST] uid=${uid} endpoint=${endpoint} tool=${tool} target=${target}`);

    const toolsRes = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    toolsApiKey,   // API key never reaches browser
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    const toolsData = await toolsRes.json();

    if (!toolsRes.ok) {
      console.error(`[Scans POST] Engine ${toolsRes.status}:`, toolsData);
      throw new Error(toolsData.error || `Scan engine returned ${toolsRes.status}`);
    }

    // ── Insert scan record ───────────────────────────────────────────
    const dbRes = await query(
      `INSERT INTO scans (user_uid, tool_id, target, params, external_job_id, status)
       VALUES ($1, $2, $3, $4, $5, 'queued')
       RETURNING id`,
      [uid, tool, target, JSON.stringify(params), toolsData.job_id],
    );
    const scanId = dbRes.rows[0].id;

    // ── Increment usage (only after successful queue) ─────────────────
    await incrementUsage(uid, scanType);

    await createNotification(
      uid, "Scan Started", `Scan initiated for ${target}`, "info",
    );

    return NextResponse.json({ success: true, scanId, jobId: toolsData.job_id });

  } catch (error: any) {
    console.error("[Scans POST]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to start scan" }, { status: 500 });
  }
}