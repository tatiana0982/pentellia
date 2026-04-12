// src/app/api/webhooks/razorpay/route.ts
// Async backup confirmation — activates subscription if verify-payment missed.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { activateSubscription } from "@/lib/subscription";
import { createNotification } from "@/lib/notifications";

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const rawBody   = await req.text();
  const sigHeader = req.headers.get("x-razorpay-signature");
  if (!sigHeader) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  if (!verifyWebhookSignature(rawBody, sigHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (event?.event !== "payment.captured") {
    return NextResponse.json({ success: true, message: "Event ignored" });
  }

  const payment  = event?.payload?.payment?.entity;
  const orderId  = payment?.order_id;
  const paymentId = payment?.id;

  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Look up the order
  const orderRes = await query(
    `SELECT user_uid, plan_id, status FROM razorpay_orders
     WHERE razorpay_order_id = $1 LIMIT 1`,
    [orderId],
  );

  if (!orderRes.rows.length) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderRes.rows[0];

  // Idempotency — already activated
  if (order.status === "paid") {
    return NextResponse.json({ success: true, message: "Already processed" });
  }

  if (!order.plan_id) {
    return NextResponse.json({ error: "Order missing plan_id" }, { status: 400 });
  }

  // Mark paid + activate subscription
  await query(
    `UPDATE razorpay_orders SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW()
     WHERE razorpay_order_id = $2`,
    [paymentId, orderId],
  );

  await activateSubscription(order.user_uid, order.plan_id, orderId, paymentId);

  createNotification(
    order.user_uid,
    "Subscription Activated ✓",
    `Your plan is now active. Payment ID: ${paymentId}`,
    "success",
    true,
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
