// src/middlewares/api/domain.middleware.ts
import { query } from "@/config/db";
import { ApiError } from "@/utils/ApiError";

interface AuthUser {
  id: string;
  email: string;
}

/**
 * requireVerifiedDomain
 *
 * Middleware that checks the user has at least one verified domain in Postgres.
 * Wrap it INSIDE authenticate():
 *
 *   export const POST = (req: NextRequest) =>
 *     apiHandler(
 *       authenticate(
 *         requireVerifiedDomain(async (user) => {
 *           // protected handler logic
 *         })
 *       )
 *     );
 */
export const requireVerifiedDomain =
  <T>(handler: (user: AuthUser) => Promise<T>) =>
  async (user: AuthUser): Promise<T> => {
    const res = await query(
      `SELECT 1 FROM domains WHERE user_uid = $1 AND is_verified = TRUE LIMIT 1`,
      [user.id],
    );

    if ((res.rowCount ?? 0) === 0) {
      throw new ApiError(
        403,
        "Domain verification required. Please verify your domain before using this feature.",
      );
    }

    return handler(user);
  };