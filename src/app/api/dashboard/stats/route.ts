import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";

async function getUid() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. TOTAL ASSETS
    const assetsCountRes = await query(
      `SELECT COUNT(*) FROM assets WHERE user_uid = $1`,
      [uid],
    );
    const totalAssets = parseInt(assetsCountRes.rows[0].count || "0");

    // 2. TOTAL SCANS
    const totalScansRes = await query(
      `SELECT COUNT(*) FROM scans WHERE user_uid = $1`,
      [uid],
    );
    const totalScans = parseInt(totalScansRes.rows[0].count || "0");

    // 3. ACTIVE SCANS
    const activeScansRes = await query(
      `SELECT COUNT(*) FROM scans WHERE user_uid = $1 AND status IN ('running', 'queued')`,
      [uid],
    );
    const activeScans = parseInt(activeScansRes.rows[0].count || "0");

    // 4. FAILED SCANS (Last 24h)
    const failedScansRes = await query(
      `SELECT COUNT(*) FROM scans WHERE user_uid = $1 AND status = 'failed' AND created_at > NOW() - INTERVAL '24 HOURS'`,
      [uid],
    );
    const failedScans24h = parseInt(failedScansRes.rows[0].count || "0");

    // 5. RECENT SCANS LIST (Rich Data)
    const recentScansRes = await query(
      `
      SELECT s.id, s.target, s.status, s.created_at, s.result, t.name as tool_name, t.id as tool_id
      FROM scans s 
      LEFT JOIN tools t ON s.tool_id = t.id
      WHERE s.user_uid = $1 
      ORDER BY s.created_at DESC 
      LIMIT 7
    `,
      [uid],
    );

    // 6. CHART: SCANS PER DAY (7 Days)
    const scansTrendRes = await query(
      `
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM scans
      WHERE user_uid = $1 AND created_at > NOW() - INTERVAL '7 DAYS'
      GROUP BY date
      ORDER BY date ASC
    `,
      [uid],
    );

    const exposureTrend = scansTrendRes.rows.map((row) => ({
      date: row.date,
      scans: parseInt(row.count),
    }));

    // 7. CHART: FINDINGS BREAKDOWN (Simulated from recent results if 'findings' table doesn't exist)
    // We iterate over the recent scans to aggregate findings for a "Live Risk Overview"
    let riskDistribution = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

    recentScansRes.rows.forEach((scan) => {
      if (scan.result && scan.result.summary) {
        riskDistribution.critical += scan.result.summary.critical || 0;
        riskDistribution.high += scan.result.summary.high || 0;
        riskDistribution.medium += scan.result.summary.medium || 0;
        riskDistribution.low += scan.result.summary.low || 0;
        riskDistribution.info += scan.result.summary.info || 0;
      }
    });

    return NextResponse.json({
      success: true,
      kpi: {
        totalAssets,
        totalScans,
        activeScans,
        failedScans24h,
        openCritical: riskDistribution.critical, // Real data from recent JSONs
        openHigh: riskDistribution.high,
      },
      charts: {
        exposureTrend,
        riskDistribution: [
          {
            name: "Critical",
            value: riskDistribution.critical,
            fill: "#ef4444",
          },
          { name: "High", value: riskDistribution.high, fill: "#f97316" },
          { name: "Medium", value: riskDistribution.medium, fill: "#eab308" },
          { name: "Low", value: riskDistribution.low, fill: "#3b82f6" },
        ],
      },
      recentScans: recentScansRes.rows.map((s) => ({
        ...s,
        // Extract a mini summary for the UI list
        risk_score: s.result?.summary?.risk_score || 0,
        finding_count: s.result?.summary?.total_findings || 0,
      })),
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
