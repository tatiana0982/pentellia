// app/api/session/route.ts
import { NextRequest } from "next/server";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { AuthService } from "@/services/auth.service";

const authService = new AuthService()

export const POST = async (req: NextRequest) =>
  apiHandler(
    async () => {
      const { token } = await req.json();

      await authService.login(token)

      return new ApiResponse(true, "Cookie created");
    }
  );
