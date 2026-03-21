// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Re-use the same global store from send-otp
declare global {
  // eslint-disable-next-line no-var
  var __otpStore: Map<string, { otp: string; expiresAt: number; type: string }> | undefined;
}
const otpStore = global.__otpStore!;

// Short-lived reset tokens issued after OTP verified — used by reset-password
const resetTokenStore = new Map<string, { email: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { email, otp, type } = await req.json();

    if (!email || !otp || !type) {
      return NextResponse.json({ error: "email, otp, and type are required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const record = otpStore.get(emailLower);

    if (!record) {
      return NextResponse.json({ error: "No OTP found. Request a new code." }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(emailLower);
      return NextResponse.json({ error: "OTP has expired. Please request a new code." }, { status: 400 });
    }

    if (record.type !== type) {
      return NextResponse.json({ error: "Invalid OTP type." }, { status: 400 });
    }

    // Constant-time comparison to prevent timing attacks
    const expected = Buffer.from(record.otp.padEnd(32));
    const provided  = Buffer.from(otp.padEnd(32));
    const match = expected.length === provided.length &&
      crypto.timingSafeEqual(expected, provided);

    if (!match) {
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
    }

    // OTP verified — consume it (one-time use)
    otpStore.delete(emailLower);

    if (type === "forgot-password") {
      // Issue a short-lived reset token (5 minutes)
      const resetToken = crypto.randomBytes(32).toString("hex");
      resetTokenStore.set(resetToken, { email: emailLower, expiresAt: Date.now() + 5 * 60 * 1000 });
      setTimeout(() => resetTokenStore.delete(resetToken), 5 * 60 * 1000);
      return NextResponse.json({ success: true, resetToken });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[VerifyOTP]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Export resetTokenStore so reset-password route can validate it
export { resetTokenStore };