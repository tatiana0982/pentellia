import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/utils/apiHandler';
import { ApiResponse } from '@/utils/ApiResponse';
import { AuthService } from '@/services/auth.service';

const authService = new AuthService()

//TODO can make this as my  global middleware for all middlewars since i cannot user adminDb in middleware.ts

export const POST = async (req: NextRequest) =>

    apiHandler(
        async () => {
            const { token } = await req.json();

           const user = await authService.verifyToken(token)

            return new ApiResponse(true, "Token is valid", user);
        }
    )


