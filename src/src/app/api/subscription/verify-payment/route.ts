// src/app/api/subscription/verify-payment/route.ts
// Verifies Razorpay HMAC, activates subscription, stores invoice.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { activateSubscription } from "@/lib/subscription";
import { createNotification } from "@/lib/notifications";
import { subscriptionActivatedEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const expBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch { return false; }
}

async function generateInvoiceNumber(): Promise<string> {
  const res = await query(`SELECT nextval('invoice_number_seq') AS n`);
  const n   = String(res.rows[0].n).padStart(6, "0");
  return `INV-${new Date().getFullYear()}-${n}`;
}

export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const orderRes = await query(
    `SELECT plan_id, amount_inr, status FROM razorpay_orders
     WHERE razorpay_order_id = $1 AND user_uid = $2 LIMIT 1`,
    [razorpay_order_id, uid],
  );
  if (!orderRes.rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = orderRes.rows[0];

  if (order.status === "paid") {
    const inv = await query(`SELECT id, invoice_number FROM invoices WHERE razorpay_payment_id = $1 LIMIT 1`, [razorpay_payment_id]);
    return NextResponse.json({ success: true, message: "Already processed", invoiceId: inv.rows[0]?.id ?? null, invoiceNumber: inv.rows[0]?.invoice_number ?? null });
  }

  if (!order.plan_id) return NextResponse.json({ error: "Order missing plan_id" }, { status: 400 });

  try {
    await query(
      `UPDATE razorpay_orders SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW()
       WHERE razorpay_order_id = $2 AND user_uid = $3`,
      [razorpay_payment_id, razorpay_order_id, uid],
    );

    const result = await activateSubscription(uid, order.plan_id, razorpay_order_id, razorpay_payment_id);

    const userRes   = await query(`SELECT CONCAT(first_name, ' ', last_name) AS name, email FROM users WHERE uid = $1 LIMIT 1`, [uid]);
    const user      = userRes.rows[0];
    const invoiceNo = await generateInvoiceNumber();

    const invRes = await query(
      `INSERT INTO invoices
         (user_uid, razorpay_order_id, razorpay_payment_id, plan_id,
          amount_inr, invoice_number, customer_name, customer_email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid')
       ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = 'paid'
       RETURNING id, invoice_number`,
      [uid, razorpay_order_id, razorpay_payment_id, order.plan_id,
       order.amount_inr, invoiceNo, user?.name?.trim() || null, user?.email || null],
    );

    const invoiceId     = invRes.rows[0]?.id;
    const invoiceNumber = invRes.rows[0]?.invoice_number;

    // ── DB notification (always) ─────────────────────────────────────
    const notifMsg = result.immediate
      ? `${order.plan_id.charAt(0).toUpperCase() + order.plan_id.slice(1)} plan activated. Valid until ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. Invoice: ${invoiceNumber}.`
      : result.message;
    createNotification(uid, "Subscription Activated ✓", notifMsg, "success", false).catch(() => {});

    // ── Rich transactional email ──────────────────────────────────────
    if (result.immediate) {
      (async () => {
        try {
          const planRes = await query(
            `SELECT name, price_inr FROM subscription_plans WHERE id = $1 LIMIT 1`,
            [order.plan_id],
          );
          const plan      = planRes.rows[0];
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          const validUntil = expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
          if (user?.email && plan) {
            await sendEmail(
              user.email,
              `Subscription Activated — ${plan.name}`,
              subscriptionActivatedEmail(
                user.name?.split(" ")[0]?.trim() || "there",
                plan.name,
                Number(plan.price_inr),
                validUntil,
                invoiceNumber,
                razorpay_payment_id,
              ),
            );
          }
        } catch (emailErr) {
          console.error("[VerifyPayment] Email failed:", emailErr);
        }
      })();
    }

    return NextResponse.json({ success: true, immediate: result.immediate, message: result.message, planId: order.plan_id, paymentId: razorpay_payment_id, invoiceId, invoiceNumber });

  } catch (err: any) {
    console.error("[VerifyPayment] Failed:", err?.message);
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }
}
