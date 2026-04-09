// src/app/api/subscription/verify-payment/route.ts
// Verifies Razorpay HMAC signature and activates the user's subscription.
// Does NOT credit a wallet — activates user_subscriptions + resets usage_tracking.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { activateSubscription } from "@/lib/subscription";
import { createNotification } from "@/lib/notifications";

function verifySignature(
  orderId:   string,
  paymentId: string,
  signature: string,
  secret:    string,
): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expected,  "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const uid = await getUid(true);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const idPattern = /^[a-zA-Z0-9_]+$/;
  if (!idPattern.test(razorpay_order_id) || !idPattern.test(razorpay_payment_id)) {
    return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });
  }

  // ── 1. Verify HMAC signature ─────────────────────────────────────
  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
    console.warn(`[Razorpay] Signature mismatch for order=${razorpay_order_id}`);
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // ── 2. Fetch order from DB ────────────────────────────────────────
  const orderRes = await query(
    `SELECT plan_id, amount_inr, status
     FROM razorpay_orders
     WHERE razorpay_order_id = $1 AND user_uid = $2
     LIMIT 1`,
    [razorpay_order_id, uid],
  );

  if (!orderRes.rows.length) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderRes.rows[0];

  // ── 3. Idempotency — already processed ───────────────────────────
  if (order.status === "paid") {
    return NextResponse.json({ success: true, message: "Already processed" });
  }

  if (!order.plan_id) {
    return NextResponse.json({ error: "Order missing plan_id" }, { status: 400 });
  }

  try {
    // ── 4. Mark order paid ────────────────────────────────────────
    await query(
      `UPDATE razorpay_orders
       SET status              = 'paid',
           razorpay_payment_id = $1,
           paid_at             = NOW()
       WHERE razorpay_order_id = $2 AND user_uid = $3`,
      [razorpay_payment_id, razorpay_order_id, uid],
    );

    // ── 5. Activate subscription ──────────────────────────────────
    await activateSubscription(
      uid,
      order.plan_id,
      razorpay_order_id,
      razorpay_payment_id,
    );

    // ── 6. Notify user ────────────────────────────────────────────
    createNotification(
      uid,
      "Subscription Activated ✓",
      `Your plan is now active. Payment ID: ${razorpay_payment_id}`,
      "success",
      true,
    ).catch(() => {});

    return NextResponse.json({
      success:   true,
      planId:    order.plan_id,
      paymentId: razorpay_payment_id,
    });

  } catch (err: any) {
    console.error("[VerifyPayment] Failed:", err?.message);
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }
}