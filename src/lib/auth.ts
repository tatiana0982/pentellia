// src/lib/auth.ts
import { cookies } from "next/headers";
import { adminAuth } from "@/config/firebaseAdmin";
import crypto from "crypto";

// ── In-memory UID cache ───────────────────────────────────────────────
// SHA-256 hash of the session cookie → { uid, expiresAt }
// TTL: 60 s. Eliminates Firebase network call on every request.
// Safe: the underlying session cookie is still verified on first use.
const uidCache = new Map<string, { uid: string; exp: number }>();

function cacheKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function pruneCache() {
  const now = Date.now();
  for (const [k, v] of uidCache) {
    if (now > v.exp) uidCache.delete(k);
  }
}

/**
 * Returns the Firebase UID for the current request.
 * Uses a 60-second in-memory cache to skip repeated Firebase network calls.
 * Pass checkRevoked=true for sensitive operations (payments, deletion).
 */
export async function getUid(checkRevoked = false): Promise<string | null> {
  try {
    const cookieStore    = await cookies();
    const sessionToken   = cookieStore.get("__session")?.value;
    if (!sessionToken) return null;

    // Skip cache for revocation-checked calls (payments etc.)
    if (!checkRevoked) {
      const key    = cacheKey(sessionToken);
      const cached = uidCache.get(key);
      if (cached && Date.now() < cached.exp) return cached.uid;
    }

    const decoded = await adminAuth.verifySessionCookie(sessionToken, checkRevoked);

    if (!checkRevoked) {
      if (uidCache.size > 5000) pruneCache(); // prevent unbounded growth
      uidCache.set(cacheKey(sessionToken), {
        uid: decoded.uid,
        exp: Date.now() + 60_000,
      });
    }

    return decoded.uid;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
