// src/lib/notifications.ts
// Central notification hub — writes to DB and sends transactional email.

import { query } from "@/config/db";

/**
 * Create a notification entry in DB and optionally fire a transactional email.
 * Fire-and-forget — never awaited internally.
 *
 * @param sendEmailFlag  Set to true only for high-priority events (subscription
 *                       activated, scan failed). Defaults to false to prevent
 *                       email spam on every scan start/complete.
 */
export async function createNotification(
  uid:           string,
  title:         string,
  message:       string,
  type:          "info" | "success" | "error" | "warning" = "info",
  sendEmailFlag: boolean = false,
) {
  try {
    // 1. Write to notifications table
    await query(
      `INSERT INTO notifications (user_uid, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [uid, title, message, type],
    );

    // 2. Only send email when explicitly requested
    if (!sendEmailFlag) return;

    const userRes = await query(
      `SELECT email, first_name FROM users WHERE uid = $1`,
      [uid],
    );

    if (!userRes.rows.length) return;

    const { email, first_name } = userRes.rows[0];
    const firstName = first_name || "there";

    // Dynamic import — avoids loading email libs on every notification
    import("@/lib/email").then(({ sendEmail }) =>
      import("@/lib/email-templates").then(({ generalNotificationEmail }) =>
        sendEmail(
          email,
          title,
          generalNotificationEmail(
            firstName,
            title,
            message,
            "Open Dashboard",
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          ),
        ).catch(err => console.error("[Notification Email]", err))
      )
    ).catch(() => {});

  } catch (err) {
    console.error("[createNotification]", err);
  }
}