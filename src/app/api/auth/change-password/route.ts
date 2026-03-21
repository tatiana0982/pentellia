// src/app/api/auth/change-password/route.ts
// Uses the same reset-token approach as forgot-password:
// send-otp → verify-otp (returns resetToken) → change-password
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { getUid } from "@/lib/auth";
// resetTokenStore is exported from verify-otp route
import { resetTokenStore } from "@/app/api/auth/verify-otp/route";

export async function POST(req: NextRequest) {
  const uid = await getUid(true); // checkRevoked — password change is sensitive
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, newPassword } = body;

  if (!token || !newPassword || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Validate reset token
  const stored = resetTokenStore.get(token);
  if (!stored) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  if (Date.now() > stored.expiresAt) {
    resetTokenStore.delete(token);
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }
  // Token must belong to the authenticated user (prevents token theft)
  if (stored.uid !== uid) {
    return NextResponse.json({ error: "Token mismatch" }, { status: 403 });
  }

  try {
    await adminAuth.updateUser(uid, { password: newPassword });
    resetTokenStore.delete(token); // consume — one-time use
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Password update failed" }, { status: 500 });
  }
}