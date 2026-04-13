// src/app/api/cron/maintenance/route.ts
// Runs daily at 02:00 UTC via Vercel Cron.
// Combines: OTP cleanup, daily_usage purge, subscription expiry,
// pending downgrade application, and account hard-deletion.
// Single route = stays within Vercel Hobby plan (2 cron max).

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number | string> = {};

  try {
    // ── 1. Purge expired / used OTPs ──────────────────────────────
    const otp = await query(
      `DELETE FROM otp_store WHERE used = TRUE OR expires_at < NOW() - INTERVAL '1 hour'`,
    );
    results.otp_purged = otp.rowCount ?? 0;

    // ── 2. Purge old daily_usage (keep 90 days) ──────────────────
    const du = await query(
      `DELETE FROM daily_usage WHERE date < CURRENT_DATE - INTERVAL '90 days'`,
    );
    results.daily_usage_purged = du.rowCount ?? 0;

    // ── 3. Mark expired subscriptions ────────────────────────────
    const expired = await query(
      `UPDATE user_subscriptions SET status = 'expired'
       WHERE status = 'active' AND expires_at < NOW() AND pending_plan_id IS NULL
       RETURNING user_uid`,
    );
    results.subscriptions_expired = expired.rowCount ?? 0;

    // ── 4. Apply pending downgrades ───────────────────────────────
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    const downgrades = await query(
      `UPDATE user_subscriptions SET
         plan_id = pending_plan_id, status = 'active',
         started_at = NOW(), expires_at = $1,
         pending_plan_id = NULL
       WHERE pending_plan_id IS NOT NULL AND expires_at <= NOW()
       RETURNING user_uid`,
      [newExpiry],
    );
    results.downgrades_applied = downgrades.rowCount ?? 0;

    // Reset usage for each downgraded user
    for (const row of downgrades.rows) {
      await query(
        `INSERT INTO usage_tracking (user_uid, period_start, period_end, deep_scans_used, light_scans_used, reports_used)
         VALUES ($1, NOW(), $2, 0, 0, 0)
         ON CONFLICT (user_uid, period_start) DO UPDATE SET
           deep_scans_used = 0, light_scans_used = 0, reports_used = 0, updated_at = NOW()`,
        [row.user_uid, newExpiry],
      );
    }

    // ── 5. Hard-delete accounts marked 30+ days ago ──────────────
    const deletable = await query(
      `SELECT uid FROM users WHERE deletion_requested_at < NOW() - INTERVAL '30 days'`,
    );
    let hardDeleted = 0;
    for (const row of deletable.rows) {
      const uid = row.uid;
      try {
        await query("BEGIN");
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
        await query(`DELETE FROM users              WHERE uid      = $1`, [uid]);
        await query("COMMIT");
        hardDeleted++;
      } catch (e) {
        await query("ROLLBACK");
        console.error(`[Cron/Maintenance] Hard delete failed uid=${uid}:`, e);
      }
    }
    results.accounts_purged = hardDeleted;
    return NextResponse.json({ success: true, results });

  } catch (err: any) {
    console.error("[Cron/Maintenance] Failed:", err?.message);
    return NextResponse.json({ error: "Maintenance failed", detail: err?.message }, { status: 500 });
  }
}