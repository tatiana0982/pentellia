// lib/notifications.ts
import { query } from "@/config/db";
import { sendEmail } from "@/lib/email";

export async function createNotification(
  uid: string,
  title: string,
  message: string,
  type: "info" | "success" | "error" | "warning" = "info",
) {
  try {
    // 1. Insert into Database
    const text = `
      INSERT INTO notifications (user_uid, title, message, type)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    await query(text, [uid, title, message, type]);

    // 2. Fetch User Email for Notification
    const userRes = await query(
      `SELECT email, first_name FROM users WHERE uid = $1`,
      [uid],
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      // 3. Send Email (Fire and Forget)
      // We do not 'await' this because we don't want to slow down the API response
      // if the SMTP server is slow.
      const emailHtml = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>${title}</h2>
          <p>Hello ${user.first_name || "User"},</p>
          <p>${message}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">
            You can view more details in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Dashboard</a>.
          </p>
        </div>
      `;

      sendEmail(user.email, `Notification: ${title}`, emailHtml).catch((err) =>
        console.error("Failed to send background email:", err),
      );
    }
  } catch (error) {
    console.error("Failed to create notification system error:", error);
  }
}
