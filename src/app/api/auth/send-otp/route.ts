// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

// ── Valid purposes ────────────────────────────────────────────────────
// NOTE: Do NOT use `as const` readonly tuple here — it causes
// TypeScript to reject .includes(string) at compile time.
const ALLOWED_PURPOSES = ["reset", "change_password", "delete_account"];

const PURPOSE_LABELS: Record<string, string> = {
  reset:           "Password Reset",
  change_password: "Password Change",
  delete_account:  "Account Deletion",
};

function generateOtp(): string {
  return String(crypto.randomInt(100_000, 999_999));
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const purpose: string = body?.purpose || "reset";

  if (!ALLOWED_PURPOSES.includes(purpose)) {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  let email: string;

  if (purpose === "reset") {
    // Unauthenticated — email comes from body
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    // Silent success if email doesn't exist (prevents enumeration)
    const check = await query(
      `SELECT uid FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    if (!check.rows.length) {
      return NextResponse.json({ success: true });
    }
  } else {
    // Authenticated — get email from session
    const uid = await getUid();
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = await query(
      `SELECT email FROM users WHERE uid = $1`,
      [uid],
    );
    if (!res.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    email = res.rows[0].email;
  }

  // ── Rate limit: 1 OTP per email+purpose per 60 seconds ───────────
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

  // Invalidate previous unused OTPs for this email + purpose
  await query(
    `UPDATE otp_store SET used = TRUE
     WHERE email = $1 AND purpose = $2 AND used = FALSE`,
    [email, purpose],
  );

  // Store new OTP (10 min TTL)
  await query(
    `INSERT INTO otp_store (email, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [email, otpHash, purpose],
  );

  // ── Send email ─────────────────────────────────────────────────
  const label = PURPOSE_LABELS[purpose] ?? "Verification";
  const html  = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#08080f;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid rgba(139,92,246,0.2);">
      <h2 style="color:#a78bfa;margin:0 0 4px;">Pentellia Security</h2>
      <p style="color:#94a3b8;margin:0 0 24px;font-size:14px;">${label} Verification</p>
      <div style="background:#1e1b4b;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="color:#94a3b8;font-size:11px;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase;">Your verification code</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#a78bfa;font-family:monospace;">${otp}</div>
        <p style="color:#64748b;font-size:11px;margin:12px 0 0;">Valid for 10 minutes. Do not share this code.</p>
      </div>
      <p style="color:#64748b;font-size:12px;margin:0;">If you did not request this, you can safely ignore this email.</p>
    </div>`;

  const sent = await sendEmail(
    email,
    `[Pentellia] Your ${label} Code: ${otp}`,
    html,
  ).catch(() => false);

  if (sent === false) {
    return NextResponse.json(
      { error: "Failed to send email. Check SMTP configuration." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}