// src/app/api/dashboard/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

// GET — header bell (no params) OR paginated history page (?page=N&limit=N)
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp    = new URL(req.url).searchParams;
  const page  = parseInt(sp.get("page")  || "0");
  const limit = parseInt(sp.get("limit") || "0");

  try {
    if (page > 0 && limit > 0) {
      const offset = (page - 1) * limit;
      const [rows, countRes] = await Promise.all([
        query(
          `SELECT id, title, message, type,
                  COALESCE(is_read, false) AS is_read, created_at
           FROM notifications WHERE user_uid = $1
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [uid, limit, offset],
        ),
        query(`SELECT COUNT(*) FROM notifications WHERE user_uid = $1`, [uid]),
      ]);
      const total = parseInt(countRes.rows[0].count);
      return NextResponse.json({
        success:       true,
        notifications: rows.rows,
        total,
        totalPages:    Math.ceil(total / limit),
        page,
        limit,
      });
    }

    // Default — last 20 for header bell
    const [res, unreadRes] = await Promise.all([
      query(
        `SELECT id, title, message, type,
                COALESCE(is_read, false) AS is_read, created_at
         FROM notifications WHERE user_uid = $1
         ORDER BY created_at DESC LIMIT 20`,
        [uid],
      ),
      query(
        `SELECT COUNT(*) AS cnt FROM notifications WHERE user_uid = $1 AND COALESCE(is_read, false) = FALSE`,
        [uid],
      ),
    ]);
    const unreadCount = parseInt(unreadRes.rows[0]?.cnt ?? "0");
    return NextResponse.json({ success: true, notifications: res.rows, unreadCount });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH — mark as read (single id OR all:true)
export async function PATCH(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.all) {
      await query(`UPDATE notifications SET is_read = TRUE WHERE user_uid = $1`, [uid]);
    } else if (body.id && typeof body.id === "string") {
      await query(
        `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_uid = $2`,
        [body.id, uid],
      );
    } else {
      return NextResponse.json({ error: "Missing id or all flag" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE — hard delete single notification
export async function DELETE(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  try {
    await query(
      `DELETE FROM notifications WHERE id = $1 AND user_uid = $2`,
      [body.id, uid],
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
