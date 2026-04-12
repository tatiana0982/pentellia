// src/app/api/auth/verify-otp/route.ts
// AUDIT FIX: Added brute-force protection — max 5 attempts per OTP.
// Previously had NO attempt limiting. Attacker could enumerate all 1,000,000
// 6-digit codes without any restriction.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

const g = globalThis as typeof globalThis & {
  _rts?: Map<string, { uid: string; email: string; purpose: string; expiresAt: number }>;
};
if (!g._rts) g._rts = new Map();
export const resetTokenStore = g._rts;

const ALLOWED    = ["verify-email", "reset", "change_password", "delete_account"];
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { otp, email: bodyEmail } = body;

    let purpose: string =
      body?.purpose ||
      (body?.type === "forgot-password" ? "reset" :
       body?.type === "verify-email"    ? "verify-email" :
       body?.type === "forgot"          ? "reset" : "reset");

    if (!ALLOWED.includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }
    if (!otp || typeof otp !== "string") {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    let email: string;
    if (purpose === "verify-email" || purpose === "reset") {
      email = typeof bodyEmail === "string" ? bodyEmail.toLowerCase().trim() : "";
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Valid email required" }, { status: 400 });
      }
    } else {
      const uid = await getUid();
      if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const res = await query(`SELECT email FROM users WHERE uid = $1`, [uid]);
      if (!res.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
      email = res.rows[0].email;
    }

    // ── Fetch OTP record ────────────────────────────────────────────
    const record = await query(
      `SELECT id, otp_hash, attempt_count FROM otp_store
       WHERE email = $1 AND purpose = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, purpose],
    );

    if (!record.rows.length) {
      return NextResponse.json(
        { error: "No valid OTP found. The code may have expired — request a new one." },
        { status: 400 },
      );
    }

    const row = record.rows[0];

    // ── Brute-force protection ──────────────────────────────────────
    const attempts = Number(row.attempt_count ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      // Mark as used to invalidate — force user to request a new OTP
      await query(`UPDATE otp_store SET used = TRUE WHERE id = $1`, [row.id]);
      return NextResponse.json(
        { error: `Too many failed attempts. Please request a new OTP.` },
        { status: 429 },
      );
    }

    // ── Constant-time comparison ────────────────────────────────────
    const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const stored    = Buffer.from(row.otp_hash, "hex");
    const input     = Buffer.from(inputHash,    "hex");
    const match     = stored.length === input.length && crypto.timingSafeEqual(stored, input);

    if (!match) {
      // Increment attempt counter atomically
      await query(
        `UPDATE otp_store SET attempt_count = attempt_count + 1 WHERE id = $1`,
        [row.id],
      );
      const remaining = MAX_ATTEMPTS - attempts - 1;
      return NextResponse.json(
        { error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` },
        { status: 400 },
      );
    }

    // ── OTP correct — mark as used ──────────────────────────────────
    await query(`UPDATE otp_store SET used = TRUE WHERE id = $1`, [row.id]);

    if (purpose === "verify-email") {
      return NextResponse.json({ success: true, verified: true });
    }

    const userRes    = await query(`SELECT uid FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    const uid        = userRes.rows[0]?.uid ?? "";
    const resetToken = crypto.randomBytes(32).toString("hex");

    resetTokenStore.set(resetToken, { uid, email, purpose, expiresAt: Date.now() + 15 * 60 * 1000 });

    // Prune expired entries
    const now = Date.now();
    for (const [k, v] of resetTokenStore) if (now > v.expiresAt) resetTokenStore.delete(k);

    return NextResponse.json({ success: true, resetToken });

  } catch (err: any) {
    console.error("[VerifyOTP]", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV !== "production" ? err.message : "Verification failed" },
      { status: 500 },
    );
  }
}
