// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { adminAuth } from "@/config/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { otp, purpose, email: bodyEmail } = body;

    if (!otp || typeof otp !== "string") {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    const ALLOWED = ["reset", "change_password", "delete_account"];
    if (!purpose || !ALLOWED.includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }

    // ── Resolve email ──────────────────────────────────────────────
    let email: string;
    if (purpose === "reset") {
      if (!bodyEmail) {
        return NextResponse.json({ error: "Email is required for password reset" }, { status: 400 });
      }
      email = bodyEmail.toLowerCase().trim();
    } else {
      const uid = await getUid();
      if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const res = await query(`SELECT email FROM users WHERE uid = $1`, [uid]);
      if (!res.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
      email = res.rows[0].email;
    }

    // ── Look up latest valid OTP in DB ─────────────────────────────
    const record = await query(
      `SELECT id, otp_hash, expires_at, used
       FROM otp_store
       WHERE email = $1
         AND purpose = $2
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, purpose],
    );

    if (!record.rows.length) {
      return NextResponse.json(
        { error: "No valid OTP found. Please request a new code." },
        { status: 400 },
      );
    }

    const row      = record.rows[0];
    const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    // Constant-time compare
    const storedBuf = Buffer.from(row.otp_hash, "hex");
    const inputBuf  = Buffer.from(inputHash, "hex");
    const match =
      storedBuf.length === inputBuf.length &&
      crypto.timingSafeEqual(storedBuf, inputBuf);

    if (!match) {
      return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 });
    }

    // Mark OTP as used
    await query(`UPDATE otp_store SET used = TRUE WHERE id = $1`, [row.id]);

    // ── Purpose-specific actions ───────────────────────────────────
    if (purpose === "change_password") {
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 },
        );
      }
      const userRes = await query(`SELECT uid FROM users WHERE email = $1`, [email]);
      if (!userRes.rows.length) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      await adminAuth.updateUser(userRes.rows[0].uid, { password: newPassword });
      return NextResponse.json({ success: true, message: "Password changed successfully" });
    }

    if (purpose === "delete_account") {
      const uid = await getUid();
      if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // Delete from DB then Firebase
      await query(`DELETE FROM users WHERE uid = $1`, [uid]);
      await adminAuth.deleteUser(uid);
      return NextResponse.json({ success: true, message: "Account deleted" });
    }

    if (purpose === "reset") {
      // Return a short-lived token the client sends with /reset-password
      const resetToken = crypto.randomBytes(32).toString("hex");
      await query(
        `UPDATE otp_store SET otp_hash = $1, expires_at = NOW() + INTERVAL '15 minutes'
         WHERE id = $2`,
        [crypto.createHash("sha256").update(resetToken).digest("hex"), row.id],
      );
      return NextResponse.json({ success: true, resetToken });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[VerifyOTP]", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV !== "production" ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}