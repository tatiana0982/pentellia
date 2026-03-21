// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { UserService } from "@/services/user.service";
import { cookies } from "next/headers";

const userService  = new UserService();
const SESSION_TTL  = 60 * 60 * 24 * 7; // 7 days in seconds
const isProd       = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.idToken || typeof body.idToken !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // 1. Verify Firebase ID token
    const decoded = await adminAuth.verifyIdToken(body.idToken, true);

    // 2. Parse user data
    const [firstName, ...rest] = (decoded.name || "").split(" ");
    const userData = {
      uid:       decoded.uid,
      email:     decoded.email!,
      firstName: firstName || "",
      lastName:  rest.join(" "),
      avatar:    decoded.picture,
    };

    // 3. Safe location extraction
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const locationData = {
      ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 512) || "",
      country:   req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || undefined,
      city:      req.headers.get("x-vercel-ip-city")    || undefined,
      timezone:  req.headers.get("x-vercel-ip-timezone")|| undefined,
    };

    // 4. Sync user to DB
    await userService.syncUser(userData, locationData);

    // 5. Log history — non-blocking, never fails login
    userService.logLoginHistory(userData.uid, locationData).catch(() => {});

    // 6. Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_TTL * 1000,
    });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      maxAge:   SESSION_TTL,
      httpOnly: true,
      secure:   isProd,            // always true in production
      sameSite: isProd ? "strict" : "lax", // strict in prod — CSRF protection
      path:     "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    // Generic response — never leak Firebase error details
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}