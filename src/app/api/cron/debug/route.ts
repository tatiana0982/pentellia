import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "NOT_SET";
  const auth   = req.headers.get("authorization") ?? "NO_HEADER";
  return NextResponse.json({
    secret_length:  secret.length,
    secret_first4:  secret.slice(0, 4),
    secret_last4:   secret.slice(-4),
    auth_length:    auth.length,
    auth_first10:   auth.slice(0, 10),
    match:          auth === `Bearer ${secret}`,
  });
}