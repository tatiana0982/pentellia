// src/app/api/dashboard/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { getRate, deductCredits, isReportAlreadyCharged } from "@/lib/credits";

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
      success: true,
      reports: rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

// ─── POST — save generated PDF ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file   = formData.get("pdf")    as File   | null;
    const scanId = formData.get("scanId") as string | null;

    if (!file || !scanId) {
      return NextResponse.json({ error: "Missing pdf or scanId" }, { status: 400 });
    }

    // Validate the scan belongs to this user
    const scanCheck = await query(
      `SELECT id FROM scans WHERE id = $1 AND user_uid = $2 LIMIT 1`,
      [scanId, uid],
    );
    if (!scanCheck.rows.length) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Billing: deduct report generation cost ──────────────────────────
    // Idempotency guard: one charge per scan_id per report type.
    const alreadyCharged = await isReportAlreadyCharged(scanId);
    if (!alreadyCharged) {
      let reportRate: number;
      try {
        reportRate = await getRate("report");
      } catch {
        return NextResponse.json(
          { error: "Pricing service unavailable. Cannot generate report." },
          { status: 503 },
        );
      }

      const result = await deductCredits(
        uid,
        reportRate,
        `Report generation for scan ${scanId}`,
        "report",
        scanId,
      );

      if (!result.success) {
        return NextResponse.json(
          {
            error:  `Insufficient credits. Report generation costs ₹${reportRate}. ${result.error}`,
            code:   "INSUFFICIENT_CREDITS",
            action: "/subscription",
          },
          { status: 402 },
        );
      }
    }

    await query(
      `INSERT INTO reports (user_uid, scan_id, pdf_blob) VALUES ($1, $2, $3)`,
      [uid, scanId, buffer],
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}