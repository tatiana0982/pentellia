// src/app/api/auth/delete-account/route.ts
// Archives forensic snapshot to admin_user_archive before wiping data.

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { resetTokenStore } from "@/app/api/auth/verify-otp/route";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const uid = await getUid(true);
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

  await query("BEGIN");
  try {
    // ── 1. Forensic snapshot BEFORE deleting anything ──────────────
    const [userRow, subRows, scanStats, loginRow, spendRow] = await Promise.all([
      query(`SELECT email, first_name, last_name, created_at FROM users WHERE uid = $1`, [uid]),
      query(
        `SELECT ro.plan_id, sp.name AS plan_name, ro.amount_inr, ro.paid_at, ro.razorpay_payment_id
         FROM razorpay_orders ro LEFT JOIN subscription_plans sp ON ro.plan_id = sp.id
         WHERE ro.user_uid = $1 AND ro.status = 'paid' ORDER BY ro.paid_at ASC`, [uid],
      ),
      query(
        `SELECT COUNT(*) AS total, MAX(created_at) AS last_scan_at,
           COUNT(*) FILTER (WHERE status='failed') AS failed,
           ARRAY_AGG(DISTINCT target) FILTER (WHERE target IS NOT NULL) AS targets
         FROM scans WHERE user_uid = $1 AND deleted_at IS NULL`, [uid],
      ),
      query(`SELECT ip_address, created_at FROM login_history WHERE user_uid = $1 ORDER BY created_at DESC LIMIT 1`, [uid]),
      query(`SELECT COALESCE(SUM(amount_inr), 0) AS total FROM razorpay_orders WHERE user_uid = $1 AND status = 'paid'`, [uid]),
    ]);

    const user       = userRow.rows[0] ?? {};
    const scanRow    = scanStats.rows[0] ?? {};
    const lastLogin  = loginRow.rows[0] ?? {};
    const totalSpend = parseFloat(spendRow.rows[0]?.total ?? "0");
    const subscriptionSummary = subRows.rows.map((r: any) => ({
      plan: r.plan_name ?? r.plan_id, amount: parseFloat(r.amount_inr),
      paid_at: r.paid_at, payment_id: r.razorpay_payment_id,
    }));

    // ── 2. Archive to admin table ────────────────────────────────────
    await query(
      `INSERT INTO admin_user_archive (
         user_uid, email, first_name, last_name, account_created_at, deletion_requested_at,
         subscription_summary, total_scans_run, total_spend_inr,
         last_login_at, last_login_ip, last_scan_at, had_failed_scans, scan_targets
       ) VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        uid, user.email || "unknown", user.first_name || null, user.last_name || null,
        user.created_at || null, JSON.stringify(subscriptionSummary),
        parseInt(scanRow.total || "0"), totalSpend,
        lastLogin.created_at || null, lastLogin.ip_address || null,
        scanRow.last_scan_at || null, parseInt(scanRow.failed || "0") > 0,
        scanRow.targets || [],
      ],
    );

    // ── 3. Wipe user data ────────────────────────────────────────────
    await query(`UPDATE users SET deletion_requested_at = NOW() WHERE uid = $1`, [uid]);
    await query(`DELETE FROM login_history     WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM notifications     WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM api_keys          WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM otp_store         WHERE email = (SELECT email FROM users WHERE uid = $1)`, [uid]);
    await query(`UPDATE scans   SET deleted_at = NOW() WHERE user_uid = $1 AND deleted_at IS NULL`, [uid]);
    await query(`UPDATE assets  SET deleted_at = NOW() WHERE user_uid = $1 AND deleted_at IS NULL`, [uid]);
    await query(`UPDATE reports SET deleted_at = NOW() WHERE user_uid = $1 AND deleted_at IS NULL`, [uid]);
    await query(`UPDATE user_subscriptions SET status = 'cancelled' WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM usage_tracking WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM daily_usage    WHERE user_uid = $1`, [uid]);
    await query(`DELETE FROM ai_summaries   WHERE user_uid = $1`, [uid]);
    await query(`UPDATE invoices SET customer_name = 'DELETED', customer_email = 'DELETED' WHERE user_uid = $1`, [uid]);
    try { await query(`DELETE FROM push_subscriptions WHERE user_uid = $1`, [uid]); } catch {}

    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    console.error("[DeleteAccount]", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }

  try { await adminAuth.revokeRefreshTokens(uid); } catch {}
  const cookieStore = await cookies();
  cookieStore.set("__session", "", { maxAge: -1, path: "/" });
  return NextResponse.json({ success: true });
}
