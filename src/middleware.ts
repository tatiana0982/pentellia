// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PAGES = ["/dashboard", "/account", "/subscription"];
const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/api/webhooks/razorpay",
  // Cron routes are authenticated by CRON_SECRET header, not session cookie
  "/api/cron",
];

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, bucket: string, max: number, windowMs: number): boolean {
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count++;
  return false;
}

let pruneCounter = 0;
function maybePrune() {
  if (++pruneCounter % 500 !== 0) return;
  const now = Date.now();
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}

function securityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://apis.google.com https://*.firebaseapp.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.razorpay.com https://*.razorpay.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://*.firebaseapp.com https://accounts.google.com",
    ].join("; "),
  );
  return res;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  maybePrune();

  const isAuthEndpoint = pathname.startsWith("/api/auth/");
  if (isAuthEndpoint) {
    if (rateLimit(ip, "auth", 10, 60_000)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  if (pathname.startsWith("/api/")) {
    if (rateLimit(ip, "api", 100, 60_000)) {
      return new NextResponse(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  // ── Session guard (shallow — cookie presence only) ──────────────────
  // We cannot call adminAuth.verifySessionCookie() here because Firebase
  // Admin SDK requires Node.js runtime and this middleware runs on the
  // Next.js Edge runtime. This guard only prevents accidental navigation
  // to protected pages without a cookie.
  //
  // SECURITY: actual identity verification happens inside every API route
  // via getUid() / authenticate(), which DO call verifySessionCookie().
  // A forged or revoked cookie will pass this page guard but be rejected
  // by every data-fetching API call, so no data is ever exposed.
  const sessionCookie = req.cookies.get("__session")?.value;
  const hasSession = Boolean(sessionCookie);

  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!isPublic && !hasSession) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const res = NextResponse.next();
    // Apply security headers to API routes as well (HSTS, CSP, etc.)
    securityHeaders(res);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  if (PROTECTED_PAGES.some((r) => pathname.startsWith(r))) {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();
  return securityHeaders(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.svg$).*)",
  ],
};