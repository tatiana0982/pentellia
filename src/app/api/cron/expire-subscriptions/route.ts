// src/app/api/cron/expire-subscriptions/route.ts
// Runs every 30 min via Vercel Cron.
// Marks subscriptions with expires_at < NOW() as 'expired'.
// This is belt-and-suspenders: getActiveSubscription already filters by
// expires_at > NOW(), but status='expired' makes DB queries/reporting clean.
// Also applies any pending downgrades that are now due.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Mark expired subscriptions ────────────────────────────
    const expired = await query(
      `UPDATE user_subscriptions
       SET status = 'expired'
       WHERE status = 'active'
         AND expires_at < NOW()
         AND pending_plan_id IS NULL   -- don't touch rows with pending downgrade
       RETURNING user_uid`,
    );
    const expiredCount = expired.rowCount ?? 0;

    // ── 2. Apply pending downgrades for expired subscriptions ─────
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    const downgrades = await query(
      `UPDATE user_subscriptions SET
         plan_id         = pending_plan_id,
         status          = 'active',
         started_at      = NOW(),
         expires_at      = $1,
         pending_plan_id = NULL,
         pending_plan_at = NULL
       WHERE pending_plan_id IS NOT NULL
         AND expires_at <= NOW()
       RETURNING user_uid, plan_id`,
      [newExpiry],
    );
    const downgradeCount = downgrades.rowCount ?? 0;

    // Reset usage for each downgraded user
    for (const row of downgrades.rows) {
      await query(
        `INSERT INTO usage_tracking
           (user_uid, period_start, period_end, deep_scans_used, light_scans_used, reports_used)
         VALUES ($1, NOW(), $2, 0, 0, 0)
         ON CONFLICT (user_uid, period_start) DO UPDATE SET
           deep_scans_used = 0, light_scans_used = 0, reports_used = 0, updated_at = NOW()`,
        [row.user_uid, newExpiry],
      );
    }

    const results = { expired: expiredCount, downgrades_applied: downgradeCount };
    if (expiredCount > 0 || downgradeCount > 0) {
      console.log("[Cron/ExpireSubs]", results);
    }
    return NextResponse.json({ success: true, results });

  } catch (err: any) {
    console.error("[Cron/ExpireSubs] Failed:", err?.message);
    return NextResponse.json({ error: "Failed", detail: err?.message }, { status: 500 });
  }
}