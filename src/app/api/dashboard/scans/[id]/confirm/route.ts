// src/app/api/dashboard/scans/[id]/confirm/route.ts
// Forwards user confirmation responses to the Flask tools backend.
// Used by interactive tools like discovery and authtest.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";  // ← central getUid, no checkRevoked

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // getUid() — no checkRevoked, consistent with all other routes
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  try {
    const body = await req.json();
    const { action, request_id, response, selected_items } = body;

    const dbRes = await query(
      `SELECT external_job_id FROM scans WHERE id = $1 AND user_uid = $2`,
      [id, uid],
    );

    if (dbRes.rows.length === 0) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const dbJobId      = dbRes.rows[0].external_job_id;
    const toolsBaseUrl = process.env.TOOLS_BASE_URL;
    const apiKey       = process.env.TOOLS_API_KEY || "";

    if (!toolsBaseUrl) {
      return NextResponse.json({ error: "Scan engine not configured" }, { status: 503 });
    }

    let endpoint = "";
    if (action === "all") {
      endpoint = `${toolsBaseUrl}/confirm-all/${dbJobId}`;
    } else {
      if (!request_id) {
        return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
      }
      endpoint = `${toolsBaseUrl}/confirm/${dbJobId}/${request_id}`;
    }

    const payload: any = { response };
    if (selected_items) payload.selected_items = selected_items;

    const pythonRes = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    apiKey,
      },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15_000),
    });

    if (!pythonRes.ok) {
      const err = await pythonRes.text();
      return NextResponse.json(
        { error: "Confirmation failed", details: err },
        { status: pythonRes.status },
      );
    }

    const data = await pythonRes.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("[Confirm POST]", error?.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}