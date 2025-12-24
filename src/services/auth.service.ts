import { adminAuth } from "@/config/firebaseAdmin";
import { User } from "@/models/user.model";
import { UserRepository } from "@/repositories/user.repository";
import { ApiError } from "@/utils/ApiError";
import { cookies } from "next/headers";

export class AuthService {

    private userRepo = new UserRepository();

    async login(token: string): Promise<void> {

        if (!token) {
            throw new ApiError(400, "Token required");
        }

        try {
            const decoded = await adminAuth.verifyIdToken(token, true);

            if (!decoded.email_verified) {
                throw new ApiError(403, "Email not verified");
            }

            const expiresIn = 4 * 60 * 60 * 1000; // 4 hours

            const sessionCookie = await adminAuth.createSessionCookie(token, {
                expiresIn,
            });

            (await cookies()).set("__session", sessionCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: expiresIn / 1000,
            });

        } catch (error) {

            throw new ApiError(401, "Invalid token")

        }

    }

    async logout(): Promise<void> {
        const cookieStore = await cookies();
        cookieStore.delete("__session");
    }

    async verifyToken(token: string): Promise<User | null> {
        if (!token) {

            throw new ApiError(400, "Token required");
        }
        try {

            const decodedToken = await adminAuth.verifySessionCookie(token, true);

            const user = await this.userRepo.findByUid(decodedToken.uid!);

            return user

        } catch (error) {
            console.error("Auth verification error:", error);
            throw new ApiError(401, "Token signature invalid");
        }
    }

}