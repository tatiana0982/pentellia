// src/app/api/arsenal/wordlist/route.ts
// Backend proxy for SecLists. Frontend CSP blocks GitHub — this route fetches server-side.

import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawPath   = new URL(req.url).searchParams.get("path");
  if (!rawPath)   return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const cleanPath = rawPath.replace(/^\/+/, "").replace(/\.\./g, "").trim();
  if (!ALLOWED_PATHS.has(cleanPath)) {
    return NextResponse.json({ error: "Path not in allowlist" }, { status: 403 });
  }

  try {
    const upstream = await fetch(`${GITHUB_BASE}/${cleanPath}`, {
      headers: { "User-Agent": "Pentellia/1.0" },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `GitHub returned ${upstream.status}` }, { status: upstream.status === 404 ? 404 : 502 });
    }

    const text     = await upstream.text();
    const lines    = text.split("\n").filter(l => l.trim());
    const preview  = lines.slice(0, 500).join("\n");

    return new NextResponse(
      JSON.stringify({ success: true, content: preview, total: lines.length, preview: true }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err: any) {
    console.error("[Arsenal proxy]", err?.message);
    return NextResponse.json({ error: "Failed to fetch wordlist" }, { status: 502 });
  }
}