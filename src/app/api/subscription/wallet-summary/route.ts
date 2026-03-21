// src/app/api/subscription/wallet-summary/route.ts
import { NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // LEFT JOIN so new users (no credits row yet) return zeros instead of 500
    const res = await query(
      `SELECT
         COALESCE(uc.balance,       0) AS balance,
         COALESCE(uc.total_spent,   0) AS total_spent,
         COALESCE(uc.total_bought,  0) AS total_bought,
         (SELECT COUNT(*) FROM scans   WHERE user_uid = $1)                        AS total_scans,
         (SELECT COUNT(*) FROM domains WHERE user_uid = $1 AND is_verified = TRUE) AS verified_domains
       FROM (VALUES ($1::text)) AS u(uid)
       LEFT JOIN user_credits uc ON uc.user_uid = u.uid`,
      [uid],
    );

    const r = res.rows[0] ?? {};
    return NextResponse.json({
      success:         true,
      balance:         parseFloat(r.balance        || "0"),
      totalSpent:      parseFloat(r.total_spent     || "0"),
      totalBought:     parseFloat(r.total_bought    || "0"),
      totalScans:      parseInt(r.total_scans       || "0"),
      verifiedDomains: parseInt(r.verified_domains  || "0"),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
  }
}