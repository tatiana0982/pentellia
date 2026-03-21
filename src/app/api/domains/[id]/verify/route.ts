// src/app/api/domains/[id]/verify/route.ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/api/auth.middleware";
import { DomainService } from "@/services/domain.service";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { createNotification } from "@/lib/notifications";

const domainService = new DomainService();

export const POST = (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) =>
  apiHandler(
    authenticate(async (user) => {
      const { id } = await params;

      // Verify domain — throws ApiError on failure
      await domainService.verifyDomain(user.id, id);

      // Fire notification + email ONLY on success (non-blocking)
      createNotification(
        user.id,
        "Domain Verified ✓",
        "Your domain has been verified. All scanning tools are now unlocked.",
        "success",
      ).catch(() => {});

      return new ApiResponse(true, "Domain verified successfully");
    }),
  );