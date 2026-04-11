// src/app/api/tools/[id]/route.ts
// SECURITY FIX: Added authentication. Previously had NO auth — anyone could
// modify tool definitions via PUT or delete via DELETE.

import { NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

async function requireAdmin(uid: string): Promise<boolean> {
  // Check admin_users table — if table doesn't exist yet, fail closed
  try {
    const res = await query(`SELECT 1 FROM admin_users WHERE uid = $1 LIMIT 1`, [uid]);
    return res.rows.length > 0;
  } catch {
    return false; // fail closed: no admin table = no admin access
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await requireAdmin(uid)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, slug, description, long_description, category, version, params: toolParams } = body;

    const res = await query(
      `UPDATE tools SET name=$1, slug=$2, description=$3, long_description=$4,
       category=$5, version=$6, params=$7 WHERE id=$8 RETURNING *`,
      [name, slug, description, long_description, category, version, JSON.stringify(toolParams), id],
    );

    if (res.rowCount === 0) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    return NextResponse.json({ success: true, tool: res.rows[0] });
  } catch (error) {
    console.error("Update Tool Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await requireAdmin(uid)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const res = await query(`DELETE FROM tools WHERE id=$1 RETURNING id`, [id]);
    if (res.rowCount === 0) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Delete Tool Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}