import { ApiResponse } from "@/utils/ApiResponse";
import { apiHandler } from "@/utils/apiHandler";
import { AuthService } from "@/services/auth.service";

const authService = new AuthService()

export const POST = async () =>
  apiHandler(
    async () => {
      await authService.logout()
      return new ApiResponse(true, "Cookie deleted");
    }
  )
