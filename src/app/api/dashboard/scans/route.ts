import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";

// Helper: Get UID
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
// GET: Fetch List of Scans (DB Only)
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  try {
    // FIX: Added 's.tool_id' to the SELECT list below
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
<<<<<<< HEAD
      [uid],
=======
      [uid]
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
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
<<<<<<< HEAD
      { status: 500 },
=======
      { status: 500 }
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    );
  }
}

// ------------------------------------------------------------------
// 2. POST: CREATE SCAN (Trigger Python)
// ------------------------------------------------------------------
// NOTE: Usually this belongs in `/api/dashboard/scans/route.ts`
// but since you pasted it here, I am keeping it.
// If this file is `[id]/route.ts`, POST technically shouldn't be here unless
// you are "re-running" a specific ID.
// Assuming you meant this logic lives in the main scans route file:

export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { tool, target, params } = body;

    console.log(`[API] 🚀 Starting New Scan`);
    console.log(`[API] Tool: ${tool} | Target: ${target}`);
    console.log(`[API] Forwarding to: ${process.env.TOOLS_BASE_URL}/scan`);

    // 1. Call External Python API
    const toolsRes = await fetch(`${process.env.TOOLS_BASE_URL}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.TOOLS_API_KEY || "",
      },
      body: JSON.stringify({ tool, target, params }),
    });

    const toolsData = await toolsRes.json();

    console.log(`[API] Python Response Code: ${toolsRes.status}`);
    console.log(`[API] Python Response Body:`, toolsData);

    if (!toolsRes.ok) {
      throw new Error(toolsData.error || "External API Failed");
    }

    // 2. Create DB Entry
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
