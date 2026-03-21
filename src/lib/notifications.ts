// src/lib/notifications.ts
// Central notification hub — writes to DB and sends transactional email.
// All email sends are fire-and-forget (no await) to never block API responses.

import { query } from "@/config/db";
import { sendEmail } from "@/lib/email";
import { generalNotificationEmail } from "@/lib/email-templates";

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

    // 2. Fetch user for email
    const userRes = await query(
      `SELECT email, first_name FROM users WHERE uid = $1`,
      [uid],
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const firstName = user.first_name || "there";

      // 3. Fire-and-forget — never awaited
      sendEmail(
        user.email,
        title,
        generalNotificationEmail(firstName, title, message, "Open Dashboard", `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`),
      ).catch((err) => console.error("[Notification Email]", err));
    }
  } catch (err) {
    console.error("[createNotification]", err);
  }
}