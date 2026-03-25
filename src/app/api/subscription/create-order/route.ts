// src/app/api/subscription/create-order/route.ts
// Dynamic top-up: accepts a server-validated amount from the pricing calculator.
// The frontend sends the slider config; the server recalculates the total
// independently and creates a Razorpay order for that exact amount.
// Fixed plan tiers (₹299 / ₹499 / ₹999 etc.) are REMOVED per billing spec.

import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import crypto from "crypto";

// ── Server-side pricing constants (source of truth) ─────────────────
// These MUST match the values in migration_billing.sql / pricing_rates table.
const RATES = {
  deep_op:      250,           // INR per deep operation
  light_op:     170,           // INR per light operation
  report:       100,           // INR per report
  token_input:  180 / 1e6,     // INR per input token
  token_output: 250 / 1e6,     // INR per output token
};
const MINIMUM_INR = 6500;
const MAX_DAILY_TOPUP_INR = 100_000;  // Daily fraud cap

// ── Razorpay client ──────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ── Input validation schema ──────────────────────────────────────────
interface CalculatorConfig {
  deepOps:      number;
  lightOps:     number;
  reports:      number;
  inputTokens:  number;
  outputTokens: number;
}

function validateConfig(body: any): { config: CalculatorConfig; error?: string } {
  const {
    deepOps      = 0,
    lightOps     = 0,
    reports      = 0,
    inputTokens  = 0,
    outputTokens = 0,
  } = body ?? {};

  // Type checks
  for (const [k, v] of Object.entries({ deepOps, lightOps, reports, inputTokens, outputTokens })) {
    if (typeof v !== "number" || !isFinite(v) || v < 0) {
      return { config: {} as CalculatorConfig, error: `Invalid value for ${k}` };
    }
  }

  // Range guards (server-side mirror of slider maxes)
  if (deepOps      > 10_000)    return { config: {} as CalculatorConfig, error: "deepOps exceeds max" };
  if (lightOps     > 50_000)    return { config: {} as CalculatorConfig, error: "lightOps exceeds max" };
  if (reports      > 2_000)     return { config: {} as CalculatorConfig, error: "reports exceeds max" };
  if (inputTokens  > 100_000_000) return { config: {} as CalculatorConfig, error: "inputTokens exceeds max" };
  if (outputTokens > 100_000_000) return { config: {} as CalculatorConfig, error: "outputTokens exceeds max" };

  return {
    config: {
      deepOps:      Math.floor(deepOps),
      lightOps:     Math.floor(lightOps),
      reports:      Math.floor(reports),
      inputTokens:  Math.floor(inputTokens),
      outputTokens: Math.floor(outputTokens),
    },
  };
}

// ── Server-side total calculation (mirrors frontend formula exactly) ─
function computeTotal(config: CalculatorConfig): number {
  const subtotal =
    config.deepOps      * RATES.deep_op      +
    config.lightOps     * RATES.light_op     +
    config.reports      * RATES.report       +
    config.inputTokens  * RATES.token_input  +
    config.outputTokens * RATES.token_output;

  return Math.max(subtotal, MINIMUM_INR);
}

export async function POST(req: NextRequest) {
  const uid = await getUid(true); // checkRevoked=true — payment operation
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // ── 1. Validate and compute amount server-side ───────────────────
  const { config, error: configErr } = validateConfig(body);
  if (configErr) return NextResponse.json({ error: configErr }, { status: 400 });

  const computedINR = computeTotal(config);

  // ── 2. Enforce minimum floor ─────────────────────────────────────
  if (computedINR < MINIMUM_INR) {
    return NextResponse.json(
      { error: `Minimum top-up is ₹${MINIMUM_INR}` },
      { status: 400 },
    );
  }

  // ── 3. Daily fraud cap ───────────────────────────────────────────
  const dailyRes = await query(
    `SELECT COALESCE(SUM(amount_inr), 0) AS daily_total
     FROM razorpay_orders
     WHERE user_uid = $1 AND status = 'paid'
       AND paid_at > NOW() - INTERVAL '24 hours'`,
    [uid],
  );
  const dailyTotal = parseFloat(String(dailyRes.rows[0]?.daily_total || "0"));
  if (dailyTotal + computedINR > MAX_DAILY_TOPUP_INR) {
    return NextResponse.json(
      { error: `Daily limit of ₹${MAX_DAILY_TOPUP_INR} reached. Try again tomorrow.` },
      { status: 429 },
    );
  }

  const amountPaise = Math.round(computedINR * 100); // Razorpay uses paise

  // ── 4. Idempotency: reuse pending order (same user + config + minute) ─
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${uid}:dynamic:${amountPaise}:${Math.floor(Date.now() / 60_000)}`)
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
        notes:    {
          uid,
          type:         "dynamic_topup",
          amount_inr:   computedINR.toString(),
          deep_ops:     config.deepOps.toString(),
          light_ops:    config.lightOps.toString(),
          reports:      config.reports.toString(),
          input_tokens: config.inputTokens.toString(),
        },
      });
      orderId = order.id;

      await query(
        `INSERT INTO razorpay_orders
           (user_uid, plan_id, razorpay_order_id, amount_inr, credits_inr,
            status, idempotency_key, calculator_config)
         VALUES ($1, NULL, $2, $3, $3, 'created', $4, $5)`,
        [
          uid,
          orderId,
          computedINR,
          idempotencyKey,
          JSON.stringify(config),
        ],
      );
    }

    return NextResponse.json({
      success:     true,
      orderId,
      amount:      amountPaise,
      currency:    "INR",
      keyId:       process.env.RAZORPAY_KEY_ID,
      name:        "Pentellia Wallet Top-Up",
      description: `Wallet top-up ₹${new Intl.NumberFormat("en-IN").format(computedINR)}`,
      computedINR,   // echo back for UI confirmation
    });

  } catch (err: any) {
    console.error("[CreateOrder]", err?.message);
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}