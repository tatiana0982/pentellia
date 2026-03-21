// src/app/api/subscription/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import crypto from "crypto";

// ── Server-authoritative price catalogue ─────────────────────────────
// Client sends planId only. Amount NEVER comes from the client.
const PLANS: Record<string, { amountINR: number; creditsINR: number; name: string }> = {
  "plan_299":  { amountINR:  299, creditsINR:  299, name: "₹299 Wallet Top-up"  },
  "plan_499":  { amountINR:  499, creditsINR:  499, name: "₹499 Wallet Top-up"  },
  "plan_999":  { amountINR:  999, creditsINR:  999, name: "₹999 Wallet Top-up"  },
  "plan_1999": { amountINR: 1999, creditsINR: 1999, name: "₹1999 Wallet Top-up" },
  "plan_2499": { amountINR: 2499, creditsINR: 2499, name: "₹2499 Wallet Top-up" },
};

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  const uid = await getUid(true); // checkRevoked=true for payment operations
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const planId = body?.planId;
  if (!planId || typeof planId !== "string" || !PLANS[planId]) {
    return NextResponse.json({ error: "Invalid plan selection" }, { status: 400 });
  }

  const plan        = PLANS[planId];
  const amountPaise = plan.amountINR * 100; // Razorpay works in paise

  // Idempotency: same user + plan within same minute → reuse pending order
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${uid}:${planId}:${Math.floor(Date.now() / 60_000)}`)
    .digest("hex");

  try {
    // Check for a recent pending order with same idempotency key
    const existing = await query(
      `SELECT razorpay_order_id FROM razorpay_orders
       WHERE user_uid = $1 AND idempotency_key = $2 AND status = 'created'
       ORDER BY created_at DESC LIMIT 1`,
      [uid, idempotencyKey],
    );

    let orderId: string;

    if (existing.rows.length > 0) {
      orderId = existing.rows[0].razorpay_order_id;
    } else {
      // Create fresh Razorpay order
      const order = await razorpay.orders.create({
        amount:   amountPaise,
        currency: "INR",
        notes:    { uid, planId, name: plan.name },
      });
      orderId = order.id;

      await query(
        `INSERT INTO razorpay_orders
           (user_uid, plan_id, razorpay_order_id, amount_inr, credits_inr, status, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, 'created', $6)`,
        [uid, planId, orderId, plan.amountINR, plan.creditsINR, idempotencyKey],
      );
    }

    return NextResponse.json({
      success:  true,
      orderId,
      amount:   amountPaise,
      currency: "INR",
      keyId:    process.env.RAZORPAY_KEY_ID,
      name:     plan.name,
    });
  } catch {
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}