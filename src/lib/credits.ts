// src/lib/credits.ts
// ── SINGLE SOURCE OF TRUTH FOR BILLING ────────────────────────────────
//
// ALL prices come from the `pricing_rates` table in PostgreSQL.
// There are NO hardcoded prices anywhere in this file.
// The pricing_rates table contains:
//   deep_op      ₹250  per deep scan operation
//   light_op     ₹170  per light scan operation
//   report       ₹100  per report generation
//   ai_summary   ₹100  per AI executive summary
//   token_input  ₹180  per 1M input tokens
//   token_output ₹250  per 1M output tokens
//
// Tool categorisation (deep vs light) is driven by the tool's `category`
// column in the `tools` table — NOT a hardcoded slug list.
//
// DEEP categories  → charges deep_op rate
// LIGHT categories → charges light_op rate

import { query } from "@/config/db";

// ── Tool category → rate_key mapping ─────────────────────────────────
// Based on the tools table `category` column values.
// Any category not listed here defaults to light_op.
const DEEP_CATEGORIES = new Set([
  "web",
  "vulnerability",
  "exploit",
  "injection",
  "composite",  // Web/Cloud security suites — multi-tool, high intensity
  "cloud",
]);

const LIGHT_CATEGORIES = new Set([
  "network",
  "reconnaissance",
  "auth",
  "cms",
  "intelligence",
]);

export type RateKey =
  | "deep_op"
  | "light_op"
  | "report"
  | "ai_summary"
  | "token_input"
  | "token_output";

// ── Fetch a single rate from DB ───────────────────────────────────────
// Throws if the rate key is not found and no fallback provided.
export async function getRate(rateKey: RateKey): Promise<number> {
  const res = await query(
    `SELECT rate_inr::float AS rate
     FROM pricing_rates
     WHERE rate_key = $1 AND is_active = TRUE
     LIMIT 1`,
    [rateKey],
  );
  if (!res.rows.length) {
    throw new Error(`[Credits] Rate key "${rateKey}" not found in pricing_rates table`);
  }
  return parseFloat(res.rows[0].rate);
}

// ── Fetch all active rates at once (for bulk use) ─────────────────────
export async function getAllRates(): Promise<Record<RateKey, number>> {
  const res = await query(
    `SELECT rate_key, rate_inr::float AS rate_inr
     FROM pricing_rates WHERE is_active = TRUE`,
  );
  const map: Partial<Record<RateKey, number>> = {};
  for (const row of res.rows) {
    map[row.rate_key as RateKey] = parseFloat(row.rate_inr);
  }
  return map as Record<RateKey, number>;
}

// ── Determine the rate_key for a given tool ───────────────────────────
// Looks up the tool's category in the tools table.
// Falls back to "light_op" if the tool or category is unknown.
export async function getRateKeyForTool(toolId: string): Promise<RateKey> {
  const res = await query(
    `SELECT category FROM tools WHERE id = $1 LIMIT 1`,
    [toolId],
  );
  if (!res.rows.length) {
    console.warn(`[Credits] Tool "${toolId}" not found in tools table — defaulting to light_op`);
    return "light_op";
  }
  const category = (res.rows[0].category as string).toLowerCase().trim();
  if (DEEP_CATEGORIES.has(category))  return "deep_op";
  if (LIGHT_CATEGORIES.has(category)) return "light_op";
  // Unknown category — log and default to light
  console.warn(`[Credits] Unknown category "${category}" for tool "${toolId}" — defaulting to light_op`);
  return "light_op";
}

// ── Get the INR cost for a scan tool (DB lookup, no hardcoding) ────────
export async function getScanCostFromDB(toolId: string): Promise<{ rateKey: RateKey; amount: number }> {
  const rateKey = await getRateKeyForTool(toolId);
  const amount  = await getRate(rateKey);
  return { rateKey, amount };
}

// ── Wallet initialisation ─────────────────────────────────────────────
export async function getOrCreateWallet(uid: string) {
  const res = await query(
    `INSERT INTO user_credits (user_uid, balance, total_bought, total_spent)
     VALUES ($1, 0, 0, 0)
     ON CONFLICT (user_uid) DO UPDATE SET user_uid = EXCLUDED.user_uid
     RETURNING *`,
    [uid],
  );
  return res.rows[0];
}

