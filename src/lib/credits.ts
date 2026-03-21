// src/lib/credits.ts
// Centralised credit management. All deductions go through here.
// Low-balance and zero-balance alerts are fired here automatically.

import { query } from "@/config/db";

// ── Cost map — from plans_prices project file ─────────────────
const DEEP_TOOLS  = new Set(["webscan","web-scanner","cloudscan","cloud-security","exploit","sniper","sqlmap","xss"]);
const LIGHT_TOOLS = new Set(["portscan","networkscan","network-scanner","discovery","asset-discovery","subdomain"]);

export const SCAN_COSTS = {
  normal:     0.5,
  light:      1.0,
  deep:       2.0,
  ai_summary: 5.0,
} as const;

export function getScanCost(toolId: string): number {
  const t = toolId.toLowerCase();
  if (DEEP_TOOLS.has(t))  return SCAN_COSTS.deep;
  if (LIGHT_TOOLS.has(t)) return SCAN_COSTS.light;
  return SCAN_COSTS.normal;
}

// Low-balance alert thresholds
const LOW_BALANCE_THRESHOLD = 25; // Send alert when balance drops below ₹25

// ── Wallet init ───────────────────────────────────────────────

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

// ── Atomic credit deduction ───────────────────────────────────

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
      `WITH locked AS (
         SELECT balance FROM user_credits WHERE user_uid = $1 FOR UPDATE
       ),
       updated AS (
         UPDATE user_credits
         SET balance     = balance - $2,
             total_spent = total_spent + $2,
             updated_at  = NOW()
         WHERE user_uid = $1 AND balance >= $2
         RETURNING balance
       )
       SELECT
         (SELECT balance FROM locked)  AS old_balance,
         (SELECT balance FROM updated) AS new_balance`,
      [uid, amount],
    );

    const row = result.rows[0];
    if (row.new_balance === null) {
      return { success: false, error: "Insufficient credits" };
    }

    const balanceAfter = parseFloat(row.new_balance);

    // Append to credit ledger
    await query(
      `INSERT INTO credit_transactions
         (user_uid, type, amount, balance_after, description, ref_type, ref_id, tool_id)
       VALUES ($1, 'debit', $2, $3, $4, $5, $6, $7)`,
      [uid, amount, balanceAfter, description, refType, refId, toolId ?? null],
    );

    // Fire low-balance or exhausted email asynchronously
    if (balanceAfter === 0 || balanceAfter < LOW_BALANCE_THRESHOLD) {
      // Lazy import to avoid circular dependency at module load time
      import("@/lib/email").then(({ sendEmail }) =>
        import("@/lib/email-templates").then(({ lowCreditsEmail, creditsExhaustedEmail }) =>
          query(`SELECT email, first_name FROM users WHERE uid = $1`, [uid]).then((r) => {
            const userEmail = r.rows[0]?.email;
            const firstName = r.rows[0]?.first_name || "there";
            if (!userEmail) return;

            if (balanceAfter === 0) {
              sendEmail(
                userEmail,
                "Wallet Balance Exhausted \u2014 Scanning Paused",
                creditsExhaustedEmail(firstName),
              ).catch(console.error);
            } else {
              sendEmail(
                userEmail,
                "Low Wallet Balance \u2014 Pentellia",
                lowCreditsEmail(firstName, balanceAfter, 25),
              ).catch(console.error);
            }
          }),
        ),
      ).catch(console.error);
    }

    return { success: true, balanceAfter };
  } catch (err) {
    console.error("[Credits] deductCredits error:", err);
    return { success: false, error: "Credit deduction failed" };
  }
}

// ── Credit addition ───────────────────────────────────────────

export async function addCredits(
  uid:          string,
  amount:       number,
  description:  string,
  paymentId:    string,
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

  const wallet = await getOrCreateWallet(uid);
  const balanceAfter = parseFloat(wallet.balance);

  await query(
    `INSERT INTO credit_transactions
       (user_uid, type, amount, balance_after, description, ref_type, ref_id)
     VALUES ($1, 'credit', $2, $3, $4, 'purchase', $5)`,
    [uid, amount, balanceAfter, description, paymentId],
  );

  return balanceAfter;
}