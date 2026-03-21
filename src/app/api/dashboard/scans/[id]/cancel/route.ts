// src/app/api/dashboard/scans/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const dbRes = await query(
      `SELECT external_job_id FROM scans WHERE id = $1 AND user_uid = $2`,
      [id, uid],
    );
    if (!dbRes.rowCount) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const externalId = dbRes.rows[0].external_job_id;

    // Best-effort cancel — don't fail if the worker already finished
    await fetch(`${process.env.TOOLS_BASE_URL}/cancel/${externalId}`, {
      method:  "POST",
      headers: { "X-API-Key": process.env.TOOLS_API_KEY || "" },
      signal:  AbortSignal.timeout(10_000),
    }).catch(() => {});

    await query(
      `UPDATE scans SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
      [id],
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
  }
}