export async function getBalance(uid: string): Promise<number> {
  const res = await query(
    `SELECT COALESCE(balance, 0) AS balance FROM user_credits WHERE user_uid = $1`,
    [uid],
  );
  return res.rows.length > 0 ? parseFloat(res.rows[0].balance) : 0;
}

// ── Atomic credit deduction ───────────────────────────────────────────
// Uses a single UPDATE WHERE balance >= amount — truly atomic, no race condition.
// Logs to credit_transactions immediately before returning.
export async function deductCredits(
  uid:         string,
  amount:      number,
  description: string,
  refType:     string,
  refId:       string,
  toolId?:     string,
): Promise<{ success: boolean; balanceAfter?: number; error?: string }> {
  try {
    const result = await query(
      `UPDATE user_credits
       SET balance     = balance - $1,
           total_spent = total_spent + $1,
           updated_at  = NOW()
       WHERE user_uid = $2 AND balance >= $1
       RETURNING balance`,
      [amount, uid],
    );

    if (!result.rows.length) {
      // Fetch actual balance for a meaningful error message
      const balRes = await query(
        `SELECT COALESCE(balance, 0) AS b FROM user_credits WHERE user_uid = $1`,
        [uid],
      );
      const current = parseFloat(balRes.rows[0]?.b ?? "0");
      return {
        success: false,
        error:   `Insufficient credits. Required: ₹${amount.toFixed(2)}, Available: ₹${current.toFixed(2)}.`,
      };
    }

    const balanceAfter = parseFloat(result.rows[0].balance);

    // Append to immutable credit ledger
    await query(
      `INSERT INTO credit_transactions
         (user_uid, type, amount, balance_after, description, ref_type, ref_id, tool_id)
       VALUES ($1, 'debit', $2, $3, $4, $5, $6, $7)`,
      [uid, amount, balanceAfter, description, refType, refId, toolId ?? null],
    );

    // Fire low-balance alert asynchronously — never blocks the response
    if (balanceAfter < 500) {
      import("@/lib/notifications").then(({ checkBalanceAndNotify }) =>
        checkBalanceAndNotify(uid).catch(() => {}),
      ).catch(() => {});
    }

    return { success: true, balanceAfter };
  } catch (err) {
    console.error("[Credits] deductCredits error:", err);
    return { success: false, error: "Credit deduction failed" };
  }
}

// ── Check if a scan has already been charged ──────────────────────────
// Prevents double-deduction when the completion handler is called more than once.
export async function isScanAlreadyCharged(scanId: string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM credit_transactions
     WHERE ref_id = $1 AND ref_type = 'scan'
     LIMIT 1`,
    [scanId],
  );
  return res.rows.length > 0;
}

// ── Check if a report has already been charged ────────────────────────
export async function isReportAlreadyCharged(scanId: string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM credit_transactions
     WHERE ref_id = $1 AND ref_type = 'report'
     LIMIT 1`,
    [scanId],
  );
  return res.rows.length > 0;
}

// ── Credit addition (used by payment routes) ──────────────────────────
export async function addCredits(
  uid:         string,
  amount:      number,
  description: string,
  paymentId:   string,
): Promise<number> {
  await query(
    `INSERT INTO user_credits (user_uid, balance, total_bought, total_spent)
     VALUES ($1, $2, $2, 0)
     ON CONFLICT (user_uid) DO UPDATE SET
       balance      = user_credits.balance + $2,
       total_bought = user_credits.total_bought + $2,
       updated_at   = NOW()`,
    [uid, amount],
  );

  const wallet       = await getOrCreateWallet(uid);
  const balanceAfter = parseFloat(wallet.balance);

  await query(
    `INSERT INTO credit_transactions
       (user_uid, type, amount, balance_after, description, ref_type, ref_id)
     VALUES ($1, 'credit', $2, $3, $4, 'purchase', $5)`,
    [uid, amount, balanceAfter, description, paymentId],
  );

  return balanceAfter;
}