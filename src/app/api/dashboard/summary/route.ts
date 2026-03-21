// src/app/api/ai/summary/route.ts
// GET  /api/ai/summary?scanId=xxx  → load saved summary (no DeepSeek call)
// POST /api/ai/summary             → save a completed summary

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { query } from "@/config/db";
import { cookies } from "next/headers";

async function getUid() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) return null;
  try {
    const d = await adminAuth.verifySessionCookie(session, false);
    return d.uid;
  } catch {
    return null;
  }
}

// GET — load saved AI summary for a scan
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scanId = searchParams.get("scanId");

  if (!scanId) {
    return NextResponse.json({ error: "scanId is required" }, { status: 400 });
  }

  try {
    const res = await query(
      `SELECT content, model, cost_inr, created_at
       FROM ai_summaries
       WHERE scan_id = $1 AND user_uid = $2
       LIMIT 1`,
      [scanId, uid],
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: true, summary: null });
    }

    return NextResponse.json({ success: true, summary: res.rows[0] });
  } catch (err) {
    console.error("[AISummary GET]", err);
    return NextResponse.json(
      { error: "Failed to load summary" },
      { status: 500 },
    );
  }
}

// POST — save a completed AI summary
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { scanId, toolId, content } = await req.json();

    if (!scanId || !content) {
      return NextResponse.json(
        { error: "scanId and content are required" },
        { status: 400 },
      );
    }

    // Verify ownership of the scan
    const scanRes = await query(
      `SELECT id FROM scans WHERE id = $1 AND user_uid = $2 LIMIT 1`,
      [scanId, uid],
    );

    if (scanRes.rows.length === 0) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Upsert — if summary already exists for this scan, update it
    await query(
      `INSERT INTO ai_summaries (scan_id, user_uid, tool_id, content)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (scan_id) DO UPDATE SET
         content    = EXCLUDED.content,
         updated_at = NOW()`,
      [scanId, uid, toolId ?? "unknown", content],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AISummary POST]", err);
    return NextResponse.json(
      { error: "Failed to save summary" },
      { status: 500 },
    );
  }
}