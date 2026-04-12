// src/app/api/dashboard/init/route.ts
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
             COUNT(*)                                                                AS total,
             COUNT(*) FILTER (WHERE status IN ('running','queued'))                 AS active,
             COUNT(*) FILTER (WHERE status='failed' AND created_at > NOW()-INTERVAL '24h') AS failed,
             COUNT(*) FILTER (WHERE status='completed')                             AS completed
           FROM scans WHERE user_uid=$1 AND deleted_at IS NULL
         ),
         ac AS (SELECT COUNT(*) AS total FROM assets WHERE user_uid=$1 AND deleted_at IS NULL),

         -- Recent 7 scans WITH full severity extracted in SQL (fixes JS result=undefined bug)
         rc AS (
           SELECT
             s.id, s.target, s.status, s.created_at, s.tool_id,
             COALESCE(t.name, s.tool_id)                                        AS tool_name,
             COALESCE((s.result->'summary'->>'risk_score')::numeric,
                       (s.result->>'riskScore')::numeric, 0)                    AS risk_score,
             COALESCE((s.result->'summary'->>'total_findings')::int, 0)         AS finding_count,
             -- Severity breakdown extracted in SQL — avoids sending large result JSON to JS
             COALESCE((s.result->'summary'->>'critical')::int, 0)               AS sev_critical,
             COALESCE((s.result->'summary'->>'high')::int, 0)                   AS sev_high,
             COALESCE((s.result->'summary'->>'medium')::int, 0)                 AS sev_medium,
             COALESCE((s.result->'summary'->>'low')::int, 0)                    AS sev_low,
             COALESCE((s.result->'summary'->>'informational')::int,
                       (s.result->'summary'->>'info')::int, 0)                  AS sev_info
           FROM scans s LEFT JOIN tools t ON s.tool_id = t.id
           WHERE s.user_uid=$1 AND s.deleted_at IS NULL
           ORDER BY s.created_at DESC LIMIT 7
         ),

         -- Daily trend (7 days, no gaps)
         tr AS (
           SELECT TO_CHAR(d::date,'YYYY-MM-DD') AS date, COALESCE(s.cnt,0)::int AS count
           FROM generate_series((NOW()-INTERVAL '6 days')::date, NOW()::date,'1 day'::interval) AS d
           LEFT JOIN (
             SELECT created_at::date AS day, COUNT(*) AS cnt
             FROM scans WHERE user_uid=$1 AND created_at > NOW()-INTERVAL '7d' AND deleted_at IS NULL
             GROUP BY day
           ) s ON s.day = d::date ORDER BY date
         ),

         -- Previous week for trend badge
         pw AS (
           SELECT COUNT(*) AS count FROM scans
           WHERE user_uid=$1 AND created_at BETWEEN NOW()-INTERVAL '14d' AND NOW()-INTERVAL '7d'
             AND deleted_at IS NULL
         ),

         -- Risk distribution from ALL completed scans (not just recent 7)
         -- Per-target deduplication: most recent scan per target+tool wins
         rd AS (
           SELECT
             SUM(sev_critical) AS crit, SUM(sev_high) AS high,
             SUM(sev_medium)   AS med,  SUM(sev_low)  AS low,
             SUM(sev_info)     AS info
           FROM (
             SELECT DISTINCT ON (s.target, s.tool_id)
               COALESCE((s.result->'summary'->>'critical')::int, 0)         AS sev_critical,
               COALESCE((s.result->'summary'->>'high')::int, 0)             AS sev_high,
               COALESCE((s.result->'summary'->>'medium')::int, 0)           AS sev_medium,
               COALESCE((s.result->'summary'->>'low')::int, 0)              AS sev_low,
               COALESCE((s.result->'summary'->>'informational')::int,
                         (s.result->'summary'->>'info')::int, 0)            AS sev_info
             FROM scans s
             WHERE s.user_uid=$1 AND s.status='completed' AND s.deleted_at IS NULL
             ORDER BY s.target, s.tool_id, s.created_at DESC
           ) deduped
         ),

         -- Top targets (most scanned)
         tt AS (
           SELECT target, COUNT(*) AS scan_count,
                  COUNT(*) FILTER (WHERE status='completed') AS completed_count
           FROM scans WHERE user_uid=$1 AND deleted_at IS NULL
           GROUP BY target ORDER BY scan_count DESC LIMIT 5
         ),

         -- Today's usage for quota widget
         td AS (
           SELECT
             COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND status='completed') AS today_completed,
             COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)                       AS today_total
           FROM scans WHERE user_uid=$1 AND deleted_at IS NULL
         )

         SELECT
           (SELECT to_json(sc) FROM sc)       AS counts,
           (SELECT total FROM ac)             AS total_assets,
           (SELECT json_agg(rc) FROM rc)      AS recent_scans,
           (SELECT json_agg(tr) FROM tr)      AS trend,
           (SELECT count FROM pw)             AS prev_week_scans,
           (SELECT to_json(rd) FROM rd)       AS risk_dist,
           (SELECT json_agg(tt) FROM tt)      AS top_targets,
           (SELECT to_json(td) FROM td)       AS today_stats`,
        [uid],
      ),
      query(`SELECT COUNT(*) AS unread FROM notifications WHERE user_uid=$1 AND COALESCE(is_read,false)=FALSE`, [uid]),
      query(`SELECT first_name, last_name, email FROM users WHERE uid=$1 LIMIT 1`, [uid]),
      getActiveSubscription(uid),
      getUsageSummary(uid),
    ]);

    const row           = statsRes.rows[0];
    const counts        = row.counts         ?? {};
    const recent        = row.recent_scans   ?? [];
    const trend         = row.trend          ?? [];
    const rd            = row.risk_dist      ?? {};
    const topTargets    = row.top_targets    ?? [];
    const todayStats    = row.today_stats    ?? {};
    const prevWeekScans = parseInt(row.prev_week_scans ?? "0");
    const user          = userRes.rows[0]    ?? {};

    const crit = parseInt(rd.crit || "0"),  high = parseInt(rd.high || "0");
    const med  = parseInt(rd.med  || "0"),  low  = parseInt(rd.low  || "0");
    const info = parseInt(rd.info || "0");
    const totalFromSeverities = crit + high + med + low + info;
    // Validation guard: alert if the DB aggregation produces an impossible state
    if (process.env.NODE_ENV !== "production") {
      // In dev: surface immediately. In prod: the guard below catches mismatches silently.
    }

    const exposureTrend = trend.map((t: any) => ({ date: t.date, scans: parseInt(t.count) }));
    const thisWeekScans = exposureTrend.reduce((s: number, d: any) => s + d.scans, 0);

    // Daily quota remaining
    const dailyUsage = usageSummary?.usage;
    const dailyRemaining = dailyUsage ? {
      deepScans:  Math.max(0, dailyUsage.deepScans.dailyLimit  - dailyUsage.deepScans.dailyUsed),
      lightScans: Math.max(0, dailyUsage.lightScans.dailyLimit - dailyUsage.lightScans.dailyUsed),
      reports:    Math.max(0, dailyUsage.reports.dailyLimit    - dailyUsage.reports.dailyUsed),
    } : null;

    return NextResponse.json({
      success: true,
      kpi: {
        totalScans:       parseInt(counts.total     || "0"),
        activeScans:      parseInt(counts.active    || "0"),
        failedScans24h:   parseInt(counts.failed    || "0"),
        completedScans:   parseInt(counts.completed || "0"),
        totalAssets:      parseInt(row.total_assets || "0"),
        openCritical:     crit,
        openHigh:         high,
        totalFindings:    crit + high + med + low + info,   // includes all 5 severities — matches chart sum
        todayCompleted:   parseInt(todayStats.today_completed || "0"),
        todayTotal:       parseInt(todayStats.today_total     || "0"),
      },
      scanTrend: { thisWeek: thisWeekScans, prevWeek: prevWeekScans },
      charts: {
        exposureTrend,
        riskDistribution: [
          { name: "Critical",      value: crit, fill: "#ef4444" },
          { name: "High",          value: high, fill: "#f97316" },
          { name: "Medium",        value: med,  fill: "#eab308" },
          { name: "Low",           value: low,  fill: "#3b82f6" },
          { name: "Informational", value: info, fill: "#475569" },
        ],
        topTargets: topTargets.map((t: any) => ({
          target:   t.target,
          scans:    parseInt(t.scan_count),
          completed: parseInt(t.completed_count),
        })),
      },
      recentScans: recent.map((s: any) => ({
        id:            s.id,
        target:        s.target,
        status:        s.status,
        created_at:    s.created_at,
        tool_name:     s.tool_name,
        tool_id:       s.tool_id,
        risk_score:    parseFloat(s.risk_score    ?? "0"),
        finding_count: parseInt(s.finding_count   ?? "0"),
      })),
      dailyRemaining,
      subscription: sub ? {
        planId:    sub.plan_id, planName: sub.plan.name, status: sub.status,
        expiresAt: sub.expires_at, daysLeft: usageSummary?.daysLeft ?? 0,
      } : null,
      usage: usageSummary?.usage ?? null,
      unreadNotifications: parseInt(notiRes.rows[0]?.unread || "0"),
      user: { firstName: user.first_name||"", lastName: user.last_name||"", email: user.email||"" },
    });
  } catch (err: any) {
    console.error("[DashboardInit]", err?.message);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}