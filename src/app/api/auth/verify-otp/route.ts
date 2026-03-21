// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// ── Shared reset-token store ─────────────────────────────────────────────────
// Exported so change-password & delete-account routes can validate tokens.
const g = globalThis as typeof globalThis & {
  _rts?: Map<string, { uid: string; email: string; expiresAt: number }>;
};
if (!g._rts) g._rts = new Map();
export const resetTokenStore = g._rts;

const ALLOWED = ["reset", "change_password", "delete_account"];

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { otp, email: bodyEmail } = body;

    // Accept legacy format: security page sends { type: "forgot" } instead of { purpose: "reset" }
    let purpose: string = body?.purpose || "";
    if (!purpose && body?.type === "forgot") purpose = "reset";
    if (!purpose) purpose = "reset";

    if (!ALLOWED.includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }
    if (!otp || typeof otp !== "string") {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    // ── Resolve email ────────────────────────────────────────────────────────
    let email: string;
    if (purpose === "reset") {
      email = typeof bodyEmail === "string" ? bodyEmail.toLowerCase().trim() : "";
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Valid email required" }, { status: 400 });
      }
    } else {
      const uid = await getUid();
      if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const res = await query(`SELECT email FROM users WHERE uid = $1`, [uid]);
      if (!res.rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
      email = res.rows[0].email;
    }

    // ── Look up valid OTP ────────────────────────────────────────────────────
    const record = await query(
      `SELECT id, otp_hash FROM otp_store
       WHERE email = $1 AND purpose = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, purpose],
    );
    if (!record.rows.length) {
      return NextResponse.json({ error: "No valid OTP found. Request a new code." }, { status: 400 });
    }

    const row = record.rows[0];
    const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const stored = Buffer.from(row.otp_hash, "hex");
    const input  = Buffer.from(inputHash,    "hex");
    const match  = stored.length === input.length && crypto.timingSafeEqual(stored, input);

    if (!match) {
      return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 });
    }

    // Mark used
    await query(`UPDATE otp_store SET used = TRUE WHERE id = $1`, [row.id]);

    // ── Generate resetToken for ALL purposes that need it ────────────────────
    // (change_password, delete_account, AND reset — security page uses this pattern)
    const userRes  = await query(`SELECT uid FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    const uid      = userRes.rows[0]?.uid ?? "";
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store in memory (15 min TTL) — change-password/delete-account validate here
    resetTokenStore.set(resetToken, { uid, email, expiresAt: Date.now() + 15 * 60 * 1000 });

    // Prune stale entries
    const now = Date.now();
    for (const [k, v] of resetTokenStore) if (now > v.expiresAt) resetTokenStore.delete(k);

    return NextResponse.json({ success: true, resetToken });

  } catch (err: any) {
    console.error("[VerifyOTP]", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV !== "production" ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}