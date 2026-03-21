// src/app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = new URL(req.url).searchParams;
  const page   = Math.max(1, parseInt(sp.get("page")  || "1"));
  const limit  = Math.min(20, Math.max(1, parseInt(sp.get("limit") || "5")));
  const offset = (page - 1) * limit;

  try {
    const [rows, countRes] = await Promise.all([
      query(
        `SELECT id, ip_address, location, user_agent, login_at
         FROM login_history
         WHERE user_uid = $1
         ORDER BY login_at DESC
         LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(`SELECT COUNT(*) FROM login_history WHERE user_uid = $1`, [uid]),
    ]);

    const total = parseInt(countRes.rows[0].count);
    return NextResponse.json({
      success:    true,
      history:    rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}