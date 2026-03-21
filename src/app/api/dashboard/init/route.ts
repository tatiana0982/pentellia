// src/app/api/dashboard/init/route.ts
import { NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [statsRes, walletRes, domainsRes, notiRes, userRes] = await Promise.all([
      query(
        `WITH sc AS (
           SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE status IN ('running','queued')) AS active,
                  COUNT(*) FILTER (WHERE status='failed' AND created_at > NOW()-INTERVAL '24h') AS failed
           FROM scans WHERE user_uid=$1
         ),
         ac AS (SELECT COUNT(*) AS total FROM assets WHERE user_uid=$1),
         rc AS (
           SELECT s.id, s.target, s.status, s.created_at,
                  t.name AS tool_name, t.id AS tool_id,
                  s.result,
                  COALESCE((s.result->'summary'->>'risk_score')::numeric, 0)    AS risk_score,
                  COALESCE((s.result->'summary'->>'total_findings')::int, 0)    AS finding_count
           FROM scans s LEFT JOIN tools t ON s.tool_id=t.id
           WHERE s.user_uid=$1 ORDER BY s.created_at DESC LIMIT 7
         ),
         tr AS (
           SELECT TO_CHAR(created_at,'YYYY-MM-DD') AS date, COUNT(*) AS count
           FROM scans WHERE user_uid=$1 AND created_at>NOW()-INTERVAL '7d'
           GROUP BY date ORDER BY date
         )
         SELECT
           (SELECT to_json(sc) FROM sc)    AS counts,
           (SELECT total FROM ac)          AS total_assets,
           (SELECT json_agg(rc) FROM rc)   AS recent_scans,
           (SELECT json_agg(tr) FROM tr)   AS trend`,
        [uid],
      ),

      query(
        `SELECT COALESCE(balance,0) AS balance,
                COALESCE(total_spent,0) AS total_spent,
                COALESCE(total_bought,0) AS total_bought
         FROM (VALUES ($1::text)) u(uid)
         LEFT JOIN user_credits uc ON uc.user_uid=u.uid`,
        [uid],
      ),

      query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_verified=TRUE) AS verified
         FROM domains WHERE user_uid=$1`,
        [uid],
      ),

      query(
        `SELECT COUNT(*) AS unread
         FROM notifications
         WHERE user_uid=$1 AND COALESCE(is_read,false)=FALSE`,
        [uid],
      ),

      query(
        `SELECT first_name, last_name, email, company, role FROM users WHERE uid=$1`,
        [uid],
      ),
    ]);

    const counts  = statsRes.rows[0].counts ?? {};
    const recent  = statsRes.rows[0].recent_scans ?? [];
    const trend   = statsRes.rows[0].trend ?? [];
    const wallet  = walletRes.rows[0] ?? {};
    const domains = domainsRes.rows[0] ?? {};
    const user    = userRes.rows[0] ?? {};

    // Aggregate risk from the full result JSON (now returned by CTE)
    let crit = 0, high = 0, med = 0, low = 0;
    for (const s of recent) {
      // result is returned as parsed JSON by pg (jsonb column)
      const sm = s.result?.summary;
      if (sm) {
        crit += Number(sm.critical) || 0;
        high += Number(sm.high)     || 0;
        med  += Number(sm.medium)   || 0;
        low  += Number(sm.low)      || 0;
      }
    }

    return NextResponse.json({
      success: true,
      kpi: {
        totalAssets:    parseInt(statsRes.rows[0].total_assets || "0"),
        totalScans:     parseInt(counts.total  || "0"),
        activeScans:    parseInt(counts.active || "0"),
        failedScans24h: parseInt(counts.failed || "0"),
        openCritical:   crit,
        openHigh:       high,
      },
      charts: {
        exposureTrend:    trend.map((t: any) => ({ date: t.date, scans: parseInt(t.count) })),
        riskDistribution: [
          { name: "Critical", value: crit, fill: "#ef4444" },
          { name: "High",     value: high, fill: "#f97316" },
          { name: "Medium",   value: med,  fill: "#eab308" },
          { name: "Low",      value: low,  fill: "#3b82f6" },
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
      wallet: {
        balance:     parseFloat(wallet.balance      || "0"),
        totalSpent:  parseFloat(wallet.total_spent  || "0"),
        totalBought: parseFloat(wallet.total_bought || "0"),
      },
      domains: {
        total:    parseInt(domains.total    || "0"),
        verified: parseInt(domains.verified || "0"),
      },
      unreadNotifications: parseInt(notiRes.rows[0]?.unread || "0"),
      user: {
        firstName: user.first_name || "",
        lastName:  user.last_name  || "",
        email:     user.email      || "",
        company:   user.company    || "",
        role:      user.role       || "",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}