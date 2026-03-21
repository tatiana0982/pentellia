// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

// ─── Route categories ─────────────────────────────────────────────────
const PROTECTED_PAGES = ["/dashboard", "/account", "/subscription"];
const AUTH_PAGES      = ["/login", "/signup"];
const PUBLIC_API      = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/api/webhooks/razorpay",   // Razorpay needs its own HMAC auth, not session
];

// ─── In-memory rate limiter (per IP, edge-compatible) ─────────────────
// Keyed: `${ip}:${endpoint_bucket}`
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, bucket: string, max: number, windowMs: number): boolean {
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  if (entry.count >= max) return true; // limited
  entry.count++;
  return false;
}

// Prune old entries every 500 requests to avoid memory growth
let pruneCounter = 0;
function maybePrune() {
  if (++pruneCounter % 500 !== 0) return;
  const now = Date.now();
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}

// ─── Security headers applied to every response ───────────────────────
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.razorpay.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    ].join("; "),
  );
  return res;
}

// ─── Middleware ───────────────────────────────────────────────────────
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  maybePrune();

  // 1. Strict rate limiting on auth endpoints (brute-force prevention)
  const isAuthEndpoint = pathname.startsWith("/api/auth/");
  if (isAuthEndpoint) {
    if (rateLimit(ip, "auth", 10, 60_000)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  // 2. General API rate limit (100 req/min per IP)
  if (pathname.startsWith("/api/")) {
    if (rateLimit(ip, "api", 100, 60_000)) {
      return new NextResponse(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  const sessionCookie = req.cookies.get("__session")?.value;
  const hasSession    = Boolean(sessionCookie);

  // 3. Protect API routes — reject unauthenticated requests at the edge
  //    Public API paths are explicitly whitelisted above
  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!isPublic && !hasSession) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    // API responses don't need HTML security headers but add basic ones
    const res = NextResponse.next();
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // 4. Protect page routes
  if (PROTECTED_PAGES.some((r) => pathname.startsWith(r))) {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 5. Redirect authenticated users away from auth pages
  if (AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 6. Apply security headers to all page responses
  const res = NextResponse.next();
  return securityHeaders(res);
}

export const config = {
  matcher: [
    // Match everything except static assets and favicons
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.svg$).*)",
  ],
};