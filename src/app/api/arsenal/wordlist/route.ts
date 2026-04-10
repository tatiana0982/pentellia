// src/app/api/arsenal/wordlist/route.ts
// Backend proxy for SecLists wordlists from raw.githubusercontent.com.
// Fetches server-side so frontend CSP doesn't need to allow GitHub.
// Caches on Vercel edge (s-maxage) to avoid hammering GitHub.

import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";

// Allowlist of permitted GitHub raw URLs — never allow arbitrary URLs
const ALLOWED_PATHS = new Set([
  "Passwords/Common-Credentials/10k-most-common.txt",
  "Passwords/Common-Credentials/top-20-common-SSH-passwords.txt",
  "Passwords/Default-Credentials/default-passwords.csv",
  "Passwords/WiFi-WPA/probable-v2-wpa-top4800.txt",
  "Discovery/DNS/subdomains-top1million-5000.txt",
  "Discovery/Web-Content/common.txt",
  "Discovery/Web-Content/api/api-endpoints.txt",
  "Discovery/Web-Content/directory-list-2.3-small.txt",
  "Usernames/top-usernames-shortlist.txt",
  "Usernames/Names/names.txt",
  "Fuzzing/XSS/XSS-Jhaddix.txt",
  "Fuzzing/SQLi/Generic-SQLi.txt",
  "Fuzzing/LFI/LFI-gracefulsecurity-linux.txt",
  "Fuzzing/SSRF.txt",
]);

const GITHUB_BASE = "https://raw.githubusercontent.com/danielmiessler/SecLists/master";
// Max lines to return (preview mode — saves bandwidth)
const MAX_LINES = 500;

export async function GET(req: NextRequest) {
  // Require valid session — wordlists are a paid feature
  const uid = await getUid();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = new URL(req.url).searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Sanitize — only allow explicitly whitelisted paths
  const cleanPath = path.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!ALLOWED_PATHS.has(cleanPath)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  const url = `${GITHUB_BASE}/${cleanPath}`;

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Pentellia/1.0" },
      // Server-side fetch — no CSP restriction
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `GitHub returned ${upstream.status}` },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const text  = await upstream.text();
    const lines = text.split("\n").slice(0, MAX_LINES).join("\n");
    const total = text.split("\n").filter(Boolean).length;

    return new NextResponse(
      JSON.stringify({ success: true, content: lines, total, preview: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // Cache for 1 hour on Vercel CDN — wordlists don't change often
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err: any) {
    console.error("[Arsenal proxy] fetch failed:", err?.message);
    return NextResponse.json({ error: "Failed to fetch wordlist" }, { status: 502 });
  }
}