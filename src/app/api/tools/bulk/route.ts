// src/app/api/tools/bulk/route.ts
// SECURITY FIX: Added admin authentication.
// Previously had NO auth — anyone could bulk-insert tool definitions.

import { NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

async function requireAdmin(uid: string): Promise<boolean> {
  try {
    const res = await query(`SELECT 1 FROM admin_users WHERE uid = $1 LIMIT 1`, [uid]);
    return res.rows.length > 0;
  } catch { return false; }
}

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await requireAdmin(uid)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const tools = await req.json();
    if (!Array.isArray(tools) || tools.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const values: any[] = [];
    const placeholders = tools.map((tool, index) => {
      const base = index * 8;
      values.push(tool.id, tool.name, tool.slug, tool.description, tool.long_description, tool.category, tool.version, JSON.stringify(tool.params));
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8})`;
    });

    const res = await query(
      `INSERT INTO tools (id, name, slug, description, long_description, category, version, params)
       VALUES ${placeholders.join(",")} RETURNING id`,
      values,
    );
    return NextResponse.json({ success: true, inserted: res.rowCount });
  } catch (error) {
    console.error("Bulk Insert Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
