// src/app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Single CTE replacing 7 sequential round-trips
    const res = await query(
      `WITH
        scan_counts AS (
          SELECT
            COUNT(*)                                                                             AS total_scans,
            COUNT(*) FILTER (WHERE status IN ('running','queued'))                               AS active_scans,
            COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24h')   AS failed_24h
          FROM scans WHERE user_uid = $1
        ),
        asset_count AS (
          SELECT COUNT(*) AS total_assets FROM assets WHERE user_uid = $1
        ),
        recent AS (
          SELECT s.id, s.target, s.status, s.created_at, s.result,
                 t.name  AS tool_name,
                 t.id    AS tool_id,
                 s.result->'summary'->>'risk_score'      AS risk_score_raw,
                 s.result->'summary'->>'total_findings'  AS finding_count_raw
          FROM scans s LEFT JOIN tools t ON s.tool_id = t.id
          WHERE s.user_uid = $1
          ORDER BY s.created_at DESC LIMIT 7
        ),
        trend AS (
          SELECT TO_CHAR(created_at,'YYYY-MM-DD') AS date, COUNT(*) AS count
          FROM scans
          WHERE user_uid = $1 AND created_at > NOW() - INTERVAL '7 days'
          GROUP BY date ORDER BY date
        )
      SELECT
        (SELECT to_json(scan_counts) FROM scan_counts)  AS counts,
        (SELECT total_assets        FROM asset_count)   AS total_assets,
        (SELECT json_agg(recent)    FROM recent)        AS recent_scans,
        (SELECT json_agg(trend)     FROM trend)         AS trend`,
      [uid],
    );

    const row         = res.rows[0];
    const counts      = row.counts ?? {};
    const recentRaw   = row.recent_scans ?? [];
    const trendRaw    = row.trend        ?? [];

    // Aggregate risk distribution from scan results
    let critical = 0, high = 0, medium = 0, low = 0, info = 0;
    for (const scan of recentRaw) {
      const s = scan.result?.summary;
      if (s) {
        critical += s.critical || 0;
        high     += s.high     || 0;
        medium   += s.medium   || 0;
        low      += s.low      || 0;
        info     += s.info     || 0;
      }
    }

    // Return the exact shape the dashboard page expects
    return NextResponse.json({
      success: true,
      kpi: {
        totalAssets:    parseInt(row.total_assets   || "0"),
        totalScans:     parseInt(counts.total_scans || "0"),
        activeScans:    parseInt(counts.active_scans|| "0"),
        failedScans24h: parseInt(counts.failed_24h  || "0"),
        openCritical:   critical,
        openHigh:       high,
      },
      charts: {
        exposureTrend: trendRaw.map((t: any) => ({
          date:  t.date,
          scans: parseInt(t.count),
        })),
        riskDistribution: [
          { name: "Critical", value: critical, fill: "#ef4444" },
          { name: "High",     value: high,     fill: "#f97316" },
          { name: "Medium",   value: medium,   fill: "#eab308" },
          { name: "Low",      value: low,      fill: "#3b82f6" },
        ],
      },
      recentScans: recentRaw.map((s: any) => ({
        ...s,
        risk_score:    s.risk_score_raw    ? parseFloat(s.risk_score_raw)    : 0,
        finding_count: s.finding_count_raw ? parseInt(s.finding_count_raw)   : 0,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}