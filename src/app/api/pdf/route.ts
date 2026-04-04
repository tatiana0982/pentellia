// src/app/api/pdf/route.ts
// PDF report generation — original puppeteer/chromium structure preserved.
// ACID billing: ₹100 (from pricing_rates DB) deducted ONLY after PDF is
// successfully generated and saved. If generation fails, zero deduction.
//
// Idempotency: re-downloading the same report (same scan_id) is free.
// One ₹100 charge per scan_id, enforced via credit_transactions check.

import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { getPurpleReportHtml } from "@/lib/template";
import { query } from "@/config/db";
import { getRate, deductCredits, isReportAlreadyCharged } from "@/lib/credits";

export async function POST(req: Request) {
  try {
    const data     = await req.json();
    const isProd   = process.env.NODE_ENV === "production";
    const user_uid = data.user_uid;
    const scanId   = data.id;

    if (!user_uid || !scanId) {
      return NextResponse.json({ error: "Missing user_uid or scan id" }, { status: 400 });
    }

    // ── STEP 1: Generate PDF — original logic untouched ──────────────
    const browser = await puppeteer.launch({
      args:            isProd ? chromium.args : [],
      defaultViewport: chromium.defaultViewport,
      // JUGAD: Pass the direct URL to the chromium pack
      // This solves the "bin does not exist" error permanently
      executablePath: await chromium.executablePath(
        isProd
          ? "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
          : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      ),
      headless: isProd ? chromium.headless : true,
    });

    const page = await browser.newPage();

    // Pass your JSON payload to the 9-page template
    const htmlContent = getPurpleReportHtml(data);

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer: any = await page.pdf({
      format:          "A4",
      printBackground: true,
      margin:          { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    await browser.close();

    // ── STEP 2: Save to DB ────────────────────────────────────────────
    await query(
      `INSERT INTO reports (user_uid, scan_id, pdf_blob)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [user_uid, scanId, pdfBuffer],
    );

    // ── STEP 3: Charge ₹100 AFTER successful generation ───────────────
    // ACID compliance: generation succeeded → now deduct.
    // If this block fails, user still gets their PDF — we log the error
    // for manual reconciliation rather than withholding the report.
    try {
      const alreadyCharged = await isReportAlreadyCharged(scanId);
      if (!alreadyCharged) {
        const reportRate = await getRate("report");
        await deductCredits(
          user_uid,
          reportRate,
          `Report generation`,
          "report",
          scanId,
        );
      }
    } catch (billingErr) {
      // Non-fatal: PDF already generated and saved. Log for reconciliation.
      console.error(`[PDF Billing] Failed to charge report for scan ${scanId}:`, billingErr);
    }

    // ── STEP 4: Return PDF ────────────────────────────────────────────
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": 'attachment; filename="Security_Assessment.pdf"',
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}