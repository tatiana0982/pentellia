// src/middlewares/api/subscription.middleware.ts
// Enforces active subscription + usage limits.
// Replaces the old domain + credits middleware system.

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
          : 429;

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