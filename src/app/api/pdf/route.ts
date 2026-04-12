// src/app/api/pdf/route.ts
// SECURITY FIX: user_uid now comes from verified session, NOT request body.
// Previous version took user_uid from data.user_uid — IDOR vulnerability
// where any authenticated user could generate PDFs for other users' scans.

import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { getPurpleReportHtml } from "@/lib/template";
import { query } from "@/config/db";
import { getActiveSubscription } from "@/lib/subscription";
import { getUid } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // ── Auth: uid ALWAYS from session, never from body ─────────────
    const uid = await getUid();
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data   = await req.json();
    const scanId = data.id ?? data.scan_id;
    const isProd = process.env.NODE_ENV === "production";

    if (!scanId) {
      return NextResponse.json({ error: "Missing scan id" }, { status: 400 });
    }

    // ── Require active subscription ───────────────────────────────
    const sub = await getActiveSubscription(uid);
    if (!sub) {
      return NextResponse.json(
        { error: "Active subscription required to generate PDF reports.", code: "NO_SUBSCRIPTION" },
        { status: 402 },
      );
    }

    // ── Check for existing report (idempotency) ───────────────────
    const existing = await query(
      `SELECT id, pdf_blob FROM reports WHERE scan_id = $1 AND user_uid = $2 AND deleted_at IS NULL LIMIT 1`,
      [scanId, uid],
    );

    if (existing.rows.length && existing.rows[0].pdf_blob) {
      const buf = Buffer.from(existing.rows[0].pdf_blob);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="pentellia-report-${scanId}.pdf"`,
          "Content-Length":      buf.length.toString(),
          "X-Cache":             "HIT",
        },
      });
    }

    // ── Fetch scan — uid enforced in WHERE clause ─────────────────
    const scanRes = await query(
      `SELECT s.*, t.name AS tool_name FROM scans s LEFT JOIN tools t ON s.tool_id = t.id
       WHERE s.id = $1 AND s.user_uid = $2 AND s.status = 'completed' LIMIT 1`,
      [scanId, uid],
    );

    if (!scanRes.rows.length) {
      return NextResponse.json({ error: "Scan not found or not completed" }, { status: 404 });
    }

    const scanData = scanRes.rows[0];
    const html     = getPurpleReportHtml({ ...scanData, ai_summary: data.ai_summary });

    // ── Generate PDF ──────────────────────────────────────────────
    let browser;
    if (isProd) {
      browser = await (puppeteer as any).launch({
        args:           chromium.args,
        executablePath: await chromium.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar",
        ),
        headless: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // ── Save to DB ────────────────────────────────────────────────
    await query(
      `INSERT INTO reports (user_uid, scan_id, pdf_blob)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [uid, scanId, pdfBuffer],
    );

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="pentellia-report-${scanId}.pdf"`,
        "Content-Length":      pdfBuffer.length.toString(),
      },
    });

  } catch (err: any) {
    console.error("[PDF]", err?.message);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
