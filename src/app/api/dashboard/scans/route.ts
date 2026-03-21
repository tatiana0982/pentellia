// src/app/api/dashboard/scans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

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
        `SELECT s.id, s.target, s.status, s.tool_id, s.created_at, s.completed_at, t.name AS tool_name
         FROM scans s JOIN tools t ON s.tool_id = t.id
         WHERE s.user_uid = $1
         ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(`SELECT COUNT(*) FROM scans WHERE user_uid = $1`, [uid]),
    ]);

    const totalScans = parseInt(countRes.rows[0].count);
    return NextResponse.json({
      success: true,
      scans: scansRes.rows,
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
    const body          = await req.json();
    const { tool, target, params } = body;

    if (!tool || !target) {
      return NextResponse.json({ error: "Missing tool or target" }, { status: 400 });
    }

    const toolsBase = process.env.TOOLS_BASE_URL;
    if (!toolsBase) {
      return NextResponse.json({ error: "Scan service not configured" }, { status: 503 });
    }

    const isDiscovery = tool === "discovery" || tool === "asset-discovery";
    const endpoint    = isDiscovery ? `${toolsBase}/discovery` : `${toolsBase}/scan`;
    const payload     = isDiscovery
      ? { target, params }
      : { tool, target, params };

    // Call the external Flask API
    const toolsRes  = await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": process.env.TOOLS_API_KEY || "" },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(30_000),
    });

    const toolsData = await toolsRes.json();

    if (!toolsRes.ok) {
      return NextResponse.json(
        { error: toolsData.error || "Scan service error" },
        { status: toolsRes.status },
      );
    }

    // Save scan to DB
    const dbRes = await query(
      `INSERT INTO scans (user_uid, tool_id, target, params, external_job_id, status)
       VALUES ($1, $2, $3, $4, $5, 'queued')
       RETURNING id`,
      [uid, tool, target, JSON.stringify(params || {}), toolsData.job_id],
    );

    const scanId = dbRes.rows[0].id;

    createNotification(uid, "Scan Started", `Scanning ${target} using ${tool}`, "info").catch(() => {});

    return NextResponse.json({ success: true, scanId, jobId: toolsData.job_id });

  } catch (err: any) {
    // Don't expose internal errors in production
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      { error: isDev ? err.message : "Scan service unavailable" },
      { status: 502 },
    );
  }
}