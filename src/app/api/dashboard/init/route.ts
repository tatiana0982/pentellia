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
           SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE status IN ('running','queued')) AS active,
                  COUNT(*) FILTER (WHERE status='failed' AND created_at > NOW()-INTERVAL '24h') AS failed
           FROM scans WHERE user_uid=$1 AND deleted_at IS NULL
         ),
         ac AS (SELECT COUNT(*) AS total FROM assets WHERE user_uid=$1 AND deleted_at IS NULL),
         rc AS (
           SELECT s.id, s.target, s.status, s.created_at, s.tool_id,
                  COALESCE(t.name, s.tool_id) AS tool_name,
                  COALESCE((s.result->'summary'->>'risk_score')::numeric,
                            (s.result->>'riskScore')::numeric, 0)         AS risk_score,
                  COALESCE((s.result->'summary'->>'total_findings')::int, 0) AS finding_count
           FROM scans s LEFT JOIN tools t ON s.tool_id = t.id
           WHERE s.user_uid=$1 AND s.deleted_at IS NULL
           ORDER BY s.created_at DESC LIMIT 7
         ),
         tr AS (
           SELECT TO_CHAR(d::date,'YYYY-MM-DD') AS date,
                  COALESCE(s.cnt,0)::int         AS count
           FROM generate_series((NOW()-INTERVAL '6 days')::date, NOW()::date,'1 day'::interval) AS d
           LEFT JOIN (
             SELECT created_at::date AS day, COUNT(*) AS cnt
             FROM scans WHERE user_uid=$1 AND created_at > NOW()-INTERVAL '7d' AND deleted_at IS NULL
             GROUP BY day
           ) s ON s.day = d::date
           ORDER BY date
         ),
         pw AS (
           SELECT COUNT(*) AS count FROM scans
           WHERE user_uid=$1 AND created_at BETWEEN NOW()-INTERVAL '14d' AND NOW()-INTERVAL '7d'
             AND deleted_at IS NULL
         )
         SELECT
           (SELECT to_json(sc) FROM sc)    AS counts,
           (SELECT total FROM ac)          AS total_assets,
           (SELECT json_agg(rc) FROM rc)   AS recent_scans,
           (SELECT json_agg(tr) FROM tr)   AS trend,
           (SELECT count FROM pw)          AS prev_week_scans`,
        [uid],
      ),
      query(`SELECT COUNT(*) AS unread FROM notifications WHERE user_uid=$1 AND COALESCE(is_read,false)=FALSE`, [uid]),
      query(`SELECT first_name, last_name, email FROM users WHERE uid=$1 LIMIT 1`, [uid]),
      getActiveSubscription(uid),
      getUsageSummary(uid),
    ]);

    const counts        = statsRes.rows[0].counts ?? {};
    const recent        = statsRes.rows[0].recent_scans ?? [];
    const trend         = statsRes.rows[0].trend ?? [];
    const prevWeekScans = parseInt(statsRes.rows[0].prev_week_scans ?? "0");
    const user          = userRes.rows[0] ?? {};

    // Deduplicated findings: for each target+tool combo, only count the latest scan
    const seen = new Map<string, { crit: number; high: number; med: number; low: number; info: number }>();
    for (const s of recent) {
      if (s.status !== "completed") continue;
      const sm = s.result?.summary;
      if (!sm) continue;
      const key = `${(s.target||"").toLowerCase()}::${(s.tool_id||"unknown")}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        crit: Number(sm.critical) || 0, high: Number(sm.high)   || 0,
        med:  Number(sm.medium)   || 0, low:  Number(sm.low)    || 0,
        info: Number(sm.info)     || 0,
      });
    }
    let crit=0, high=0, med=0, low=0, info=0;
    for (const v of seen.values()) { crit+=v.crit; high+=v.high; med+=v.med; low+=v.low; info+=v.info; }

    const exposureTrend = trend.map((t: any) => ({ date: t.date, scans: parseInt(t.count) }));
    const thisWeekScans = exposureTrend.reduce((sum: number, d: any) => sum + d.scans, 0);

    return NextResponse.json({
      success: true,
      kpi: {
        totalScans:     parseInt(counts.total  || "0"),
        activeScans:    parseInt(counts.active || "0"),
        failedScans24h: parseInt(counts.failed || "0"),
        totalAssets:    parseInt(statsRes.rows[0].total_assets || "0"),
        openCritical:   crit,
        openHigh:       high,
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