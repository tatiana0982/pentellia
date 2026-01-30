import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";
import { createNotification } from "@/lib/notifications"; // Ensure this path is correct

// --- Helper: Get User ID from Session ---
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

// ------------------------------------------------------------------
// POST: HANDLE CMS CONFIRMATION
// ------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  try {
    const body = await req.json();
    const { confirm, external_job_id } = body;

    // 1. Validate ownership
    const dbRes = await query(
      `SELECT external_job_id FROM scans WHERE id = $1 AND user_uid = $2`,
      [id, uid],
    );

    if (dbRes.rows.length === 0) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const dbJobId = dbRes.rows[0].external_job_id;

    // Security check: Ensure the provided job ID matches the DB
    if (external_job_id !== dbJobId) {
      return NextResponse.json({ error: "Job ID Mismatch" }, { status: 400 });
    }

    // 2. Forward request to Python Engine
    const toolsBaseUrl = process.env.TOOLS_BASE_URL;
    const apiKey = process.env.TOOLS_API_KEY || "";

    // FIX: Removed invisible characters from the URL string below
    const pythonRes = await fetch(
      `${toolsBaseUrl}/confirm-cms/${external_job_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ confirm }),
      },
    );

    if (!pythonRes.ok) {
      const err = await pythonRes.text();
      return NextResponse.json(
        { error: "Python Server Error", details: err },
        { status: pythonRes.status },
      );
    }

    const data = await pythonRes.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API] Confirmation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// ------------------------------------------------------------------
// GET: SYNC SCAN STATUS & HANDLE NOTIFICATIONS
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  try {
    // 1. Fetch current state from DB
    // We join tools to get the tool name for the notification message
    const dbRes = await query(
      `SELECT s.*, t.name as tool_name 
       FROM scans s
       LEFT JOIN tools t ON s.tool_id = t.id
       WHERE s.id = $1 AND s.user_uid = $2`,
      [id, uid],
    );

    if (dbRes.rows.length === 0) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    let scan = dbRes.rows[0];

    // 2. Optimization: If already finished, return DB result immediately
    // No need to call Python API or trigger notifications again
    if (["completed", "failed", "cancelled"].includes(scan.status)) {
      return NextResponse.json({ success: true, scan });
    }

    // 3. Sync with External Python API
    const externalJobId = scan.external_job_id;
    const toolsBaseUrl = process.env.TOOLS_BASE_URL;
    const apiKey = process.env.TOOLS_API_KEY || "";

    const statusRes = await fetch(`${toolsBaseUrl}/status/${externalJobId}`, {
      headers: { "X-API-Key": apiKey },
    });

    // --- HANDLE 404 (Zombie Job) ---
    if (statusRes.status === 404) {
      console.warn(`[API] Job ${externalJobId} missing. Marking FAILED.`);

      const updateRes = await query(
        `UPDATE scans SET status = 'failed', result = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify({ error: "Job lost on external server" }), id],
      );
      scan = { ...scan, ...updateRes.rows[0] };

      // Notify User of Failure
      await createNotification(
        uid,
        "Scan Failed",
        `The scan for ${scan.target} was lost or interrupted.`,
        "error",
      );

      return NextResponse.json({ success: true, scan });
    }

    if (!statusRes.ok) {
      // Temporary API error, just return current DB state, don't update anything
      return NextResponse.json({ success: true, scan });
    }

    const statusData = await statusRes.json();
    const newStatus = statusData.status;

    // =========================================================
    // LOGIC BLOCK: Status is NOT Completed (Running/Queued/Failed)
    // =========================================================
    if (newStatus !== "completed") {
      // Only update DB if status has changed
      if (newStatus !== scan.status) {
        // --- NOTIFICATION: Handle Explicit Failure from Python ---
        if (newStatus === "failed") {
          await createNotification(
            uid,
            "Scan Failed",
            `Scan for ${scan.target} failed. Check logs for details.`,
            "error",
          );
        }
        // ---------------------------------------------------------

        // Update DB status
        await query(`UPDATE scans SET status = $1 WHERE id = $2`, [
          newStatus,
          id,
        ]);

        // Update local object for response
        scan.status = newStatus;
      }

      // Return status + Python progress data (for progress bar)
      return NextResponse.json({
        success: true,
        scan,
        pythonStatus: statusData,
      });
    }

    // =========================================================
    // LOGIC BLOCK: Status IS Completed (Success)
    // =========================================================
    if (newStatus === "completed" && scan.status !== "completed") {
      console.log(`[API] Job Completed! Fetching Results...`);

      // A. Fetch Results
      // FIX: Added '?' before normalized=true
      const resultRes = await fetch(
        `${toolsBaseUrl}/results/${externalJobId}?normalized=true`,
        { headers: { "X-API-Key": apiKey } },
      );
      const resultData = await resultRes.json();

      // B. Check if result contains an application-level error
      if (resultData.error) {
        // Mark as failed in DB
        const updateRes = await query(
          `UPDATE scans SET status = 'failed', result = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
          [JSON.stringify(resultData), id],
        );
        scan = { ...scan, ...updateRes.rows[0] };

        // Notify Failure
        await createNotification(
          uid,
          "Scan Failed",
          `Scan for ${scan.target} failed during result generation.`,
          "error",
        );
      } else {
        // C. Success Path: Update DB
        const updateRes = await query(
          `UPDATE scans SET status = 'completed', result = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
          [JSON.stringify(resultData), id],
        );
        scan = { ...scan, ...updateRes.rows[0] };

        // --- NOTIFICATION: Scan Completed Successfully ---
        await createNotification(
          uid,
          "Scan Completed",
          `Scan finished successfully for ${scan.target}. Click to view report.`,
          "success",
        );
        // -------------------------------------------------
      }
    }

    return NextResponse.json({ success: true, scan });
  } catch (error) {
    console.error("[API] Get Scan Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE: Remove record from Postgres
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await Promise.resolve(params);

  try {
    const text = `DELETE FROM scans WHERE id = $1 AND user_uid = $2 RETURNING *`;
    const res = await query(text, [id, uid]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Scan deleted from history",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
