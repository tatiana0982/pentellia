// src/lib/razorpay.ts
// Razorpay integration — uses REST API directly (no SDK dependency)

import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID!;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

const BASE_URL = "https://api.razorpay.com/v1";

// Basic auth header
function authHeader() {
  const encoded = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  return `Basic ${encoded}`;
}

// ─────────────────────────────────────────────
// Create a Razorpay order
// amount is in paise (INR × 100)
// ─────────────────────────────────────────────
export async function createRazorpayOrder(params: {
  amount: number; // paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency ?? "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.description ?? "Razorpay order creation failed");
  }

  return res.json();
}

// ─────────────────────────────────────────────
// Verify payment signature (checkout callback)
// razorpay_signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
// ─────────────────────────────────────────────
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}

// ─────────────────────────────────────────────
// Verify webhook signature
// X-Razorpay-Signature = HMAC-SHA256(raw_body, webhook_secret)
// ─────────────────────────────────────────────
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("[Razorpay] RAZORPAY_WEBHOOK_SECRET not set — skipping webhook verification");
    return false;
  }
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export { KEY_ID };