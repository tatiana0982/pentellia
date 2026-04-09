// src/app/api/subscription/wallet-summary/route.ts
// Renamed conceptually — now returns subscription + usage summary.
// Kept at same URL so WalletProvider / header don't break.

import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { getActiveSubscription, getUsageSummary } from "@/lib/subscription";
import { query } from "@/config/db";

export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [sub, summary, scanCountRes] = await Promise.all([
      getActiveSubscription(uid),
      getUsageSummary(uid),
      query(`SELECT COUNT(*) FROM scans WHERE user_uid = $1`, [uid]),
    ]);

    const totalScans = parseInt(scanCountRes.rows[0].count ?? "0");

    return NextResponse.json({
      success:      true,
      // Legacy fields kept so existing frontend code doesn't break
      balance:      0,
      totalSpent:   0,
      totalBought:  0,
      totalScans,
      verifiedDomains: 0, // Domain system removed
      // New fields
      subscription: sub ? {
        planId:    sub.plan_id,
        planName:  sub.plan.name,
        status:    sub.status,
        expiresAt: sub.expires_at,
        daysLeft:  summary?.daysLeft ?? 0,
      } : null,
      usage: summary?.usage ?? null,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err: any) {
    console.error("[WalletSummary]", err?.message);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}