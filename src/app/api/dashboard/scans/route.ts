// src/app/api/dashboard/scans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

const TOOL_COSTS: Record<string, number> = {
  "enterprise-portal-scanner": 1.0,
  "web-security-suite":        1.0,
  "deep-scan":                 2.0,
  "discovery":                 0.5,
  "asset-discovery":           0.5,
};
const DEFAULT_COST     = 1.0;
const MAX_SCANS_PER_HR = 10;

const PRIVATE_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|::1$|fc|fd)/i;

function isSSRF(target: string): boolean {
  try {
    const url = new URL(/^https?:\/\//i.test(target) ? target : `https://${target}`);
    if (!["http:", "https:"].includes(url.protocol)) return true;
    const h = url.hostname.toLowerCase();
    return PRIVATE_RE.test(h) || h === "localhost" || h.endsWith(".internal") || h === "169.254.169.254";
  } catch { return true; }
}

function rootDomain(input: string): string {
  try {
    const h = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.toLowerCase();
    const p = h.split(".");
    return p.length >= 2 ? p.slice(-2).join(".") : h;
  } catch { return input.toLowerCase().trim(); }
}

function sanitize(val: unknown, max = 512): string {
  if (typeof val !== "string") return "";
  return val.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, max);
}

// ── GET ───────────────────────────────────────────────────────────────
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
        `SELECT s.id, s.target, s.status, s.tool_id, s.created_at, s.completed_at, t.name AS tool_name
         FROM scans s JOIN tools t ON s.tool_id = t.id
         WHERE s.user_uid = $1 AND s.deleted_at IS NULL
         ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(`SELECT COUNT(*) FROM scans WHERE user_uid = $1 AND deleted_at IS NULL`, [uid]),
    ]);

    const totalScans = parseInt(countRes.rows[0].count);
    return NextResponse.json({
      success: true,
      scans: scansRes.rows,
      pagination: { page, limit, totalScans, totalPages: Math.ceil(totalScans / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tool   = sanitize(body?.tool,   64);
  const target = sanitize(body?.target, 256);
  const params = body?.params && typeof body.params === "object" ? body.params : {};

  if (!tool || !target) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (isSSRF(target))   return NextResponse.json({ error: "Invalid scan target" }, { status: 400 });

  // ── Per-user hourly rate limit ──────────────────────────────────
  const rl = await query(
    `INSERT INTO scan_rate_limits (user_uid, scan_count, window_start)
     VALUES ($1, 1, NOW())
     ON CONFLICT (user_uid) DO UPDATE SET
       scan_count   = CASE WHEN scan_rate_limits.window_start < NOW() - INTERVAL '1h'
                           THEN 1
                           ELSE scan_rate_limits.scan_count + 1 END,
       window_start = CASE WHEN scan_rate_limits.window_start < NOW() - INTERVAL '1h'
                           THEN NOW()
                           ELSE scan_rate_limits.window_start END
     RETURNING scan_count`,
    [uid],
  );
  if (parseInt(rl.rows[0].scan_count) > MAX_SCANS_PER_HR) {
    return NextResponse.json(
      { error: `Rate limit: max ${MAX_SCANS_PER_HR} scans per hour.` },
      { status: 429 },
    );
  }

  // ── Domain ownership ────────────────────────────────────────────
  const targetRoot = rootDomain(target);
  const domainRes  = await query(
    `SELECT id FROM domains WHERE user_uid=$1 AND is_verified=TRUE AND LOWER(name)=LOWER($2) LIMIT 1`,
    [uid, targetRoot],
  ).catch(() => null);

  if (!domainRes?.rows?.length) {
    return NextResponse.json(
      { error: "Target domain not verified. Verify ownership before scanning." },
      { status: 403 },
    );
  }

  const cost      = TOOL_COSTS[tool] ?? DEFAULT_COST;
  const isDiscovery = tool === "discovery" || tool === "asset-discovery";

  // Validate tool exists for non-discovery
  if (!isDiscovery) {
    const toolCheck = await query(`SELECT id FROM tools WHERE id=$1 LIMIT 1`, [tool]);
    if (!toolCheck.rows.length) return NextResponse.json({ error: "Unknown tool" }, { status: 400 });
  }

  // ── Credit check & deduct (row-locked) ──────────────────────────
  const deductRes = await query(
    `UPDATE user_credits
     SET balance=balance-$1, total_spent=total_spent+$1, updated_at=NOW()
     WHERE user_uid=$2 AND balance>=$1
     RETURNING balance`,
    [cost, uid],
  );
  if (!deductRes.rows.length) {
    return NextResponse.json(
      { error: `Insufficient credits. Required: ₹${cost}` },
      { status: 402 },
    );
  }
  const balanceAfter = parseFloat(deductRes.rows[0].balance);

  // ── Sanitize params ─────────────────────────────────────────────
  const safeParams: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const safeKey = k.replace(/[^a-z0-9_]/gi, "").slice(0, 64);
    if (!safeKey) continue;
    if (typeof v === "string") safeParams[safeKey] = sanitize(v, 1024);
    else if (typeof v === "number" || typeof v === "boolean") safeParams[safeKey] = v;
  }

  // ── Call external scan API ──────────────────────────────────────
  const toolsBase = process.env.TOOLS_BASE_URL;
  if (!toolsBase) {
    await query(`UPDATE user_credits SET balance=balance+$1, total_spent=total_spent-$1 WHERE user_uid=$2`, [cost, uid]).catch(() => {});
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const endpoint = isDiscovery ? `${toolsBase}/discovery` : `${toolsBase}/scan`;
  let toolsData: any;
  try {
    const res = await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": process.env.TOOLS_API_KEY || "" },
      body:    JSON.stringify(isDiscovery ? { target, params: safeParams } : { tool, target, params: safeParams }),
      signal:  AbortSignal.timeout(30_000),
    });
    toolsData = await res.json();
    if (!res.ok) throw new Error(toolsData?.error || "External API error");
  } catch {
    await query(`UPDATE user_credits SET balance=balance+$1, total_spent=total_spent-$1 WHERE user_uid=$2`, [cost, uid]).catch(() => {});
    return NextResponse.json({ error: "Scan service unavailable. Credits refunded." }, { status: 502 });
  }

  // ── Record scan & audit trail ───────────────────────────────────
  const dbRes = await query(
    `INSERT INTO scans (user_uid, tool_id, target, params, external_job_id, status)
     VALUES ($1,$2,$3,$4,$5,'queued') RETURNING id`,
    [uid, tool, target, JSON.stringify(safeParams), toolsData.job_id],
  );
  const scanId = dbRes.rows[0].id;

  await Promise.all([
    query(
      `INSERT INTO credit_transactions (user_uid,type,amount,balance_after,description,ref_type,ref_id,tool_id)
       VALUES ($1,'debit',$2,$3,$4,'scan',$5,$6)`,
      [uid, cost, balanceAfter, `Scan: ${tool} on ${target}`, scanId, tool],
    ),
    query(
      `INSERT INTO scan_metadata (scan_id,user_uid,tool_id,target,params,cost_inr,domain_used)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [scanId, uid, tool, target, JSON.stringify(safeParams), cost, targetRoot],
    ),
  ]).catch(() => {});

  createNotification(uid, "Scan Started", `Scan initiated for ${target}`, "info").catch(() => {});

  return NextResponse.json({ success: true, scanId, jobId: toolsData.job_id });
}