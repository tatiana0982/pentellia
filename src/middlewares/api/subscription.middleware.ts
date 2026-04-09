// src/middlewares/api/subscription.middleware.ts
// ── Replaces requireVerifiedDomain + requireCredits ───────────────────
// Wrap INSIDE authenticate():
//
//   export const POST = (req) =>
//     apiHandler(
//       authenticate(
//         requireActivePlan("light", async (user) => { ... })
//       )
//     );

import { ApiError } from "@/utils/ApiError";
import { checkUsageLimit, type ScanType } from "@/lib/subscription";

interface AuthUser {
  id:    string;
  email: string;
}

export const requireActivePlan =
  <T>(scanType: ScanType, handler: (user: AuthUser) => Promise<T>) =>
  async (user: AuthUser): Promise<T> => {
    const status = await checkUsageLimit(user.id, scanType);

    if (!status.allowed) {
      const httpStatus =
        status.code === "NO_SUBSCRIPTION" || status.code === "PLAN_EXPIRED"
          ? 402
          : 429; // rate limit for monthly/daily exceeded

      throw new ApiError(httpStatus, status.reason ?? "Usage limit reached", {
        code:         status.code,
        monthlyUsed:  status.monthlyUsed,
        monthlyLimit: status.monthlyLimit,
        dailyUsed:    status.dailyUsed,
        dailyLimit:   status.dailyLimit,
      });
    }

    return handler(user);
  };