import { query } from "@/config/db";
import { createNotification } from "@/lib/notifications";
import { CreateUserInput } from "@/models/user.model";
import { use } from "react";

interface LocationData {
  ip: string;
  country?: string;
  city?: string;
  timezone?: string;
  userAgent?: string;
}

export class UserService {
  // 1. Sync User (Updated to store Location & Timezone)
  async syncUser(user: CreateUserInput, loc?: LocationData) {
    const upsertText = `
      INSERT INTO users (uid, email, first_name, last_name, avatar, country, timezone, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (uid) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        first_name = COALESCE(users.first_name, EXCLUDED.first_name),
        last_name = COALESCE(users.last_name, EXCLUDED.last_name),
        avatar = COALESCE(users.avatar, EXCLUDED.avatar),
        country = COALESCE(EXCLUDED.country, users.country),   -- Update if new data provided
        timezone = COALESCE(EXCLUDED.timezone, users.timezone), -- Update if new data provided
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      user.uid,
      user.email,
      user.firstName || null,
      user.lastName || null,
      user.avatar || null,
      loc?.country || null,
      loc?.timezone || null,
    ];

    try {
      const res = await query(upsertText, values);
      await createNotification(
        user.uid,
        "Welcome to Pentellia! 🚀",
        "Thanks for joining. Ready to secure your infrastructure? Start your first scan from the dashboard.",
        "success", // Green checkmark icon
      );
      return res.rows[0];
    } catch (error: any) {
      // Handle Email Conflict (Legacy Account Linking)
      if (error.code === "23505" && error.constraint === "users_email_key") {
        console.log("⚠️ Relinking existing email to new UID...");
        const updateUidText = `
          UPDATE users 
          SET uid = $1, first_name = $3, last_name = $4, avatar = $5, 
              country = $6, timezone = $7, updated_at = NOW()
          WHERE email = $2
          RETURNING *
        `;
        const res = await query(updateUidText, values);
        return res.rows[0];
      }
      console.error("DB Sync Error:", error);
      throw error;
    }
  }

  // 2. Log Login History
  async logLoginHistory(uid: string, loc: LocationData) {
    const locationString =
      loc.city && loc.country
        ? `${loc.city}, ${loc.country}`
        : loc.country || "Unknown";

    const text = `
      INSERT INTO login_history (user_uid, ip_address, location, user_agent)
      VALUES ($1, $2, $3, $4)
    `;

    try {
      await query(text, [uid, loc.ip, locationString, loc.userAgent || null]);
    } catch (error) {
      console.error("Failed to log login history:", error);
      // We do not throw here to avoid blocking the login flow if logging fails
    }
  }
}
