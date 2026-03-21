// src/services/user.service.ts
import { query } from "@/config/db";
import { createNotification } from "@/lib/notifications";
import { CreateUserInput } from "@/models/user.model";

interface LocationData {
  ip:        string;
  country?:  string;
  city?:     string;
  timezone?: string;
  userAgent?: string;
}

export class UserService {

  // ── Sync user — upsert with new-user detection ───────────────────
  async syncUser(user: CreateUserInput, loc?: LocationData) {
    // xmax::text = '0' means the row was freshly INSERTed (new signup).
    // Any non-zero xmax means the row was UPDATEd (returning login).
    const text = `
      INSERT INTO users (uid, email, first_name, last_name, avatar, country, timezone, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (uid) DO UPDATE SET
        email      = EXCLUDED.email,
        first_name = COALESCE(users.first_name, EXCLUDED.first_name),
        last_name  = COALESCE(users.last_name,  EXCLUDED.last_name),
        avatar     = COALESCE(users.avatar,     EXCLUDED.avatar),
        country    = COALESCE(EXCLUDED.country,  users.country),
        timezone   = COALESCE(EXCLUDED.timezone, users.timezone),
        updated_at = NOW()
      RETURNING *, xmax::text AS xmax_val
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
      const res     = await query(text, values);
      const row     = res.rows[0];
      const isNew   = row.xmax_val === "0"; // INSERT path

      if (isNew) {
        // Welcome notification — only on first signup, never on login
        createNotification(
          user.uid,
          "Welcome to Pentellia! 🚀",
          "Thanks for joining. Verify a domain and run your first scan to get started.",
          "success",
        ).catch(() => {});

        // ₹10 first-scan bonus credit
        this.giveFirstScanBonus(user.uid).catch(() => {});
      }

      return row;
    } catch (err: any) {
      // Legacy: email conflict from account re-linking
      if (err.code === "23505" && err.constraint === "users_email_key") {
        const relinkText = `
          UPDATE users
          SET uid = $1, first_name = $3, last_name = $4, avatar = $5,
              country = $6, timezone = $7, updated_at = NOW()
          WHERE email = $2
          RETURNING *
        `;
        const res = await query(relinkText, values);
        return res.rows[0];
      }
      throw err;
    }
  }

  // ── First-scan bonus — ₹10 credited once per user ────────────────
  private async giveFirstScanBonus(uid: string) {
    // Atomic: only runs if bonus hasn't been given yet
    const res = await query(
      `UPDATE users SET first_scan_bonus_given = TRUE
       WHERE uid = $1 AND first_scan_bonus_given = FALSE
       RETURNING uid`,
      [uid],
    );
    if (!res.rows.length) return; // already given

    const BONUS = 10.0;
    const creditRes = await query(
      `INSERT INTO user_credits (user_uid, balance, total_bought, total_spent)
       VALUES ($1, $2, $2, 0)
       ON CONFLICT (user_uid)
       DO UPDATE SET
         balance      = user_credits.balance + $2,
         total_bought = user_credits.total_bought + $2,
         updated_at   = NOW()
       RETURNING balance`,
      [uid, BONUS],
    );
    const balanceAfter = parseFloat(creditRes.rows[0].balance);

    await query(
      `INSERT INTO credit_transactions
         (user_uid, type, amount, balance_after, description, ref_type, ref_id)
       VALUES ($1, 'credit', $2, $3, 'Welcome bonus — first scan on us!', 'bonus', 'signup')`,
      [uid, BONUS, balanceAfter],
    );

    createNotification(
      uid,
      "₹10 Welcome Credit Added! 🎁",
      "We've added ₹10 to your wallet to try your first scan. No card required.",
      "success",
    ).catch(() => {});
  }

  // ── Log login history ────────────────────────────────────────────
  async logLoginHistory(uid: string, loc: LocationData) {
    const location =
      loc.city && loc.country
        ? `${loc.city}, ${loc.country}`
        : loc.country || "Unknown";

    await query(
      `INSERT INTO login_history (user_uid, ip_address, location, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [uid, loc.ip, location, loc.userAgent?.slice(0, 512) || null],
    ).catch(() => {}); // non-blocking — never fail the login
  }
}