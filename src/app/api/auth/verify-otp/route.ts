// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// Shared reset-token store for change-password and delete-account routes
const g = globalThis as typeof globalThis & {
  _rts?: Map<string, { uid: string; email: string; purpose: string; expiresAt: number }>;
};
if (!g._rts) g._rts = new Map();
export const resetTokenStore = g._rts;

const ALLOWED = ["verify-email", "reset", "change_password", "delete_account"];

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { otp, email: bodyEmail } = body;

    // Accept both "purpose" (canonical) and legacy "type" field names
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

    // Resolve which email to look up against
    let email: string;

    if (purpose === "verify-email" || purpose === "reset") {
      // Both use the email from the request body (no session needed)
      email = typeof bodyEmail === "string" ? bodyEmail.toLowerCase().trim() : "";
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Valid email required" }, { status: 400 });
      }
    } else {
      // change_password / delete_account — resolve email from active session
      const uid = await getUid();
      if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const res = await query(`SELECT email FROM users WHERE uid = $1`, [uid]);
      if (!res.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
      email = res.rows[0].email;
    }

    // Look up the most recent valid OTP for this email + purpose
    const record = await query(
      `SELECT id, otp_hash FROM otp_store
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

    // Constant-time comparison to prevent timing attacks
    const row       = record.rows[0];
    const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const stored    = Buffer.from(row.otp_hash, "hex");
    const input     = Buffer.from(inputHash,    "hex");
    const match     = stored.length === input.length && crypto.timingSafeEqual(stored, input);

    if (!match) {
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
    }

    // Mark OTP as used — prevents replay
    await query(`UPDATE otp_store SET used = TRUE WHERE id = $1`, [row.id]);

    // For verify-email: no resetToken needed — just return success confirmation
    // The frontend will then create the Firebase account on this success response
    if (purpose === "verify-email") {
      return NextResponse.json({ success: true, verified: true });
    }

    // For reset / change_password / delete_account — issue a short-lived resetToken
    const userRes = await query(
      `SELECT uid FROM users WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
    const uid        = userRes.rows[0]?.uid ?? "";
    const resetToken = crypto.randomBytes(32).toString("hex");

    resetTokenStore.set(resetToken, {
      uid,
      email,
      purpose,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 min window to complete the next step
    });

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