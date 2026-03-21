// src/app/api/domains/route.ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/api/auth.middleware";
import { DomainService } from "@/services/domain.service";
import { CreateDomainSchema } from "@/models/domain.model";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { validateInput } from "@/utils/validateInput";

const domainService = new DomainService();

// GET /api/domains — fetch all domains for the authenticated user
export const GET = (req: NextRequest) =>
  apiHandler(
    authenticate(async (user) => {
      const domains = await domainService.getDomainsForUser(user.id);
      return new ApiResponse(true, "Domains fetched", domains);
    }),
  );

// POST /api/domains — add a new domain
export const POST = (req: NextRequest) =>
  apiHandler(
    authenticate(async (user) => {
      const body = await req.json();
      const data = validateInput(CreateDomainSchema, body);
      const domain = await domainService.createDomain(data.name, user.id);
      return new ApiResponse(true, "Domain added successfully", domain);
    }),
  );