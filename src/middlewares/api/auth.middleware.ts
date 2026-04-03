import { ApiError } from "@/utils/ApiError";
import { getUid } from "@/lib/auth";

interface AuthUser {
  id:    string;
  email: string;
}

/**
 * authenticate(handler)
 *
 * Higher-order function that verifies the session cookie before calling handler.
 * Uses the 60-second UID cache in lib/auth.ts — avoids a live Firebase network
 * call on every API request (the old version called verifySessionCookie directly,
 * bypassing the cache entirely and hitting Firebase ~100-200ms per request).
 *
 * For sensitive operations (payments, account deletion) the individual route
 * calls getUid(true) with checkRevoked=true itself — this wrapper is intentionally
 * non-revocation-checked for normal reads/writes.
 */
export const authenticate =
  <T>(handler: (user: AuthUser) => Promise<T>) =>
  async (): Promise<T> => {
    const uid = await getUid(false); // uses 60s cache
    if (!uid) throw new ApiError(401, "Unauthorized");

    // Fetch email from DB so the AuthUser shape is preserved for downstream code.
    // This is a single indexed PK lookup — negligible cost.
    const { query } = await import("@/config/db");
    const res = await query(`SELECT email FROM users WHERE uid = $1 LIMIT 1`, [uid]);
    const email = res.rows[0]?.email ?? "";

    return handler({ id: uid, email });
  };