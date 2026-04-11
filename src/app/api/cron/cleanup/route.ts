// src/app/api/cron/cleanup/route.ts
// Runs daily at 02:00 UTC via Vercel Cron (vercel.json).
// Cleans up: expired OTPs, old daily_usage rows, soft-deleted users (30d+),
// and anonymizes/purges orphan data.
// Protected: only callable by Vercel Cron (CRON_SECRET header).

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";

export async function GET(req: NextRequest) {
  // Vercel Cron signs requests with Authorization: Bearer <CRON_SECRET>
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number | string> = {};

  try {
    // ── 1. Purge expired / used OTPs ────────────────────────────
    const otp = await query(
      `DELETE FROM otp_store WHERE used = TRUE OR expires_at < NOW() - INTERVAL '1 hour'`,
    );
    results.otp_rows_deleted = otp.rowCount ?? 0;

    // ── 2. Purge old daily_usage (keep 90 days) ──────────────────
    const du = await query(
      `DELETE FROM daily_usage WHERE date < CURRENT_DATE - INTERVAL '90 days'`,
    );
    results.daily_usage_rows_deleted = du.rowCount ?? 0;

    // ── 3. Hard-delete accounts marked 30+ days ago ──────────────
    // First cascade-delete their data, then delete the user row.
    const deletable = await query(
      `SELECT uid FROM users WHERE deletion_requested_at < NOW() - INTERVAL '30 days'`,
    );

    let usersHardDeleted = 0;
    for (const row of deletable.rows) {
      const uid = row.uid;
      try {
        await query("BEGIN");
        // Hard-delete all remaining data
        await query(`DELETE FROM scans              WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM reports            WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM assets             WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM user_subscriptions WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM usage_tracking     WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM daily_usage        WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM ai_summaries       WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM notifications      WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM api_keys           WHERE user_uid = $1`, [uid]);
        await query(`DELETE FROM audit_logs         WHERE user_uid = $1`, [uid]);
        // razorpay_orders and invoices kept for financial records — already anonymized
        await query(`DELETE FROM users              WHERE uid      = $1`, [uid]);
        await query("COMMIT");
        usersHardDeleted++;
      } catch (err) {
        await query("ROLLBACK");
        console.error(`[Cron/Cleanup] Hard delete failed for uid=${uid}:`, err);
      }
    }
    results.users_hard_deleted = usersHardDeleted;

    // ── 4. Purge expired reset tokens (in-memory — log only) ─────
    // resetTokenStore is process-local; Vercel creates fresh instances,
    // so nothing to do here. Logged for visibility.
    results.note = "resetTokenStore is process-local; auto-expires.";

    console.log("[Cron/Cleanup] Completed:", results);
    return NextResponse.json({ success: true, results });

  } catch (err: any) {
    console.error("[Cron/Cleanup] Failed:", err?.message);
    return NextResponse.json({ error: "Cleanup failed", detail: err?.message }, { status: 500 });
  }
}