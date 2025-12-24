import { Timestamp } from "firebase-admin/firestore";
import z from "zod";

export const CreateDomainSchema = z.object({
    name: z.string().min(2),
    userId: z.string().min(1),
})

export const UpdateDomainSchema = z.object({
    verified: z.boolean().optional(),
})


// Infer TypeScript types from Zod schemas
export type CreateDomainInput = z.infer<typeof CreateDomainSchema>
export type UpdateDomainInput = z.infer<typeof UpdateDomainSchema>


export interface Domain {
    id: string;
    name: string;
    userId: string;
    verificationToken: string;
    verified: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}