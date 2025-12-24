import { Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'

export const CreateUserSchema = z.object({
    uid: z.string().min(1),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
})

export const UpdateUserSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
})


// Infer TypeScript types from Zod schemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// Domain model (database entity)
export interface User {
    id: string;
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}