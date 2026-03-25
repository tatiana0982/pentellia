// src/app/api/webhooks/razorpay/route.ts
// Async payment webhook — backup confirmation for failed client callbacks.
// Handles event: payment.captured
// Verifies HMAC-SHA256 on raw request body before crediting.
// CRITICAL: Register URL in Razorpay Dashboard: https://pentellia.io/api/webhooks/razorpay

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { createNotification } from "@/lib/notifications";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Verify Razorpay webhook signature.
 * Signature = HMAC-SHA256(rawBody, webhookSecret)
 */
function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    // CRITICAL: length check BEFORE timingSafeEqual
    if (expected.length !== signature.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(expected,  "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const sigHeader = req.headers.get("x-razorpay-signature");

  if (!sigHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    if (isDev) console.warn("[Webhook] RAZORPAY_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // ── 1. Verify signature ──────────────────────────────────────────
  const sigOk = verifyWebhookSignature(rawBody, sigHeader, webhookSecret);
  if (!sigOk) {
    if (isDev) console.warn("[Webhook] Signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // ── 2. Only handle payment.captured ─────────────────────────────
  if (event?.event !== "payment.captured") {
    return NextResponse.json({ success: true, message: "Event ignored" });
  }

  const payment  = event?.payload?.payment?.entity;
  const orderId  = payment?.order_id;
  const paymentId = payment?.id;

  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // ── 3. Look up the order ─────────────────────────────────────────
  const orderRes = await query(
    `SELECT user_uid, amount_inr, credits_inr, status
     FROM razorpay_orders
     WHERE razorpay_order_id = $1
     LIMIT 1`,
    [orderId],
  );

  if (!orderRes.rows.length) {
    // Order not in our DB — ignore
    if (isDev) console.warn(`[Webhook] Order ${orderId} not found`);
    return NextResponse.json({ success: true, message: "Order unknown — ignored" });
  }

  const order = orderRes.rows[0];

  // ── 4. Idempotency guard ─────────────────────────────────────────
  if (order.status === "paid") {
    return NextResponse.json({ success: true, message: "Already processed" });
  }

  const uid          = order.user_uid;
  const creditsToAdd = parseFloat(order.credits_inr);

  // ── 5. Atomic credit ─────────────────────────────────────────────
  await query("BEGIN");
  try {
    await query(
      `UPDATE razorpay_orders
       SET status              = 'paid',
           razorpay_payment_id = $1,
           paid_at             = NOW()
       WHERE razorpay_order_id = $2`,
      [paymentId, orderId],
    );

    const creditRes = await query(
      `INSERT INTO user_credits (user_uid, balance, total_bought, total_spent)
       VALUES ($1, $2, $2, 0)
       ON CONFLICT (user_uid) DO UPDATE SET
         balance      = user_credits.balance      + $2,
         total_bought = user_credits.total_bought  + $2,
         updated_at   = NOW()
       RETURNING balance`,
      [uid, creditsToAdd],
    );

    const balanceAfter = parseFloat(String(creditRes.rows[0].balance));

    await query(
      `INSERT INTO credit_transactions
         (user_uid, type, amount, balance_after, description, ref_type, ref_id)
       VALUES ($1, 'credit', $2, $3, $4, 'razorpay_webhook', $5)`,
      [
        uid,
        creditsToAdd,
        balanceAfter,
        `Wallet top-up ₹${new Intl.NumberFormat("en-IN").format(creditsToAdd)} (webhook)`,
        paymentId,
      ],
    );

    await query("COMMIT");

    createNotification(
      uid,
      "Payment Confirmed ✓",
      `₹${new Intl.NumberFormat("en-IN").format(creditsToAdd)} credited via webhook. Payment: ${paymentId}`,
      "success",
    ).catch(() => {});

    return NextResponse.json({ success: true });

  } catch (err: any) {
    await query("ROLLBACK");
    if (isDev) console.error("[Webhook] DB error:", err?.message);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}