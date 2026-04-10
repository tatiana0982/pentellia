// src/utils/apiHandler.ts
// Utility wrapper for legacy API routes.
// New routes use direct NextResponse.json — do NOT add new routes via apiHandler.

import { NextResponse } from "next/server";

type ApiHandler<T> = () => Promise<T>;

export async function apiHandler<T>(handler: ApiHandler<T>) {
  try {
    const data = await handler();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[apiHandler]", error?.message);
    const status  = error?.status  ?? 500;
    const message = error?.message ?? "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export function authenticate<T>(
  handler: (user: { id: string }) => Promise<T>,
) {
  return async () => {
    const { getUid } = await import("@/lib/auth");
    const uid = await getUid();
    if (!uid) throw { status: 401, message: "Unauthorized" };
    return handler({ id: uid });
  };
}