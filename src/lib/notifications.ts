// src/lib/notifications.ts
// Central notification hub — writes to DB and sends transactional email.
// Also handles low-balance and empty-balance platform events.

import { query } from "@/config/db";
import { sendEmail } from "@/lib/email";
import { generalNotificationEmail, lowCreditsEmail, creditsExhaustedEmail } from "@/lib/email-templates";

/**
 * Create a notification entry in DB and optionally fire a transactional email.
 * Fire-and-forget — never awaited internally.
 *
 * @param sendEmail  Set to `true` only for high-priority events (wallet empty,
 *                   scan failed, domain verified). Defaults to FALSE to prevent
 *                   email spam — every scan start/complete does NOT need an email.
 */
export async function createNotification(
  uid: string,
  title: string,
  message: string,
  type: "info" | "success" | "error" | "warning" = "info",
  sendEmail = false,   // ← opt-in, not opt-out
) {
  try {
    // 1. Write to notifications table
    await query(
      `INSERT INTO notifications (user_uid, title, message, type) VALUES ($1, $2, $3, $4)`,
      [uid, title, message, type],
    );

    // 2. Only send email when explicitly requested
    if (!sendEmail) return;

    const userRes = await query(
      `SELECT email, first_name FROM users WHERE uid = $1`,
      [uid],
    );

    if (userRes.rows.length > 0) {
      const user      = userRes.rows[0];
      const firstName = user.first_name || "there";

      import("@/lib/email").then(({ sendEmail: send }) =>
        import("@/lib/email-templates").then(({ generalNotificationEmail }) =>
          send(
            user.email,
            title,
            generalNotificationEmail(
              firstName,
              title,
              message,
              "Open Dashboard",
              `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            ),
          ).catch((err) => console.error("[Notification Email]", err))
        )
      ).catch(() => {});
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


// ─────────────────────────────────────────────────────────────────────────────
// NOTE: deductCredits is intentionally NOT exported from this file.
// The single authoritative implementation lives in src/lib/credits.ts.
// Import from there to avoid billing logic divergence.
// ─────────────────────────────────────────────────────────────────────────────