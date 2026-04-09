// src/app/api/subscription/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { getActiveSubscription, getUsageSummary } from "@/lib/subscription";
import { query } from "@/config/db";

export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = new URL(req.url).searchParams;
  const page   = Math.max(1, parseInt(sp.get("page")  || "1"));
  const limit  = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "10")));
  const offset = (page - 1) * limit;

  try {
    const [sub, summary, txRes, countRes] = await Promise.all([
      getActiveSubscription(uid),
      getUsageSummary(uid),
      // Keep showing payment history from razorpay_orders
      query(
        `SELECT razorpay_order_id, razorpay_payment_id, amount_inr,
                plan_id, status, paid_at, created_at
         FROM razorpay_orders
         WHERE user_uid = $1 AND status = 'paid'
         ORDER BY paid_at DESC
         LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(
        `SELECT COUNT(*) FROM razorpay_orders
         WHERE user_uid = $1 AND status = 'paid'`,
        [uid],
      ),
    ]);

    const total = parseInt(countRes.rows[0].count);

    return NextResponse.json({
      success:      true,
      subscription: sub ? {
        planId:    sub.plan_id,
        planName:  sub.plan.name,
        status:    sub.status,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
      } : null,
      usage:          summary?.usage      ?? null,
      daysLeft:       summary?.daysLeft   ?? 0,
      paymentHistory: txRes.rows,
      pagination:     { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("[SubStatus]", err?.message);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}