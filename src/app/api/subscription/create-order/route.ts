// src/app/api/subscription/create-order/route.ts
// Creates a Razorpay order for a FIXED subscription plan.
// Amount is always read from DB — never trusted from client.

import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { getPlanById } from "@/lib/subscription";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  const uid = await getUid(true);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { planId } = body;

  if (!planId || typeof planId !== "string") {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  // ── 1. Fetch plan from DB (server-authoritative price) ───────────
  const plan = await getPlanById(planId);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const amountINR   = plan.price_inr;
  const amountPaise = amountINR * 100; // Razorpay uses paise

  // ── 2. Idempotency — reuse pending order same user+plan+minute ───
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${uid}:${planId}:${Math.floor(Date.now() / 60_000)}`)
    .digest("hex");

  try {
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
      const order = await razorpay.orders.create({
        amount:   amountPaise,
        currency: "INR",
        notes: {
          uid,
          plan_id:    planId,
          plan_name:  plan.name,
          amount_inr: amountINR.toString(),
          type:       "subscription",
        },
      });
      orderId = order.id;

      await query(
        `INSERT INTO razorpay_orders
           (user_uid, plan_id, razorpay_order_id, amount_inr, credits_inr,
            status, idempotency_key)
         VALUES ($1, $2, $3, $4, $4, 'created', $5)`,
        [uid, planId, orderId, amountINR, idempotencyKey],
      );
    }

    return NextResponse.json({
      success:     true,
      orderId,
      amount:      amountPaise,
      currency:    "INR",
      keyId:       process.env.RAZORPAY_KEY_ID,
      name:        "Pentellia",
      description: `${plan.name} — ₹${amountINR}/month`,
      planId,
      planName:    plan.name,
      amountINR,
    });

  } catch (err: any) {
    console.error("[CreateOrder]", err?.message);
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}