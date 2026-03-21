// lib/otpStore.ts
// Global singleton OTP store — survives Next.js hot reloads in dev
// For production scale, replace Map with Redis or a DB table.

const globalForOtp = globalThis as typeof globalThis & {
  otpMap: Map<string, { otp: string; expiresAt: number }>;
};

if (!globalForOtp.otpMap) {
  globalForOtp.otpMap = new Map();
}

export const otpStore = globalForOtp.otpMap;

/** Generate a random 6-digit OTP */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Store an OTP with TTL (default 10 minutes) */
export function storeOTP(
  email: string,
  otp: string,
  type: string,
  ttlMs: number = 10 * 60 * 1000,
): void {
  const key = `${type}:${email.toLowerCase()}`;
  otpStore.set(key, { otp, expiresAt: Date.now() + ttlMs });
}

/** Verify an OTP — deletes it on success (single-use) */
export function verifyOTP(email: string, otp: string, type: string): boolean {
  const key = `${type}:${email.toLowerCase()}`;
  const record = otpStore.get(key);

  if (!record) return false;

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return false;
  }

  if (record.otp !== otp) return false;

  otpStore.delete(key); // Single-use: delete after successful verification
  return true;
}