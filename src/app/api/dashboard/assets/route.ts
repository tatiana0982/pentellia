// src/app/api/dashboard/assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// ─── XSS sanitizer — strips HTML tags and control characters ─────────
function sanitize(val: unknown, maxLen = 512): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/[\x00-\x1F\x7F]/g, "") // strip control chars
    .trim()
    .slice(0, maxLen);
}

const ALLOWED_TYPES = new Set(["URL", "IP", "Domain", "CIDR", "API"]);

// ─── GET ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = new URL(req.url).searchParams;
  const page   = Math.max(1, parseInt(sp.get("page")  || "1"));
  const limit  = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "10")));
  const offset = (page - 1) * limit;

  try {
    const [assetsRes, countRes] = await Promise.all([
      query(
        `SELECT id, name, endpoint, context, type, risk_level, status, created_at
         FROM assets WHERE user_uid = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(`SELECT COUNT(*) FROM assets WHERE user_uid = $1`, [uid]),
    ]);

    const totalAssets = parseInt(countRes.rows[0].count);
    return NextResponse.json({
      success: true,
      assets:  assetsRes.rows,
      pagination: { page, limit, totalAssets, totalPages: Math.ceil(totalAssets / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name     = sanitize(body?.name,     128);
  const endpoint = sanitize(body?.endpoint, 512);
  const context  = sanitize(body?.context,  1024);
  const type     = sanitize(body?.type,     32);

  if (!name || !endpoint || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Whitelist asset types
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
  }

  try {
    const res = await query(
      `INSERT INTO assets (user_uid, name, endpoint, context, type, risk_level, status)
       VALUES ($1, $2, $3, $4, $5, 'Low', 'Active') RETURNING *`,
      [uid, name, endpoint, context, type],
    );
    return NextResponse.json({ success: true, asset: res.rows[0] });
  } catch {
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id } = body;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing asset ID" }, { status: 400 });
  }

  try {
    const res = await query(
      `DELETE FROM assets WHERE id = $1 AND user_uid = $2 RETURNING id`,
      [id, uid],
    );
    if (!res.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
