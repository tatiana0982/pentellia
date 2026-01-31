import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { getPurpleReportHtml } from "@/lib/template";
import { query } from "@/config/db";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const isProd = process.env.NODE_ENV === "production";
    const user_uid = data.user_uid;
    const scanId = data.id;
    const browser = await puppeteer.launch({
      args: isProd ? chromium.args : [],
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
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    await browser.close();

    const insertQuery = `
          INSERT INTO reports (user_uid, scan_id, pdf_blob)
          VALUES ($1, $2, $3)
          RETURNING id
        `;

    await query(insertQuery, [user_uid, scanId, pdfBuffer]);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Security_Assessment.pdf"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
