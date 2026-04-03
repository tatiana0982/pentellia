// src/app/api/auth/delete-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { resetTokenStore } from "@/app/api/auth/verify-otp/route";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const uid = await getUid(true); // checkRevoked — deletion is irreversible
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, confirmation } = body;

  // Written confirmation must match exactly
  if (confirmation !== "I delete this account") {
    return NextResponse.json({ error: "Confirmation text does not match" }, { status: 400 });
  }

  // Validate OTP reset token
  if (!token) return NextResponse.json({ error: "Missing OTP token" }, { status: 400 });
  const stored = resetTokenStore.get(token);
  if (!stored || Date.now() > stored.expiresAt || stored.uid !== uid) {
    resetTokenStore.delete(token);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  resetTokenStore.delete(token); // consume immediately

  // ── Hard delete all user data in a single transaction ────────────
  await query("BEGIN");
  try {
    // Soft-delete approach: set deleted_at. Hard delete after 30 days via cron.
    // This gives a recovery window without permanently losing data immediately.
    await query(
      `UPDATE users SET deletion_requested_at = NOW() WHERE uid = $1`,
      [uid],
    );

    // Anonymize sensitive tables immediately for GDPR compliance
    await query(`DELETE FROM login_history WHERE user_uid = $1`,        [uid]);

    // push_subscriptions table is planned but not yet created —
    // guard so a missing table never blocks account deletion.
    try {
      await query(`DELETE FROM push_subscriptions WHERE user_uid = $1`, [uid]);
    } catch { /* table may not exist yet */ }

    await query(`UPDATE scans   SET deleted_at = NOW() WHERE user_uid = $1`, [uid]);
    await query(`UPDATE assets  SET deleted_at = NOW() WHERE user_uid = $1`, [uid]);
    await query(`UPDATE reports SET deleted_at = NOW() WHERE user_uid = $1`, [uid]);

    await query("COMMIT");
  } catch {
    await query("ROLLBACK");
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }

  // Revoke Firebase session
  try { await adminAuth.revokeRefreshTokens(uid); } catch {}

  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.set("__session", "", { maxAge: -1, path: "/" });

  return NextResponse.json({ success: true });
}