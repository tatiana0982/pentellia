// src/app/api/dashboard/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// ─── GET — download PDF blob ──────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const res = await query(
      `SELECT pdf_blob FROM reports WHERE id = $1 AND user_uid = $2`,
      [id, uid],
    );

    if (!res.rowCount || !res.rows[0].pdf_blob) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const safeId = id.replace(/[^a-z0-9-]/gi, "").slice(0, 16);
    return new NextResponse(res.rows[0].pdf_blob, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="Report_${safeId}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":       "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

// ─── DELETE — remove report ──────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const res = await query(
      `DELETE FROM reports WHERE id = $1 AND user_uid = $2 RETURNING id`,
      [id, uid],
    );
    if (!res.rowCount) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}