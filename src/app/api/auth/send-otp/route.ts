// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

// "verify-email" — used during signup before Firebase account is created.
// "reset"        — forgot-password, user must exist in DB.
// "change_password" / "delete_account" — require active session.
const ALLOWED_PURPOSES = ["verify-email", "reset", "change_password", "delete_account"];

const PURPOSE_LABELS: Record<string, string> = {
  "verify-email":  "Email Verification",
  reset:           "Password Reset",
  change_password: "Password Change",
  delete_account:  "Account Deletion",
};

// 60-second OTP TTL as requested
const OTP_TTL_SECONDS = 60;

function generateOtp(): string {
  return String(crypto.randomInt(100_000, 999_999));
}

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Accept both "purpose" (canonical) and legacy "type" field names from the frontend
    const purpose: string =
      body?.purpose ||
      (body?.type === "forgot-password" ? "reset" :
       body?.type === "verify-email"    ? "verify-email" :
       body?.type === "forgot"          ? "reset" : "");

    if (!purpose || !ALLOWED_PURPOSES.includes(purpose)) {
      return NextResponse.json({ error: "Invalid or missing purpose" }, { status: 400 });
    }

    let email: string;

    if (purpose === "verify-email") {
      // Signup flow — user does NOT exist in DB yet, no DB lookup required
      email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Valid email required" }, { status: 400 });
      }

    } else if (purpose === "reset") {
      // Forgot-password — user must exist (silent return if not, prevents enumeration)
      email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Valid email required" }, { status: 400 });
      }
      const check = await query(
        `SELECT uid FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email],
      );
      if (!check.rows.length) {
        return NextResponse.json({ success: true }); // silent — never reveal if email exists
      }

    } else {
      // change_password / delete_account — requires active authenticated session
      const uid = await getUid();
      if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const res = await query(`SELECT email FROM users WHERE uid = $1`, [uid]);
      if (!res.rows.length) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      email = res.rows[0].email;
    }

    // Rate limit: 1 OTP per 60 seconds per email + purpose
    const recent = await query(
      `SELECT id FROM otp_store
       WHERE email = $1 AND purpose = $2
         AND created_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [email, purpose],
    );
    if (recent.rows.length > 0) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code" },
        { status: 429 },
      );
    }

    const otp     = generateOtp();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Invalidate any previous unused OTPs for this email + purpose
    await query(
      `UPDATE otp_store SET used = TRUE
       WHERE email = $1 AND purpose = $2 AND used = FALSE`,
      [email, purpose],
    );

    // Store new OTP with 60-second TTL
    await query(
      `INSERT INTO otp_store (email, otp_hash, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '${OTP_TTL_SECONDS} seconds')`,
      [email, otpHash, purpose],
    );

    // Send email
    const label = PURPOSE_LABELS[purpose] ?? "Verification";
    const html  = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#08080f;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid rgba(139,92,246,0.2);">
        <h2 style="color:#a78bfa;margin:0 0 4px;">Pentellia Security</h2>
        <p style="color:#94a3b8;margin:0 0 24px;font-size:14px;">${label}</p>
        <div style="background:#1e1b4b;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
          <p style="color:#94a3b8;font-size:11px;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase;">Your verification code</p>
          <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#a78bfa;font-family:monospace;">${otp}</div>
          <p style="color:#ef4444;font-size:12px;margin:12px 0 0;font-weight:600;">Valid for 60 seconds only. Do not share.</p>
        </div>
        <p style="color:#64748b;font-size:12px;margin:0;">If you did not request this, you can safely ignore this email.</p>
      </div>`;

    const sent = await sendEmail(
      email,
      `[Pentellia] ${otp} — Your ${label} Code (expires in 60 sec)`,
      html,
    ).catch(() => false);

    if (sent === false) {
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    const message = err?.message || "Internal server error";
    const isDev   = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      { error: isDev ? message : "Internal server error" },
      { status: 500 },
    );
  }
}