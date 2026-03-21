// src/app/api/users/avatar/route.ts
import { NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

function detectMime(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/png";
}

export async function GET() {
  const uid = await getUid();
  if (!uid) return new NextResponse(null, { status: 401 });

  try {
    const res = await query(
      `SELECT avatar FROM users WHERE uid = $1`,
      [uid],
    );

    if (!res.rows.length || !res.rows[0].avatar) {
      return new NextResponse(null, { status: 404 });
    }

    // pg returns bytea as a Node.js Buffer.
    // Cast through unknown to satisfy the strict BodyInit type expected by NextResponse.
    const buffer   = res.rows[0].avatar as Buffer;
    const mimeType = detectMime(buffer);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":           mimeType,
        "Cache-Control":          "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}