// src/lib/refreshSession.ts
// Force-refreshes the Firebase ID token and re-mints the __session cookie.
// Call this before any sensitive API operation (payments, deletions) to avoid
// 401s caused by stale session cookies — especially after Google login + popup flows.

import { auth } from "@/config/firebaseClient";

/**
 * Silently refreshes the session cookie.
 * Returns true on success, false if the user is not signed in or refresh fails.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    // forceRefresh=true always hits Firebase servers — guaranteed fresh token
    const idToken = await user.getIdToken(true);

    const res = await fetch("/api/auth/refresh-session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken }),
    });

    return res.ok;
  } catch (err) {
    console.error("[refreshSession] Failed:", err);
    return false;
  }
}
