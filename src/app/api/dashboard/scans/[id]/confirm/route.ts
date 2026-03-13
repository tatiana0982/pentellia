import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";

async function getUid() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch (e) {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  try {
    const body = await req.json();
    
    // The frontend will now send 'response' (e.g., "all", "skip", "top_10")
    // and optionally 'selected_items' as per the PDF documentation.
    const { action, request_id, response, selected_items } = body;

    const dbRes = await query(
      `SELECT external_job_id FROM scans WHERE id = $1 AND user_uid = $2`,
      [id, uid]
    );

    if (dbRes.rows.length === 0) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const dbJobId = dbRes.rows[0].external_job_id;
    const toolsBaseUrl = process.env.TOOLS_BASE_URL;
    const apiKey = process.env.TOOLS_API_KEY || "";

    let endpoint = "";
    if (action === "all") {
      endpoint = `${toolsBaseUrl}/confirm-all/${dbJobId}`;
    } else {
      if (!request_id) {
          return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
      }
      endpoint = `${toolsBaseUrl}/confirm/${dbJobId}/${request_id}`;
    }

    // Build the exact payload expected by the Python backend
    const payload: any = { response };
    if (selected_items) {
        payload.selected_items = selected_items;
    }

    const pythonRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!pythonRes.ok) {
      const err = await pythonRes.text();
      return NextResponse.json({ error: "Confirmation Failed", details: err }, { status: pythonRes.status });
    }

    const data = await pythonRes.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API] Confirmation POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}