import { validateInput } from '@/utils/validateInput';
import { CreateUserInput, CreateUserSchema } from '@/models/user.model';
import { apiHandler } from '@/utils/apiHandler';
import { UserService } from '@/services/user.service';
import { NextRequest } from 'next/server';
import { adminAuth } from '@/config/firebaseAdmin';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';

const userService = new UserService();

const verifyFirebaseToken = async (req: NextRequest) => {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        throw new ApiError(401, "Unauthorized");
    }

    const token = authHeader.split(" ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    return decoded;
};


// POST /api/users - Create user
export const POST = async (req: NextRequest) => apiHandler(async () => {
    // 1️⃣ Verify Firebase token
    const decoded = await verifyFirebaseToken(req);

    // 2️⃣ Validate ONLY non-sensitive fields
    const body = await req.json();
    const data = validateInput(CreateUserSchema.omit({ uid: true, email: true }), body);

    // 3️⃣ Build trusted payload
    const userPayload: CreateUserInput = {
        uid: decoded.uid,
        email: decoded.email!,
        firstName: data.firstName,
        lastName: data.lastName,
    };

    // 5️⃣ Create user
    const user = await userService.createUser(userPayload);

    return new ApiResponse( true , "User created" , user );
    
});
