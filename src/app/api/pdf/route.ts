// src/app/api/dashboard/reports/route.ts
// Reports metadata listing + manual PDF save (storage only, no billing here).
// Billing for report generation happens in /api/pdf/route.ts at generation time.
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// ─── GET — list reports (metadata only, no blob) ──────────────────────
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = new URL(req.url).searchParams;
  const page   = Math.max(1, parseInt(sp.get("page")  || "1"));
  const limit  = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "10")));
  const offset = (page - 1) * limit;

  try {
    const [rows, countRes] = await Promise.all([
      query(
        `SELECT r.id, r.created_at, s.target, t.name AS tool_name
         FROM reports r
         JOIN scans s ON r.scan_id = s.id
         LEFT JOIN tools t ON s.tool_id = t.id
         WHERE r.user_uid = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(`SELECT COUNT(*) FROM reports WHERE user_uid = $1`, [uid]),
    ]);

    const total = parseInt(countRes.rows[0].count);
    return NextResponse.json({
      success:    true,
      reports:    rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

// ─── POST — save generated PDF blob (called internally after generation) ─
// NOTE: Billing is handled by /api/pdf/route.ts before this is called.
// This endpoint is purely storage — no credit deduction here.
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file     = formData.get("pdf")    as File   | null;
    const scanId   = formData.get("scanId") as string | null;

    if (!file || !scanId) {
      return NextResponse.json({ error: "Missing pdf or scanId" }, { status: 400 });
    }

    const scanCheck = await query(
      `SELECT id FROM scans WHERE id = $1 AND user_uid = $2 LIMIT 1`,
      [scanId, uid],
    );
    if (!scanCheck.rows.length) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await query(
      `INSERT INTO reports (user_uid, scan_id, pdf_blob)
       VALUES ($1, $2, $3)`,
      [uid, scanId, buffer],
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}