// src/lib/notifications.ts
// Central notification hub — writes to DB and sends transactional email.
// Also handles low-balance and empty-balance platform events.

import { query } from "@/config/db";
import { sendEmail } from "@/lib/email";
import { generalNotificationEmail, lowCreditsEmail, creditsExhaustedEmail } from "@/lib/email-templates";

/**
 * Create a notification entry in DB and optionally fire a transactional email.
 * Fire-and-forget — never awaited internally.
 */
export async function createNotification(
  uid: string,
  title: string,
  message: string,
  type: "info" | "success" | "error" | "warning" = "info",
) {
  try {
    // 1. Write to notifications table
    await query(
      `INSERT INTO notifications (user_uid, title, message, type) VALUES ($1, $2, $3, $4)`,
      [uid, title, message, type],
    );

    // 2. Fetch user for email (only if needed)
    const userRes = await query(
      `SELECT email, first_name FROM users WHERE uid = $1`,
      [uid],
    );

    if (userRes.rows.length > 0) {
      const user      = userRes.rows[0];
      const firstName = user.first_name || "there";

      sendEmail(
        user.email,
        title,
        generalNotificationEmail(
          firstName,
          title,
          message,
          "Open Dashboard",
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        ),
      ).catch((err) => console.error("[Notification Email]", err));
    }
  } catch (err) {
    console.error("[createNotification]", err);
  }
}

/**
 * Check the user's balance after a credit deduction and fire low/empty
 * notification + email if relevant thresholds are crossed.
 *
 * Call this AFTER every credit deduction (scans, AI summary, etc.)
 */
export async function checkBalanceAndNotify(uid: string): Promise<void> {
  try {
    const res = await query(
      `SELECT
         COALESCE(uc.balance, 0) AS balance,
         u.first_name,
         u.email
       FROM users u
       LEFT JOIN user_credits uc ON uc.user_uid = u.uid
       WHERE u.uid = $1`,
      [uid],
    );

    if (!res.rows.length) return;

    const { balance: rawBalance, first_name, email } = res.rows[0];
    const balance  = parseFloat(rawBalance ?? "0");
    const firstName = first_name || "there";

    // ── Already notified within last hour? (prevent spam) ─────────────
    const recentCheck = await query(
      `SELECT id FROM notifications
       WHERE user_uid = $1
         AND type = 'warning'
         AND title ILIKE '%balance%'
         AND created_at > NOW() - INTERVAL '1 hour'
       LIMIT 1`,
      [uid],
    );

    if (recentCheck.rows.length > 0) return; // Already notified recently

    if (balance === 0) {
      // Wallet empty — critical alert
      await createNotification(
        uid,
        "⚠ Wallet Empty — Scanning Paused",
        "Your wallet has run out of credits. All scan operations are paused. Top up your wallet to resume security assessments.",
        "error",
      );

      // Send dedicated empty-balance email
      sendEmail(
        email,
        "Pentellia: Your Wallet is Empty — Action Required",
        creditsExhaustedEmail(firstName),
      ).catch(() => {});

    } else if (balance < 5) {
      // Low balance — urgent warning
      const pct = 5; // threshold %
      await createNotification(
        uid,
        "Low Balance Warning — ₹" + balance.toFixed(2) + " Remaining",
        `Your wallet balance is critically low. You have approximately ${Math.floor(balance / 0.5)} normal scans remaining. Top up now to avoid interruption.`,
        "warning",
      );

      sendEmail(
        email,
        "Pentellia: Low Wallet Balance — ₹" + balance.toFixed(2),
        lowCreditsEmail(firstName, balance, pct),
      ).catch(() => {});

    } else if (balance < 20) {
      // Moderate low — softer warning
      await createNotification(
        uid,
        "Balance Running Low — ₹" + balance.toFixed(2),
        `Your wallet balance is getting low. Consider topping up to ensure uninterrupted scanning.`,
        "warning",
      );
    }
  } catch (err) {
    console.error("[checkBalanceAndNotify]", err);
  }
}

/**
 * Atomic credit deduction helper — deducts credits, validates balance,
 * logs transaction, and triggers balance notifications.
 *
 * @returns The new balance after deduction, or throws ApiError if insufficient.
 */
export async function deductCredits(
  uid: string,
  cost: number,
  description: string,
  refType: string,
  refId?: string,
): Promise<number> {
  // Atomic deduction — only succeeds if balance >= cost
  const deducted = await query(
    `UPDATE user_credits
     SET balance      = balance - $1,
         total_spent  = total_spent + $1,
         updated_at   = NOW()
     WHERE user_uid = $2 AND balance >= $1
     RETURNING balance`,
    [cost, uid],
  );

  if (!deducted.rows.length) {
    // Fetch current balance for a useful error message
    const bal = await query(`SELECT COALESCE(balance,0) AS b FROM user_credits WHERE user_uid=$1`, [uid]);
    const current = parseFloat(bal.rows[0]?.b ?? "0");
    throw Object.assign(new Error(
      `Insufficient credits. Required: ₹${cost.toFixed(2)}, Available: ₹${current.toFixed(2)}. Please top up your wallet.`
    ), { statusCode: 402 });
  }

  const balanceAfter = parseFloat(deducted.rows[0].balance);

  // Log transaction (non-blocking)
  query(
    `INSERT INTO credit_transactions
       (user_uid, type, amount, balance_after, description, ref_type, ref_id)
     VALUES ($1, 'debit', $2, $3, $4, $5, $6)`,
    [uid, cost, balanceAfter, description, refType, refId ?? null],
  ).catch(() => {});

  // Check and notify on low/empty balance (non-blocking)
  checkBalanceAndNotify(uid).catch(() => {});

  return balanceAfter;
}