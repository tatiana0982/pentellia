// src/app/api/auth/refresh-session/route.ts
// Re-mints the __session cookie from a fresh Firebase ID token.
// Called client-side before sensitive operations (payments) to prevent
// 401s caused by stale session cookies after long-running popups.

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const isProd      = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.idToken || typeof body.idToken !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // Verify fresh ID token from client
    await adminAuth.verifyIdToken(body.idToken, true);

    // Mint a new session cookie
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_TTL * 1000,
    });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      maxAge:   SESSION_TTL,
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? "strict" : "lax",
      path:     "/",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RefreshSession]", err?.code, err?.message);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
  }
}
