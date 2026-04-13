// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

function sanitize(val: unknown, maxLen = 256): string {
  if (typeof val !== "string") return "";
  return val.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

const FIELD_MAP: Record<string, string> = {
  firstName:      "first_name",
  lastName:       "last_name",
  company:        "company",
  size:           "size",
  role:           "role",
  country:        "country",
  timezone:       "timezone",
  phone:          "phone",
  industry:       "industry",
  preferredLang:  "preferred_lang",
  yearsInSec:     "years_in_sec",
  secRole:        "sec_role",
  certifications: "certifications",
  focusAreas:     "focus_areas",
  bio:            "bio",
  website:        "website",
  linkedin:       "linkedin",
  twitter:        "twitter",
  github:         "github",
  avatar:         "avatar",
};

// ─── GET ─────────────────────────────────────────────────────────────
export async function GET() {
  const uid = await getUid();
  // Return 200 with null — never 401 on GET.
  // Dashboard/subscription page calls this on mount; a 401 floods the console
  // during Razorpay COOP popup isolation when cookies are briefly inaccessible.
  if (!uid) return NextResponse.json({ success: false, user: null }, { status: 200 });

  try {
    const res = await query(
      `SELECT first_name, last_name, email, company, size, role,
              country, timezone, phone, industry, preferred_lang,
              years_in_sec, sec_role, certifications, focus_areas,
              bio, website, linkedin, twitter, github,
              (avatar IS NOT NULL AND length(avatar) > 0) AS has_avatar,
              created_at, updated_at
       FROM users WHERE uid = $1`,
      [uid],
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const u = res.rows[0];
    return NextResponse.json({
      success: true,
      user: {
        firstName:      u.first_name      || "",
        lastName:       u.last_name       || "",
        email:          u.email           || "",
        company:        u.company         || "",
        size:           u.size            || "",
        role:           u.role            || "",
        country:        u.country         || "",
        timezone:       u.timezone        || "",
        phone:          u.phone           || "",
        industry:       u.industry        || "",
        preferredLang:  u.preferred_lang  || "en",
        yearsInSec:     u.years_in_sec    || "",
        secRole:        u.sec_role        || "",
        certifications: u.certifications  || "",
        focusAreas:     u.focus_areas     || "",
        bio:            u.bio             || "",
        website:        u.website         || "",
        linkedin:       u.linkedin        || "",
        twitter:        u.twitter         || "",
        github:         u.github          || "",
        hasAvatar:      !!u.has_avatar,     // ← tells client whether DB has a photo
        createdAt:      u.created_at,
        updatedAt:      u.updated_at,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const setClauses: string[] = [];
  const values:     any[]    = [];
  let   idx = 1;

  for (const [key, value] of Object.entries(body)) {
    const col = FIELD_MAP[key];
    if (!col) continue;

    if (key === "avatar" && typeof value === "string") {
      const b64 = (value as string).replace(/^data:image\/\w+;base64,/, "");
      if (!b64) continue;
      if (b64.length > 533_000) {
        return NextResponse.json(
          { error: "Avatar image must be under 400 KB" },
          { status: 413 },
        );
      }
      setClauses.push(`${col} = $${idx}`);
      values.push(Buffer.from(b64, "base64"));
    } else {
      setClauses.push(`${col} = $${idx}`);
      values.push(typeof value === "string" ? sanitize(value) : (value ?? null));
    }
    idx++;
  }

  if (!setClauses.length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  values.push(uid);
  try {
    await query(
      `UPDATE users SET ${setClauses.join(", ")}, updated_at = NOW() WHERE uid = $${idx}`,
      values,
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}