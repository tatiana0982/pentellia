<<<<<<< HEAD
// src/app/api/users/route.ts
=======
// src/app/api/profile/route.ts (or wherever this file is)
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";

async function getUid() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
<<<<<<< HEAD
    // PERFORMANCE FIX: Set checkRevoked to false to avoid external network calls on every request.
=======
    // PERFORMANCE FIX: Set checkRevoked to false.
    // This removes the external network call to Firebase on every request.
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, false);
    return decoded.uid;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
<<<<<<< HEAD
  const start = Date.now();
  const uid = await getUid();

  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // We do NOT select 'avatar' (the blob) here to keep this query extremely fast.
=======
  const start = Date.now(); // Debug timing
  const uid = await getUid();

  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // PERFORMANCE FIX: Do NOT select 'avatar' here.
    // Fetching binary blobs converts 50ms queries into 2000ms queries.
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
    const text = `
      SELECT first_name, last_name, email, company, size, role, country, timezone, verified_domain
      FROM users WHERE uid = $1
    `;
    const res = await query(text, [uid]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const u = res.rows[0];

<<<<<<< HEAD
    return NextResponse.json({
      success: true,
      user: {
        firstName: u.first_name || "",
        lastName: u.last_name || "",
        email: u.email || "",
        company: u.company || "",
        size: u.size || "",
        role: u.role || "",
        country: u.country || "",
        timezone: u.timezone || "",
        verifiedDomain: u.verified_domain || "",
      },
    });
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // 1. Map Frontend keys to Database columns
    const fieldMap: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      company: "company",
      size: "size",
      role: "role",
      country: "country",
      timezone: "timezone",
      verifiedDomain: "verified_domain",
      avatar: "avatar", // This is the blob column
    };

    for (const [key, value] of Object.entries(body)) {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${idx}`);
        
        // 2. Special handling for Avatar (Base64 to Buffer)
        if (key === "avatar" && typeof value === "string") {
          // Check if it's a base64 data URL
          const base64Data = value.replace(/^data:image\/\w+;base64,/, "");
          values.push(Buffer.from(base64Data, "base64"));
        } else {
          values.push(value);
        }
        
        idx++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    // 3. Execute the Dynamic Update
    values.push(uid);
    const sql = `
      UPDATE users 
      SET ${fields.join(", ")}, updated_at = NOW() 
      WHERE uid = $${idx} 
      RETURNING uid
    `;

    const res = await query(sql, values);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Update failed: User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
=======
    // NOTE: If you really need the avatar, create a separate API route: /api/user/avatar
    // Or prefer using a cloud storage URL (S3/Firebase) instead of binary in DB.

    const userData = {
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      email: u.email || "",
      // avatar: "/api/user/avatar", // <--- Load this lazily via <img> tag
      company: u.company || "",
      size: u.size || "",
      role: u.role || "",
      country: u.country || "",
      timezone: u.timezone || "",
      verifiedDomain: u.verified_domain || "",
    };

    console.log(`Profile fetch took: ${Date.now() - start}ms`);
    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
