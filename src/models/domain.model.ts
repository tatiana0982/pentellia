// src/models/domain.model.ts
import { z } from "zod";

// ── Zod validation schemas ────────────────────────────────────
export const CreateDomainSchema = z.object({
  name: z.string().min(2, "Domain name must be at least 2 characters"),
});

export const UpdateDomainSchema = z.object({
  isVerified: z.boolean().optional(),
});

// ── Inferred types ────────────────────────────────────────────
export type CreateDomainInput = z.infer<typeof CreateDomainSchema>;
export type UpdateDomainInput = z.infer<typeof UpdateDomainSchema>;

// ── Domain entity (maps to domains Postgres table) ────────────
export interface Domain {
  id: string;
  userUid: string;
  name: string;
  verificationToken: string;
  verificationHost: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}