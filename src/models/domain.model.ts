// src/models/domain.model.ts
import { z } from "zod";

export const CreateDomainSchema = z.object({
  name: z.string().min(2, "Domain name must be at least 2 characters"),
});

export type CreateDomainInput = z.infer<typeof CreateDomainSchema>;

// Domain entity — maps to 'domains' PostgreSQL table
export interface Domain {
  id:                string;
  userUid:           string;   // ← PostgreSQL column: user_uid
  name:              string;
  verificationToken: string;
  verificationHost:  string;
  isVerified:        boolean;
  verifiedAt:        Date | null;
  createdAt:         Date;
  updatedAt:         Date;
}