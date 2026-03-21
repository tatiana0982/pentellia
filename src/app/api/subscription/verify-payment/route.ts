// src/app/api/subscription/verify-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

const MAX_DAILY_TOPUP = 10_000;
const isDev = process.env.NODE_ENV !== "production";

/**
 * Razorpay signature verification.
 * Uses constant-time comparison to prevent timing attacks.
 * Falls back to regular comparison if buffer lengths differ (invalid hex).
 */
function verifyRazorpaySignature(
  orderId:   string,
  paymentId: string,
  signature: string,
  secret:    string,
): boolean {
  try {
    const payload  = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Both should be 64-char hex strings (32 bytes SHA-256)
    if (expected.length !== signature.length) {
      if (isDev) process.stdout.write(`[Razorpay] Sig length mismatch: expected=${expected.length} got=${signature.length}\n`);
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expected,  "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch (err: any) {
    if (isDev) process.stdout.write(`[Razorpay] Sig verification error: ${err.message}\n`);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const uid = await getUid(true);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    last4,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    if (isDev) process.stdout.write("[Razorpay] RAZORPAY_KEY_SECRET is not set in .env\n");
    return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });
  }

  // ── 1. Verify HMAC signature ──────────────────────────────────────
  const sigOk = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    secret,
  );

  if (!sigOk) {
    if (isDev) {
      process.stdout.write(`[Razorpay] Signature mismatch\n  order=${razorpay_order_id}\n  payment=${razorpay_payment_id}\n`);
    }
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // ── 2. Fetch order from DB — amount always from DB ────────────────
  const orderRes = await query(
    `SELECT amount_inr, credits_inr, plan_id, status
     FROM razorpay_orders
     WHERE razorpay_order_id = $1 AND user_uid = $2
     LIMIT 1`,
    [razorpay_order_id, uid],
  );

  if (!orderRes.rows.length) {
    if (isDev) process.stdout.write(`[Razorpay] Order not found: ${razorpay_order_id} for uid ${uid}\n`);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderRes.rows[0];

  // ── 3. Idempotency guard ──────────────────────────────────────────
  if (order.status === "paid") {
    return NextResponse.json({ success: true, message: "Already processed" });
  }

  const creditsToAdd = parseFloat(order.credits_inr);
  const amountFromDB = parseFloat(order.amount_inr);

  // Explicit assertion: credits must equal amount (data integrity)
  if (Math.abs(creditsToAdd - amountFromDB) > 0.01) {
    return NextResponse.json(
      { error: "Order amount mismatch — contact support" },
      { status: 400 },
    );
  }

  // ── 4. Daily top-up limit ─────────────────────────────────────────
  const dailyRes = await query(
    `SELECT COALESCE(SUM(amount_inr), 0) AS daily_total
     FROM razorpay_orders
     WHERE user_uid = $1 AND status = 'paid'
       AND paid_at > NOW() - INTERVAL '24 hours'`,
    [uid],
  );
  const dailyTotal = parseFloat(String(dailyRes.rows[0]?.daily_total || "0"));
  if (dailyTotal + creditsToAdd > MAX_DAILY_TOPUP) {
    return NextResponse.json(
      { error: `Daily limit of ₹${MAX_DAILY_TOPUP} reached. Try again tomorrow.` },
      { status: 429 },
    );
  }

  // ── 5. Atomic DB transaction ──────────────────────────────────────
  await query("BEGIN");
  try {
    const safe4 =
      typeof last4 === "string" && /^\d{4}$/.test(last4) ? last4 : null;

    await query(
      `UPDATE razorpay_orders
       SET status = 'paid',
           razorpay_payment_id = $1,
           paid_at             = NOW(),
           last_4_digits       = $3
       WHERE razorpay_order_id = $2 AND user_uid = $4`,
      [razorpay_payment_id, razorpay_order_id, safe4, uid],
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
       VALUES ($1, 'credit', $2, $3, $4, 'razorpay', $5)`,
      [
        uid,
        creditsToAdd,
        balanceAfter,
        `Wallet top-up ₹${creditsToAdd}`,
        razorpay_payment_id,
      ],
    );

    await query("COMMIT");
  } catch (err: any) {
    await query("ROLLBACK");
    if (isDev) process.stdout.write(`[Razorpay] DB transaction failed: ${err.message}\n`);
    return NextResponse.json({ error: "Failed to credit wallet" }, { status: 500 });
  }

  createNotification(
    uid,
    "Credits Added ✓",
    `₹${creditsToAdd} has been credited to your wallet.`,
    "success",
  ).catch(() => {});

  return NextResponse.json({ success: true, amountAdded: creditsToAdd });
}