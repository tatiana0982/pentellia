import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db"; // Assuming your DB config is here
import { adminAuth } from "@/config/firebaseAdmin"; // Assuming Firebase Admin setup
import { cookies } from "next/headers";

// Helper: Get User UID from Session
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

// GET: Fetch User Profile
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Select all necessary fields. Use COALESCE to handle nulls gracefully.
    const text = `
      SELECT 
        first_name, last_name, email, avatar, 
        company, company_size, job_role, 
        country, timezone, verified_domain
      FROM users 
      WHERE uid = $1
    `;
    const res = await query(text, [uid]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const u = res.rows[0];

    // Map DB snake_case to Frontend camelCase
    const userData = {
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      email: u.email || "",
      avatar: u.photo_url || "",
      company: u.company || "",
      size: u.company_size || "",
      role: u.job_role || "",
      country: u.country || "",
      timezone: u.timezone || "",
      verifiedDomain: u.verified_domain || "",
    };

    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT: Update User Profile
export async function PUT(req: NextRequest) {
  const uid = await getUid();
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // We construct a dynamic update query based on fields provided
    // This allows partial updates (e.g., just updating location)
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // Mapping Frontend fields to DB columns
    const fieldMap: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      company: "company",
      size: "company_size",
      role: "job_role",
      country: "country",
      timezone: "timezone",
      verifiedDomain: "verified_domain",
    };

    Object.keys(body).forEach((key) => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${idx}`);
        values.push(body[key]);
        idx++;
      }
    });

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    values.push(uid); // Add UID as the last parameter
    const text = `UPDATE users SET ${fields.join(
      ", "
    )} WHERE uid = $${idx} RETURNING *`;

    await query(text, values);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
