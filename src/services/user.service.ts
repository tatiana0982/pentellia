// src/services/user.service.ts
import { query } from "@/config/db";
import { createNotification } from "@/lib/notifications";
import { CreateUserInput } from "@/models/user.model";

interface LocationData {
  ip: string;
  country?: string;
  city?: string;
  timezone?: string;
  userAgent?: string;
}

export class UserService {
  async syncUser(user: CreateUserInput, loc?: LocationData) {
    const upsertText = `
      INSERT INTO users (uid, email, first_name, last_name, avatar, country, timezone, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (uid)
      DO UPDATE SET
        email      = EXCLUDED.email,
        first_name = COALESCE(users.first_name, EXCLUDED.first_name),
        last_name  = COALESCE(users.last_name,  EXCLUDED.last_name),
        avatar     = COALESCE(users.avatar,     EXCLUDED.avatar),
        country    = COALESCE(EXCLUDED.country,  users.country),
        timezone   = COALESCE(EXCLUDED.timezone, users.timezone),
        updated_at = NOW()
      RETURNING *, (xmax = 0) AS is_new_user
    `;

    const values = [
      user.uid,
      user.email,
      user.firstName || null,
      user.lastName  || null,
      user.avatar    || null,
      loc?.country   || null,
      loc?.timezone  || null,
    ];

    try {
      const res = await query(upsertText, values);
      const row = res.rows[0];

      // Fire welcome notification for brand-new users only
      if (row.is_new_user) {
        await createNotification(
          user.uid,
          "Welcome to Pentellia!",
          "Your account is ready. Verify your domain and add wallet credits to start scanning.",
          "success",
        );
        // No signup bonus — users must purchase credits before scanning.
        // Wallet row is created automatically on first top-up via razorpay verify-payment.
      }

      return row;
    } catch (error: any) {
      // Legacy: relink existing email to new UID (Google re-auth edge case)
      if (error.code === "23505" && error.constraint === "users_email_key") {
        const updateText = `
          UPDATE users
          SET uid        = $1,
              first_name = $3,
              last_name  = $4,
              avatar     = $5,
              country    = $6,
              timezone   = $7,
              updated_at = NOW()
          WHERE email = $2
          RETURNING *
        `;
        const res = await query(updateText, values);
        return res.rows[0];
      }
      throw error;
    }
  }

  async logLoginHistory(uid: string, loc: LocationData) {
    const location =
      loc.city && loc.country
        ? `${loc.city}, ${loc.country}`
        : loc.country || "Unknown";

    await query(
      `INSERT INTO login_history (user_uid, ip_address, location, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [uid, loc.ip, location, loc.userAgent || null],
    ).catch(() => {}); // Non-blocking, never throw
  }
}