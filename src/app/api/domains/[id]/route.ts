// src/app/api/domains/[id]/route.ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/api/auth.middleware";
import { DomainService } from "@/services/domain.service";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { query } from "@/config/db";
import { ApiError } from "@/utils/ApiError";

const domainService = new DomainService();

// GET /api/domains/:id
export const GET = (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) =>
  apiHandler(
    authenticate(async (user) => {
      const { id } = await params;
      const domain  = await domainService.getSingleDomainForUser(user.id, id);
      return new ApiResponse(true, "Domain fetched", domain);
    }),
  );

// DELETE /api/domains/:id
export const DELETE = (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) =>
  apiHandler(
    authenticate(async (user) => {
      const { id } = await params;

      const res = await query(
        `SELECT id, name, is_verified FROM domains WHERE id = $1 AND user_uid = $2`,
        [id, user.id],
      );

      if (res.rows.length === 0) throw new ApiError(404, "Domain not found");

      const domain = res.rows[0];

      await query(`DELETE FROM domains WHERE id = $1 AND user_uid = $2`, [id, user.id]);

      if (domain.is_verified) {
        const remaining = await query(
          `SELECT name FROM domains WHERE user_uid = $1 AND is_verified = TRUE LIMIT 1`,
          [user.id],
        );
        const newVerifiedDomain = remaining.rows.length > 0 ? remaining.rows[0].name : null;
        await query(
          `UPDATE users SET verified_domain = $1, updated_at = NOW() WHERE uid = $2`,
          [newVerifiedDomain, user.id],
        );
      }

      return new ApiResponse(true, `Domain ${domain.name} deleted successfully`);
    }),
  );