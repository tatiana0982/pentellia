// src/app/api/dashboard/init/route.ts
// Phase 3: Removed domains count. Added subscription + usage summary.

import { NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";
import { getActiveSubscription, getUsageSummary } from "@/lib/subscription";

export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [statsRes, notiRes, userRes, sub, usageSummary] = await Promise.all([
      query(
        `WITH sc AS (
           SELECT
             COUNT(*)                                                           AS total,
             COUNT(*) FILTER (WHERE status IN ('running','queued'))             AS active,
             COUNT(*) FILTER (WHERE status='failed'
                              AND   created_at > NOW()-INTERVAL '24h')         AS failed,
             COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '7d')          AS this_week,
             COUNT(*) FILTER (WHERE created_at BETWEEN
                                NOW()-INTERVAL '14d' AND NOW()-INTERVAL '7d')  AS prev_week
           FROM scans WHERE user_uid=$1 AND deleted_at IS NULL
         )
         SELECT sc.*,
           -- Risk distribution (from completed scans)
           (SELECT jsonb_agg(x) FROM (
             SELECT
               CASE WHEN (result->>'riskScore')::int >= 80 THEN 'Critical'
                    WHEN (result->>'riskScore')::int >= 60 THEN 'High'
                    WHEN (result->>'riskScore')::int >= 40 THEN 'Medium'
                    ELSE 'Low' END AS name,
               COUNT(*) AS value
             FROM scans
             WHERE user_uid=$1 AND status='completed' AND deleted_at IS NULL
               AND result IS NOT NULL AND result->>'riskScore' IS NOT NULL
             GROUP BY 1
           ) x) AS risk_distribution,
           -- Weekly scan trend (last 8 weeks)
           (SELECT jsonb_agg(w ORDER BY w.week) FROM (
             SELECT TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') AS week,
                    COUNT(*) AS scans
             FROM scans
             WHERE user_uid=$1 AND deleted_at IS NULL
               AND created_at > NOW()-INTERVAL '8 weeks'
             GROUP BY DATE_TRUNC('week', created_at)
           ) w) AS exposure_trend
         FROM sc`,
        [uid],
      ),
      query(
        `SELECT COUNT(*) AS unread FROM notifications
         WHERE user_uid=$1 AND is_read=FALSE`,
        [uid],
      ),
      query(
        `SELECT first_name, last_name, email FROM users WHERE uid=$1 LIMIT 1`,
        [uid],
      ),
      getActiveSubscription(uid),
      getUsageSummary(uid),
    ]);

    const stats = statsRes.rows[0] ?? {};
    const user  = userRes.rows[0]  ?? {};

    const thisWeekScans  = parseInt(stats.this_week  ?? "0");
    const prevWeekScans  = parseInt(stats.prev_week  ?? "0");
    const scanTrend      = prevWeekScans === 0
      ? null
      : Math.round(((thisWeekScans - prevWeekScans) / prevWeekScans) * 100);

    return NextResponse.json({
      success: true,
      stats: {
        totalScans:   parseInt(stats.total  ?? "0"),
        activeScans:  parseInt(stats.active ?? "0"),
        failedScans:  parseInt(stats.failed ?? "0"),
        weeklyScans:  thisWeekScans,
        scanTrend,
        riskDistribution: stats.risk_distribution ?? [],
        exposureTrend:    stats.exposure_trend    ?? [],
      },
      // Subscription replaces old wallet/domain data
      subscription: sub ? {
        planId:    sub.plan_id,
        planName:  sub.plan.name,
        status:    sub.status,
        expiresAt: sub.expires_at,
        daysLeft:  usageSummary?.daysLeft ?? 0,
      } : null,
      usage: usageSummary?.usage ?? null,
      unreadNotifications: parseInt(notiRes.rows[0]?.unread || "0"),
      user: {
        firstName: user.first_name || "",
        lastName:  user.last_name  || "",
        email:     user.email      || "",
      },
    });
  } catch (err: any) {
    console.error("[DashboardInit]", err?.message);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}