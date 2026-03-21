// src/middlewares/api/credits.middleware.ts
import { query } from "@/config/db";
import { ApiError } from "@/utils/ApiError";

interface AuthUser {
  id: string;
  email: string;
}

/**
 * requireCredits(cost)
 *
 * Middleware that checks the user has sufficient credit balance.
 * Use INSIDE authenticate() AND requireVerifiedDomain():
 *
 *   export const POST = (req) =>
 *     apiHandler(
 *       authenticate(
 *         requireVerifiedDomain(
 *           requireCredits(cost, async (user) => { ... })
 *         )
 *       )
 *     );
 */
export const requireCredits =
  <T>(cost: number, handler: (user: AuthUser) => Promise<T>) =>
  async (user: AuthUser): Promise<T> => {
    const res = await query(
      `SELECT COALESCE(balance, 0) AS balance FROM user_credits WHERE user_uid = $1`,
      [user.id],
    );

    const balance = res.rows.length > 0 ? parseFloat(res.rows[0].balance) : 0;

    if (balance < cost) {
      throw new ApiError(
        402,
        `Insufficient credits. Required: ₹${cost.toFixed(2)}, Available: ₹${balance.toFixed(2)}. Please top up your wallet.`,
      );
    }

    return handler(user);
  };