// app/api/dashboard/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";

async function getUid() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch (e) {
    return null;
  }
}

// GET: Fetch Unread Notifications
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await query(
      `SELECT * FROM notifications WHERE user_uid = $1 ORDER BY created_at DESC`,
      [uid],
    );
    return NextResponse.json({ success: true, notifications: res.rows });
  } catch (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}

// DELETE: Remove a notification (Mark as read/delete)
export async function DELETE(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    // We delete it entirely based on your request
    await query(`DELETE FROM notifications WHERE id = $1 AND user_uid = $2`, [
      id,
      uid,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}
