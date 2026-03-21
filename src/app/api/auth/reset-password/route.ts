// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { query } from "@/config/db";
import { sendEmail } from "@/lib/email";
import { passwordChangedEmail } from "@/lib/email-templates";
import { resetTokenStore } from "@/app/api/auth/verify-otp/route";

function ts() {
  return new Date().toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { resetToken, newPassword } = await req.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json(
        { error: "resetToken and newPassword are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // 1. Validate reset token
    const record = resetTokenStore.get(resetToken);
    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please restart the process." },
        { status: 400 },
      );
    }
    if (Date.now() > record.expiresAt) {
      resetTokenStore.delete(resetToken);
      return NextResponse.json(
        { error: "Reset token expired. Please request a new OTP." },
        { status: 400 },
      );
    }

    const { email } = record;

    // 2. Look up Firebase UID by email
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    // 3. Update password in Firebase
    await adminAuth.updateUser(firebaseUser.uid, { password: newPassword });

    // 4. Consume the reset token (one-time use)
    resetTokenStore.delete(resetToken);

    // 5. Fetch user name from Postgres
    const userRes = await query(
      `SELECT first_name FROM users WHERE uid = $1`,
      [firebaseUser.uid],
    );
    const firstName = userRes.rows[0]?.first_name || "there";

    // 6. Send security alert email (fire-and-forget)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "Unknown";

    sendEmail(
      email,
      "Your Pentellia Password Was Changed",
      passwordChangedEmail(firstName, ip, ts()),
    ).catch((err) => console.error("[Email] Password changed alert failed:", err));

    return NextResponse.json({ success: true, email });
  } catch (err) {
    console.error("[ResetPassword]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}