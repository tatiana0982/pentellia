// src/app/api/pricing/rates/route.ts
// Public endpoint — returns current per-unit pricing rates from DB.
// The frontend calculator fetches this on mount so rates are always in sync
// with the server, never hardcoded client-side.
// No auth required (rates are public knowledge).

import { NextResponse } from "next/server";
import { query } from "@/config/db";

// Fallback rates (used if DB is unreachable) — must match migration seed
const FALLBACK_RATES = {
  deep_op:      250,
  light_op:     170,
  report:       100,
  token_input:  0.000180,
  token_output: 0.000250,
  minimum_inr:  6500,
};

export async function GET() {
  try {
    const res = await query(
      `SELECT rate_key, rate_inr::float AS rate_inr, unit_label, description
       FROM pricing_rates
       WHERE is_active = TRUE
       ORDER BY rate_key`,
    );

    // Build a flat object keyed by rate_key
    const rates: Record<string, number> = {};
    for (const row of res.rows) {
      rates[row.rate_key] = parseFloat(row.rate_inr);
    }

    // Always include the minimum floor (not stored per-row — it's a constant)
    rates["minimum_inr"] = 6500;

    const response = NextResponse.json({
      success: true,
      rates,
      rows:    res.rows,
    });

    // Cache for 5 minutes — rates rarely change, but not forever
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return response;
  } catch (err: any) {
    console.error("[PricingRates]", err?.message);

    // Return fallback so the calculator still works even if DB is down
    return NextResponse.json(
      {
        success:  false,
        rates:    FALLBACK_RATES,
        rows:     [],
        fallback: true,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}