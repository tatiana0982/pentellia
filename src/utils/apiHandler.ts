import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Two response shape conventions exist in this codebase:
//
// Pattern A — legacy domain routes (apiHandler + authenticate + ApiResponse):
//   Response: { success: true, message: string, data: T }
//   Used by: /api/domains/*, /api/domains/[id]/*
//
// Pattern B — direct routes (all newer routes):
//   Response: { success: true, [resource-specific fields]: ... }
//   Used by: /api/subscription/*, /api/dashboard/*, /api/users, etc.
//
// New routes should use Pattern B (return NextResponse.json directly).
// Do NOT add new routes via apiHandler.
// ─────────────────────────────────────────────────────────────────────────────

type ApiHandler<T> = () => Promise<T>;

export async function apiHandler<T>(handler: ApiHandler<T>) {
    try {
        const result = await handler();

        // If handler returned an object that already has a 'success' field
        // (e.g. ApiResponse instance), spread it directly to avoid double-wrapping.
        if (result && typeof result === "object" && "success" in (result as any)) {
            return NextResponse.json(result, { status: 200 });
        }

        // Legacy path: handler returned { message, data }
        const data = result as { message: string; data: unknown };
        return NextResponse.json(
            { success: true, message: data.message, data: data.data },
            { status: 200 },
        );

    } catch (err: any) {
        console.error("[apiHandler] ERROR:", err?.message ?? err);

        const statusCode = err.statusCode || 500;
        const message    = err.message    || "Internal Server Error";

        return NextResponse.json(
            { success: false, message, errors: err.errors ?? null, data: null },
            { status: statusCode },
        );
    }
}