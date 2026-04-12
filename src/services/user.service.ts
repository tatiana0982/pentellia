// src/services/user.service.ts
import { query } from "@/config/db";
import { createNotification } from "@/lib/notifications";
import { CreateUserInput } from "@/models/user.model";

interface LocationData {
  ip:         string;
  country?:   string;
  city?:      string;
  timezone?:  string;
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
          "Welcome to Pentellia! 🎉",
          "Your account is ready. Subscribe to a plan to start scanning.",
          "success",
          true,
        );
      }
    } catch (err: any) {
      console.error("[UserService.syncUser]", err?.message);
      throw err;
    }
  }

  async logLoginHistory(uid: string, loc: LocationData): Promise<void> {
    try {
      await query(
        `INSERT INTO login_history (user_uid, ip_address, user_agent, location, login_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          uid,
          loc.ip,
          loc.userAgent || null,
          loc.city && loc.country ? `${loc.city}, ${loc.country}` : loc.country || null,
        ],
      );
    } catch (err: any) {
      console.error("[UserService.logLoginHistory]", err?.message);
    }
  }
}
