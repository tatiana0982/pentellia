// src/app/api/tools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// GET — public, cached (tools list doesn't change often)
export async function GET() {
  try {
    const res = await query(
      `SELECT id, name, slug, description, long_description, category, version, params
       FROM tools ORDER BY category, name ASC`,
    );
    const response = NextResponse.json({ success: true, tools: res.rows });
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return response;
  } catch {
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

// POST — admin only (requires authentication + admin flag)
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only allow admin users to create tools
  try {
    const adminRes = await query(
      `SELECT 1 FROM admin_users WHERE uid = $1 LIMIT 1`,
      [uid],
    );
    if (!adminRes.rows.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Authorization check failed" }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, name, slug, description, long_description, category, version, params } = body;
  if (!id || !name || !slug || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const res = await query(
      `INSERT INTO tools (id, name, slug, description, long_description, category, version, params)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, name, slug, description, long_description, category, version, JSON.stringify(params)],
    );
    return NextResponse.json({ success: true, tool: res.rows[0] });
  } catch {
    return NextResponse.json({ error: "Failed to create tool" }, { status: 500 });
  }
}
