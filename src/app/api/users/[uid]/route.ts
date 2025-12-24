import { UserService } from '@/services/user.service';
import { apiHandler } from '@/utils/apiHandler';
import { ApiResponse } from '@/utils/ApiResponse';
import { NextRequest } from 'next/server';

const userService = new UserService();

// GET /api/users/:id - Fetch single user
export const  GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) => apiHandler(
  async () => {
    const { uid } = await params;
   
    const user = await userService.getUserByUid(uid)

    return new ApiResponse(true,"User Found",user)

  }
);

// PUT or PATCH /api/users/:id - Update user
// export async function PATCH(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const userId = params.id;
//     const body = await request.json();
//     // Update user
//     const updatedUser = {}; // update in DB
    
//     return NextResponse.json({ user: updatedUser }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to update user' },
//       { status: 500 }
//     );
//   }
// }
