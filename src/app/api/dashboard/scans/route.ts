import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";
import { createNotification } from "@/lib/notifications";

async function getUid() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  try {
    const scansQuery = `
      SELECT s.id, s.target, s.status, s.tool_id, s.created_at, s.completed_at, t.name as tool_name
      FROM scans s
      JOIN tools t ON s.tool_id = t.id
      WHERE s.user_uid = $1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const scansRes = await query(scansQuery, [uid, limit, offset]);

    const countRes = await query(
      `SELECT COUNT(*) FROM scans WHERE user_uid = $1`,
      [uid],
    );
    const totalScans = parseInt(countRes.rows[0].count);

    return NextResponse.json({
      success: true,
      scans: scansRes.rows,
      pagination: {
        page,
        limit,
        totalScans,
        totalPages: Math.ceil(totalScans / limit),
      },
    });
  } catch (error) {
    console.error("Fetch Scans Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scans" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { tool, target, params } = body;

    console.log(`[API] 🚀 Starting New Scan`);
    console.log(`[API] Tool: ${tool} | Target: ${target}`);
    
    // Check if it's the new Discovery Tool
    const isDiscovery = tool === "discovery" || tool === "asset-discovery";
    const endpoint = isDiscovery 
      ? `${process.env.TOOLS_BASE_URL}/discovery` 
      : `${process.env.TOOLS_BASE_URL}/scan`;

    const payload = isDiscovery ? { target, params } : { tool, target, params };

    console.log(`[API] Forwarding to: ${endpoint}`);

    const toolsRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.TOOLS_API_KEY || "",
      },
      body: JSON.stringify(payload),
    });

    const toolsData = await toolsRes.json();

    console.log(`[API] Python Response Code: ${toolsRes.status}`);

    if (!toolsRes.ok) {
      throw new Error(toolsData.error || "External API Failed");
    }

    const insertText = `
      INSERT INTO scans (user_uid, tool_id, target, params, external_job_id, status)
      VALUES ($1, $2, $3, $4, $5, 'queued')
      RETURNING id
    `;
    const dbRes = await query(insertText, [
      uid,
      tool,
      target,
      JSON.stringify(params),
      toolsData.job_id,
    ]);

    await createNotification(
      uid,
      "Scan Started",
      `Scanning initiated for target: ${target} using ${tool}`,
      "info",
    );

    console.log(`[API] ✅ DB Entry Created. ID: ${dbRes.rows[0].id}`);

    return NextResponse.json({
      success: true,
      scanId: dbRes.rows[0].id,
      jobId: toolsData.job_id,
    });
  } catch (error: any) {
    console.error("[API] Start Scan Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}