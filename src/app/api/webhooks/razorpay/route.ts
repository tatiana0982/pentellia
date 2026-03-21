// src/app/api/webhooks/razorpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { createNotification } from "@/lib/notifications";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const sigHeader = req.headers.get("x-razorpay-signature") || "";

  // ── Verify HMAC ───────────────────────────────────────────────────
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  let sigOk = false;
  try {
    sigOk = crypto.timingSafeEqual(
      Buffer.from(expected,  "hex"),
      Buffer.from(sigHeader, "hex"),
    );
  } catch { sigOk = false; }

  if (!sigOk) return new NextResponse("Forbidden", { status: 403 });

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const eventType = event?.event;
  const payment   = event?.payload?.payment?.entity;
  if (!payment) return new NextResponse("OK", { status: 200 });

  const orderId   = payment.order_id;
  const paymentId = payment.id;

  try {
    if (eventType === "payment.captured") {
      // Fetch order from our DB — amount comes from DB, never from webhook body
      const orderRes = await query(
        `SELECT user_uid, credits_inr, status
         FROM razorpay_orders
         WHERE razorpay_order_id = $1 LIMIT 1`,
        [orderId],
      );

      if (!orderRes.rows.length) return new NextResponse("OK", { status: 200 });

      const { user_uid: uid, credits_inr, status } = orderRes.rows[0];

      // Idempotency guard
      if (status === "paid") return new NextResponse("OK", { status: 200 });

      const creditsToAdd = parseFloat(credits_inr);

      await query("BEGIN");
      try {
        await query(
          `UPDATE razorpay_orders
           SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW()
           WHERE razorpay_order_id = $2`,
          [paymentId, orderId],
        );

        const creditRes = await query(
          `INSERT INTO user_credits (user_uid, balance, total_bought, total_spent)
           VALUES ($1, $2, $2, 0)
           ON CONFLICT (user_uid)
           DO UPDATE SET
             balance      = user_credits.balance      + $2,
             total_bought = user_credits.total_bought  + $2,
             updated_at   = NOW()
           RETURNING balance`,
          [uid, creditsToAdd],
        );

        const balanceAfter = parseFloat(creditRes.rows[0].balance);

        await query(
          `INSERT INTO credit_transactions
             (user_uid, type, amount, balance_after, description, ref_type, ref_id)
           VALUES ($1, 'credit', $2, $3, $4, 'razorpay', $5)`,
          [uid, creditsToAdd, balanceAfter, `Webhook top-up ₹${creditsToAdd}`, paymentId],
        );

        await query("COMMIT");
        createNotification(uid, "Credits Added ✓", `₹${creditsToAdd} added to your wallet.`, "success").catch(() => {});
      } catch {
        await query("ROLLBACK");
      }
    }

    if (eventType === "payment.failed") {
      await query(
        `UPDATE razorpay_orders SET status = 'failed' WHERE razorpay_order_id = $1`,
        [orderId],
      ).catch(() => {});

      const orderRes = await query(
        `SELECT user_uid FROM razorpay_orders WHERE razorpay_order_id = $1 LIMIT 1`,
        [orderId],
      ).catch(() => null);

      const uid = orderRes?.rows?.[0]?.user_uid;
      if (uid) {
        createNotification(uid, "Payment Failed", "Your payment could not be completed. No credits were added.", "error").catch(() => {});
      }
    }
  } catch {
    // Always return 200 to Razorpay — retries would just re-hit our idempotency guard
    return new NextResponse("OK", { status: 200 });
  }

  return new NextResponse("OK", { status: 200 });
}