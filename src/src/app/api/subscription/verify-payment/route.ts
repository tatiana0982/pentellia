// src/app/api/subscription/verify-payment/route.ts
//
// DESIGN: Payment verification must NEVER depend on session auth.
// The HMAC signature from Razorpay IS the authentication — if it passes,
// the payment is legitimate. We look up the order by razorpay_order_id
// (which is already tied to user_uid in razorpay_orders table).
// This eliminates all 401/session-expiry failures during payment flows.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { activateSubscription } from "@/lib/subscription";

function verifySignature(
  orderId: string, paymentId: string, signature: string, secret: string,
): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const expBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch { return false; }
}

async function generateInvoiceNumber(): Promise<string> {
  try {
    const res = await query(`SELECT nextval('invoice_number_seq') AS n`);
    const n   = String(res.rows[0].n).padStart(6, "0");
    return `INV-${new Date().getFullYear()}-${n}`;
  } catch {
    const ts = Date.now().toString(36).toUpperCase().slice(-8);
    return `INV-${new Date().getFullYear()}-${ts}`;
  }
}

async function sendConfirmationEmail(
  email: string, firstName: string, planName: string,
  amountInr: number, validUntil: string, invoiceNumber: string, paymentId: string,
): Promise<void> {
  try {
    const { sendEmail }                  = await import("@/lib/email");
    const { subscriptionActivatedEmail } = await import("@/lib/email-templates");
    await sendEmail(
      email,
      `Subscription Activated — ${planName} | ${invoiceNumber}`,
      subscriptionActivatedEmail(firstName, planName, amountInr, validUntil, invoiceNumber, paymentId),
    );
  } catch (err) {
    console.error("[VerifyPayment] Email failed:", err);
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });

  const idPattern = /^[a-zA-Z0-9_]+$/;
  if (!idPattern.test(razorpay_order_id) || !idPattern.test(razorpay_payment_id))
    return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });

  // ── 1. HMAC check — this IS the auth ─────────────────────────────
  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret))
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });

  // ── 2. Look up order + user in one query — no session needed ─────
  const orderRes = await query(
    `SELECT ro.user_uid, ro.plan_id, ro.amount_inr, ro.status,
            u.email, u.first_name, u.last_name
     FROM razorpay_orders ro
     JOIN users u ON u.uid = ro.user_uid
     WHERE ro.razorpay_order_id = $1 LIMIT 1`,
    [razorpay_order_id],
  );
  if (!orderRes.rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = orderRes.rows[0];
  const uid   = order.user_uid;

  // ── 3. Idempotency ────────────────────────────────────────────────
  if (order.status === "paid") {
    const inv = await query(
      `SELECT id, invoice_number FROM invoices WHERE razorpay_payment_id = $1 LIMIT 1`,
      [razorpay_payment_id],
    );
    return NextResponse.json({ success: true, message: "Already processed", invoiceId: inv.rows[0]?.id ?? null, invoiceNumber: inv.rows[0]?.invoice_number ?? null });
  }

  if (!order.plan_id) return NextResponse.json({ error: "Order missing plan_id" }, { status: 400 });

  try {
    // ── 4. Mark paid ──────────────────────────────────────────────
    await query(
      `UPDATE razorpay_orders SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW()
       WHERE razorpay_order_id = $2`,
      [razorpay_payment_id, razorpay_order_id],
    );

    // ── 5. Activate subscription ──────────────────────────────────
    const result = await activateSubscription(uid, order.plan_id, razorpay_order_id, razorpay_payment_id);

    // ── 6. Invoice ────────────────────────────────────────────────
    const invoiceNumber = await generateInvoiceNumber();
    const customerName  = `${order.first_name || ""} ${order.last_name || ""}`.trim() || null;
    const invRes = await query(
      `INSERT INTO invoices
         (user_uid, razorpay_order_id, razorpay_payment_id, plan_id,
          amount_inr, invoice_number, customer_name, customer_email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid')
       ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = 'paid'
       RETURNING id, invoice_number`,
      [uid, razorpay_order_id, razorpay_payment_id, order.plan_id,
       order.amount_inr, invoiceNumber, customerName, order.email],
    );
    const invoiceId    = invRes.rows[0]?.id;
    const finalInvoice = invRes.rows[0]?.invoice_number ?? invoiceNumber;

    // ── 7. Expiry string ──────────────────────────────────────────
    const expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const validUntil = expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    // ── 8. DB notification (fire-and-forget) ─────────────────────
    query(
      `INSERT INTO notifications (user_uid, title, message, type) VALUES ($1, $2, $3, 'success')`,
      [uid, "Subscription Activated ✓",
       result.immediate
         ? `${order.plan_id} plan active. Valid until ${validUntil}. Invoice: ${finalInvoice}.`
         : result.message],
    ).catch(() => {});

    // ── 9. Confirmation email (fire-and-forget) ───────────────────
    if (result.immediate && order.email) {
      query(`SELECT name, price_inr FROM subscription_plans WHERE id = $1 LIMIT 1`, [order.plan_id])
        .then(planRes => {
          const plan = planRes.rows[0];
          if (plan) sendConfirmationEmail(
            order.email, order.first_name || "there", plan.name,
            Number(plan.price_inr), validUntil, finalInvoice, razorpay_payment_id,
          );
        }).catch(() => {});
    }

    return NextResponse.json({
      success:       true,
      immediate:     result.immediate,
      message:       result.immediate ? `Subscription activated! Valid until ${validUntil}.` : result.message,
      planId:        order.plan_id,
      paymentId:     razorpay_payment_id,
      invoiceId,
      invoiceNumber: finalInvoice,
    });

  } catch (err: any) {
    console.error("[VerifyPayment] Failed:", err?.message, err?.stack);
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }
}
