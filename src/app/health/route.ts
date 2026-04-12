// src/app/api/health/route.ts
// Used by uptime monitors (UptimeRobot, Better Uptime, etc.)
// Returns 200 only when DB is reachable. Returns 503 on failure.
// Does NOT require authentication — public endpoint.
import { NextResponse } from "next/server";
import { query } from "@/config/db";

let lastAlertAt = 0; // prevent alert spam

export async function GET() {
  const start = Date.now();

  try {
    // Lightweight DB ping — uses system_health table created in migration
    await query(`INSERT INTO system_health (checked_at) VALUES (NOW())`);

    // Prune old rows (keep last 100) to avoid table growth
    await query(`DELETE FROM system_health WHERE id NOT IN (SELECT id FROM system_health ORDER BY id DESC LIMIT 100)`);

    const dbMs = Date.now() - start;

    return NextResponse.json({
      status:    "ok",
      db:        "connected",
      db_ms:     dbMs,
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version || "1.0.0",
    });
  } catch (err: any) {
    // Alert via notification if DB has been down for > 5 min
    const now = Date.now();
    if (now - lastAlertAt > 5 * 60_000) {
      lastAlertAt = now;
      // Log to stdout for server-side monitoring tools
      process.stderr.write(`[HEALTH] DB DOWN at ${new Date().toISOString()}: ${err?.message}\n`);
    }

    return NextResponse.json(
      {
        status:    "error",
        db:        "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
