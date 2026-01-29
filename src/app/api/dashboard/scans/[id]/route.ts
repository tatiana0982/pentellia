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

// ------------------------------------------------------------------
// 1. GET: SYNC STATUS (The "Smart Proxy")
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
<<<<<<< HEAD
  { params }: { params: { id: string } },
=======
  { params }: { params: { id: string } }
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  try {
    // 1. Fetch current state from DB
    const dbRes = await query(
      `SELECT s.*, t.name as tool_name, t.category as tool_category 
       FROM scans s
       LEFT JOIN tools t ON s.tool_id = t.id
       WHERE s.id = $1 AND s.user_uid = $2`,
<<<<<<< HEAD
      [id, uid],
=======
      [id, uid]
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    );

    if (dbRes.rows.length === 0) {
      console.error(`[API] Scan not found in DB: ${id}`);
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    let scan = dbRes.rows[0];

    // 2. Optimization: If finished, return immediately
    if (["completed", "failed", "cancelled"].includes(scan.status)) {
      return NextResponse.json({ success: true, scan });
    }

    // 3. Sync with External Python API
    const externalJobId = scan.external_job_id;
<<<<<<< HEAD
    const toolsBaseUrl = process.env.TOOLS_BASE_URL;
=======
    const toolsBaseUrl = process.env.TOOLS_BASE_URL; // e.g. http://127.0.0.1:5000
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    const apiKey = process.env.TOOLS_API_KEY || "";

    console.log(`[API] Syncing Scan ${id} | External Job: ${externalJobId}`);
    console.log(
<<<<<<< HEAD
      `[API] Fetching Status: ${toolsBaseUrl}/status/${externalJobId}`,
=======
      `[API] Fetching Status: ${toolsBaseUrl}/status/${externalJobId}`
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    );

    const statusRes = await fetch(`${toolsBaseUrl}/status/${externalJobId}`, {
      headers: { "X-API-Key": apiKey },
    });

    // --- DEBUGGING LOGS ---
    console.log(`[API] Python Status Code: ${statusRes.status}`);

    // HANDLE ZOMBIE JOBS (404 from Python)
    if (statusRes.status === 404) {
      console.warn(
<<<<<<< HEAD
        `[API] ⚠️ Job ${externalJobId} missing on Python Server. Marking FAILED.`,
=======
        `[API] ⚠️ Job ${externalJobId} missing on Python Server. Marking FAILED.`
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
      );

      const failedResult = {
        error:
          "Job lost on external server (Server Restarted or Worker Mismatch)",
      };

      const updateRes = await query(
        `UPDATE scans SET status = 'failed', result = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
<<<<<<< HEAD
        [JSON.stringify(failedResult), id],
=======
        [JSON.stringify(failedResult), id]
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
      );

      // Update local object to return immediately
      scan = { ...scan, ...updateRes.rows[0] };
      return NextResponse.json({ success: true, scan });
    }

    if (!statusRes.ok) {
      console.error(`[API] Python Error: ${statusRes.statusText}`);
      return NextResponse.json({ success: true, scan }); // Return old DB state if API fails temporarily
    }

    const statusData = await statusRes.json();
    const newStatus = statusData.status;
<<<<<<< HEAD
    console.log(`[API] Current Python Status: ${statusData}`);
=======
    console.log(`[API] Current Python Status: ${newStatus}`);
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89

    // 4. If Completed, Fetch Results
    if (newStatus === "completed" && scan.status !== "completed") {
      console.log(`[API] Job Completed! Fetching Results...`);

      const resultRes = await fetch(
<<<<<<< HEAD
        `${toolsBaseUrl}/results/${externalJobId}?normalized=true`,
        {
          headers: { "X-API-Key": apiKey },
        },
=======
        `${toolsBaseUrl}/results/${externalJobId}`,
        {
          headers: { "X-API-Key": apiKey },
        }
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
      );
      const resultData = await resultRes.json();

      // Check if the result itself contains an error
      if (resultData.error) {
        console.error(`[API] Job Result contained Error:`, resultData.error);
        const updateRes = await query(
          `UPDATE scans SET status = 'failed', result = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
<<<<<<< HEAD
          [JSON.stringify(resultData), id],
=======
          [JSON.stringify(resultData), id]
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
        );
        scan = { ...scan, ...updateRes.rows[0] };
      } else {
        // Success Path
        const updateRes = await query(
          `UPDATE scans SET status = 'completed', result = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
<<<<<<< HEAD
          [JSON.stringify(resultData), id],
=======
          [JSON.stringify(resultData), id]
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
        );
        scan = { ...scan, ...updateRes.rows[0] };
      }
    }
<<<<<<< HEAD

    if (newStatus !== "completed") {
      // Optional: keep DB status in sync
      if (newStatus !== scan.status) {
        await query(`UPDATE scans SET status = $1 WHERE id = $2`, [
          newStatus,
          id,
        ]);
      }

      return NextResponse.json({
        success: true,
        scan,
        pythonStatus: statusData, // 👈 FULL PYTHON RESPONSE
      });
=======
    // 5. Status Update (e.g. queued -> running)
    else if (newStatus !== scan.status) {
      console.log(`[API] Updating DB Status: ${scan.status} -> ${newStatus}`);
      const updateRes = await query(
        `UPDATE scans SET status = $1 WHERE id = $2 RETURNING *`,
        [newStatus, id]
      );
      scan = { ...scan, ...updateRes.rows[0] };
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    }

    return NextResponse.json({ success: true, scan });
  } catch (error) {
    console.error("[API] Critical Get Scan Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
<<<<<<< HEAD
      { status: 500 },
    );
  }
}

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

// DELETE: Remove record from Postgres
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
=======
      { status: 500 }
    );
  }
}
// DELETE: Remove record from Postgres
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
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
<<<<<<< HEAD
      { status: 500 },
=======
      { status: 500 }
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    );
  }
}
