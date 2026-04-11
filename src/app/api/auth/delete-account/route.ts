// src/app/api/auth/delete-account/route.ts
// AUDIT FIX: Complete GDPR-compliant cleanup.
// Previously missing: notifications, api_keys, invoices, usage_tracking,
// daily_usage, ai_summaries, user_subscriptions, razorpay_orders, otp_store.

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

  if (confirmation !== "I delete this account") {
    return NextResponse.json({ error: "Confirmation text does not match" }, { status: 400 });
  }

  if (!token) return NextResponse.json({ error: "Missing OTP token" }, { status: 400 });
  const stored = resetTokenStore.get(token);
  if (!stored || Date.now() > stored.expiresAt || stored.uid !== uid) {
    resetTokenStore.delete(token);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  resetTokenStore.delete(token);

  // ── Full cleanup in a single transaction ─────────────────────────
  await query("BEGIN");
  try {
    // 1. Mark user for hard deletion (30-day recovery window)
    await query(
      `UPDATE users SET deletion_requested_at = NOW() WHERE uid = $1`,
      [uid],
    );

    // 2. Hard-delete all PII tables immediately (GDPR Art. 17)
    await query(`DELETE FROM login_history     WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM notifications     WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM api_keys          WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM otp_store         WHERE email = (SELECT email FROM users WHERE uid = $1)`, [uid]);

    // 3. Soft-delete content tables (30-day recovery)
    await query(`UPDATE scans   SET deleted_at = NOW() WHERE user_uid = $1 AND deleted_at IS NULL`, [uid]);
    await query(`UPDATE assets  SET deleted_at = NOW() WHERE user_uid = $1 AND deleted_at IS NULL`, [uid]);
    await query(`UPDATE reports SET deleted_at = NOW() WHERE user_uid = $1 AND deleted_at IS NULL`, [uid]);

    // 4. Cancel active subscription
    await query(
      `UPDATE user_subscriptions SET status = 'cancelled' WHERE user_uid = $1`,
      [uid],
    );

    // 5. Delete usage data
    await query(`DELETE FROM usage_tracking WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM daily_usage    WHERE user_uid = $1`, [uid]);

    // 6. Delete AI summaries
    await query(`DELETE FROM ai_summaries WHERE user_uid = $1`, [uid]);

    // 7. Keep invoices + razorpay_orders for legal/financial records (7-year requirement)
    // Mark them anonymized but don't delete:
    await query(
      `UPDATE invoices SET customer_name = 'DELETED', customer_email = 'DELETED'
       WHERE user_uid = $1`,
      [uid],
    );

    // 8. push_subscriptions (safe no-op if table not created yet)
    try {
      await query(`DELETE FROM push_subscriptions WHERE user_uid = $1`, [uid]);
    } catch { /* table may not exist yet */ }

    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    console.error("[DeleteAccount] Transaction failed:", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }

  // Revoke Firebase session and clear cookie
  try { await adminAuth.revokeRefreshTokens(uid); } catch {}
  const cookieStore = await cookies();
  cookieStore.set("__session", "", { maxAge: -1, path: "/" });

  return NextResponse.json({ success: true });
}