// src/app/api/subscription/verify-payment/route.ts
// NO session auth — HMAC signature IS the auth (Razorpay standard).
// User is identified via razorpay_order_id → razorpay_orders.user_uid in DB.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { activateSubscription } from "@/lib/subscription";

// ── HMAC verification ──────────────────────────────────────────────────
function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const expBuf   = Buffer.from(expected, "hex");
    const sigBuf   = Buffer.from(signature, "hex");
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch { return false; }
}

// ── Invoice number — safe fallback if sequence missing ─────────────────
async function generateInvoiceNumber(): Promise<string> {
  try {
    const res = await query(`SELECT nextval('invoice_number_seq') AS n`);
    const n   = String(res.rows[0].n).padStart(6, "0");
    return `INV-${new Date().getFullYear()}-${n}`;
  } catch {
    // Sequence not yet created — timestamp fallback so payment never fails
    const ts = Date.now().toString(36).toUpperCase().slice(-8);
    console.error("[VerifyPayment] invoice_number_seq missing — run: CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;");
    return `INV-${new Date().getFullYear()}-${ts}`;
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  console.log("[VerifyPayment] START", razorpay_order_id);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });

  const idPattern = /^[a-zA-Z0-9_]+$/;
  if (!idPattern.test(razorpay_order_id) || !idPattern.test(razorpay_payment_id))
    return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("[VerifyPayment] RAZORPAY_KEY_SECRET not set");
    return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });
  }

  // ── 1. Verify HMAC — this is the auth ─────────────────────────────
  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
    console.error("[VerifyPayment] Signature mismatch", razorpay_order_id);
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }
  console.log("[VerifyPayment] SIGNATURE OK");

  // ── 2. Load order + user — NO session needed ───────────────────────
  const orderRes = await query(
    `SELECT ro.user_uid, ro.plan_id, ro.amount_inr, ro.status,
            u.email, u.first_name, u.last_name
     FROM razorpay_orders ro
     JOIN users u ON u.uid = ro.user_uid
     WHERE ro.razorpay_order_id = $1 LIMIT 1`,
    [razorpay_order_id],
  );

  if (!orderRes.rows.length) {
    console.error("[VerifyPayment] Order not found", razorpay_order_id);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderRes.rows[0];
  const uid   = order.user_uid;
  console.log("[VerifyPayment] ORDER FOUND uid=", uid, "plan=", order.plan_id);

  // ── 3. Idempotency — already processed ────────────────────────────
  if (order.status === "paid") {
    const inv = await query(
      `SELECT id, invoice_number FROM invoices WHERE razorpay_payment_id = $1 LIMIT 1`,
      [razorpay_payment_id],
    );
    return NextResponse.json({
      success: true, message: "Already processed",
      invoiceId: inv.rows[0]?.id ?? null, invoiceNumber: inv.rows[0]?.invoice_number ?? null,
    });
  }

  if (!order.plan_id)
    return NextResponse.json({ error: "Order missing plan_id" }, { status: 400 });

  try {
    // ── 4. Mark order paid ──────────────────────────────────────────
    await query(
      `UPDATE razorpay_orders SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW()
       WHERE razorpay_order_id = $2`,
      [razorpay_payment_id, razorpay_order_id],
    );

    // ── 5. Activate subscription ────────────────────────────────────
    const result = await activateSubscription(uid, order.plan_id, razorpay_order_id, razorpay_payment_id);
    console.log("[VerifyPayment] SUB ACTIVATED immediate=", result.immediate);

    // ── 6. Invoice ──────────────────────────────────────────────────
    const invoiceNumber = await generateInvoiceNumber();
    const customerName  = `${order.first_name || ""} ${order.last_name || ""}`.trim() || null;

    const invRes = await query(
      `INSERT INTO invoices
         (user_uid, razorpay_order_id, razorpay_payment_id, plan_id,
          amount_inr, invoice_number, customer_name, customer_email, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'paid')
       ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = 'paid'
       RETURNING id, invoice_number`,
      [uid, razorpay_order_id, razorpay_payment_id, order.plan_id,
       order.amount_inr, invoiceNumber, customerName, order.email],
    );
    const invoiceId    = invRes.rows[0]?.id;
    const finalInvoice = invRes.rows[0]?.invoice_number ?? invoiceNumber;

    // ── 7. Expiry display string ────────────────────────────────────
    const expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const validUntil = expiresAt.toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    // ── 8. DB notification (non-blocking) ──────────────────────────
    query(
      `INSERT INTO notifications (user_uid, title, message, type) VALUES ($1,$2,$3,'success')`,
      [uid, "Subscription Activated ✓",
       result.immediate
         ? `${order.plan_id} plan active. Valid until ${validUntil}. Invoice: ${finalInvoice}.`
         : result.message],
    ).catch(e => console.error("[VerifyPayment] Notification insert failed:", e));

    // ── 9. Transactional email (non-blocking, logs errors) ──────────
    if (result.immediate && order.email) {
      (async () => {
        try {
          const planRes = await query(
            `SELECT name, price_inr FROM subscription_plans WHERE id = $1 LIMIT 1`,
            [order.plan_id],
          );
          const plan = planRes.rows[0];
          if (!plan) { console.error("[VerifyPayment] Plan not found for email:", order.plan_id); return; }

          const { sendEmail }                  = await import("@/lib/email");
          const { subscriptionActivatedEmail } = await import("@/lib/email-templates");

          const sent = await sendEmail(
            order.email,
            `Subscription Activated — ${plan.name} | ${finalInvoice}`,
            subscriptionActivatedEmail(
              order.first_name || "there",
              plan.name,
              Number(plan.price_inr),
              validUntil,
              finalInvoice,
              razorpay_payment_id,
            ),
          );
          console.log("[VerifyPayment] EMAIL SENT to", order.email, "result=", sent);
        } catch (emailErr) {
          console.error("[VerifyPayment] EMAIL FAILED:", emailErr);
        }
      })();
    }

    return NextResponse.json({
      success:       true,
      immediate:     result.immediate,
      message:       result.immediate
        ? `Subscription activated! Valid until ${validUntil}.`
        : result.message,
      planId:        order.plan_id,
      paymentId:     razorpay_payment_id,
      invoiceId,
      invoiceNumber: finalInvoice,
    });

  } catch (err: any) {
    console.error("[VerifyPayment] FAILED:", err?.message, err?.stack);
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }
}