// src/app/api/invoice/download/route.ts
// Generates and returns a PDF invoice for a given payment.
// Uses existing Chromium PDF pipeline.
// GET /api/invoice/download?payment_id=pay_xxxxx
// GET /api/invoice/download?invoice_id=uuid

import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { query } from "@/config/db";

function invoiceHtml(inv: any, planName: string): string {
  const date = new Date(inv.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const amount = Number(inv.amount_inr).toLocaleString("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${inv.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #111; font-size: 14px; line-height: 1.5; }
  .page { max-width: 700px; margin: 0 auto; padding: 48px 40px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #f0f0f0; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-icon { width: 36px; height: 36px; background: #7c3aed; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .brand-icon svg { width: 20px; height: 20px; fill: white; }
  .brand-name { font-size: 22px; font-weight: 700; color: #111; }
  .brand-sub  { font-size: 11px; color: #888; margin-top: 1px; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 28px; font-weight: 700; color: #7c3aed; letter-spacing: -0.5px; }
  .invoice-number { font-size: 13px; color: #666; margin-top: 4px; font-family: monospace; }
  .invoice-date { font-size: 13px; color: #666; margin-top: 2px; }

  /* Status badge */
  .status-badge { display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-bottom: 32px; }
  .status-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; }

  /* Grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
  .info-block label { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; }
  .info-block p { font-size: 14px; color: #111; }
  .info-block .mono { font-family: monospace; font-size: 12px; color: #555; }

  /* Table */
  .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .table thead th { text-align: left; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 16px; background: #fafafa; border-bottom: 1px solid #e5e5e5; }
  .table thead th:last-child { text-align: right; }
  .table tbody td { padding: 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .table tbody td:last-child { text-align: right; font-weight: 600; }
  .plan-name { font-weight: 600; color: #111; }
  .plan-desc { font-size: 12px; color: #888; margin-top: 2px; }

  /* Totals */
  .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
  .totals-box { width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #666; }
  .total-row.grand { border-bottom: none; border-top: 2px solid #111; margin-top: 4px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #111; }

  /* Footer */
  .footer { padding-top: 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-note { font-size: 11px; color: #aaa; }
  .footer-brand { font-size: 11px; color: #999; }
  .purple { color: #7c3aed; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="brand">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6v6c0 5.1 3.4 9.8 8 11 4.6-1.2 8-5.9 8-11V6l-8-4z"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">Pentellia</div>
        <div class="brand-sub">Cybersecurity Platform</div>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">Invoice</div>
      <div class="invoice-number">${inv.invoice_number}</div>
      <div class="invoice-date">${date}</div>
    </div>
  </div>

  <span class="status-badge">
    <span class="status-dot"></span>
    Payment Successful
  </span>

  <div class="info-grid">
    <div class="info-block">
      <label>Billed To</label>
      <p>${inv.customer_name || "Pentellia User"}</p>
      <p class="mono">${inv.customer_email || ""}</p>
    </div>
    <div class="info-block">
      <label>Payment Details</label>
      <p class="mono">${inv.razorpay_payment_id}</p>
      <p class="mono" style="margin-top:4px; font-size:11px; color:#bbb">${inv.razorpay_order_id}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Period</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="plan-name">${planName} — Subscription</div>
          <div class="plan-desc">30-day access to Pentellia scanning platform</div>
        </td>
        <td style="color:#666; font-size:13px;">30 days</td>
        <td>${amount}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>${amount}</span></div>
      <div class="total-row"><span>Tax (0%)</span><span>₹0.00</span></div>
      <div class="total-row grand"><span>Total</span><span class="purple">${amount}</span></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-note">
      This is a computer-generated invoice.<br/>
      No signature required.
    </div>
    <div class="footer-brand">
      Pentellia · pentellia.io
    </div>
  </div>

</div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp         = new URL(req.url).searchParams;
  const paymentId  = sp.get("payment_id");
  const invoiceId  = sp.get("invoice_id");
  const format     = sp.get("format") ?? "pdf";   // pdf | html

  if (!paymentId && !invoiceId) {
    return NextResponse.json({ error: "Provide payment_id or invoice_id" }, { status: 400 });
  }

  // Try invoices table first (new payments)
  let res = await query(
    `SELECT i.*, sp.name AS plan_name
     FROM invoices i
     JOIN subscription_plans sp ON i.plan_id = sp.id
     WHERE i.user_uid = $1
       AND (i.razorpay_payment_id = $2 OR i.id::text = $3)
     LIMIT 1`,
    [uid, paymentId ?? "", invoiceId ?? ""],
  );

  // Fallback: old payments made before invoice system existed
  // Build a synthetic invoice record from razorpay_orders
  if (!res.rows.length && paymentId) {
    const orderRes = await query(
      `SELECT ro.*, sp.name AS plan_name,
              u.first_name || ' ' || u.last_name AS customer_name,
              u.email AS customer_email
       FROM razorpay_orders ro
       JOIN subscription_plans sp ON ro.plan_id = sp.id
       JOIN users u ON ro.user_uid = u.uid
       WHERE ro.user_uid = $1
         AND ro.razorpay_payment_id = $2
         AND ro.status = 'paid'
       LIMIT 1`,
      [uid, paymentId],
    );

    if (!orderRes.rows.length) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const o = orderRes.rows[0];
    // Synthesize invoice-like object for the HTML template
    res = {
      rows: [{
        razorpay_payment_id: o.razorpay_payment_id,
        razorpay_order_id:   o.razorpay_order_id,
        amount_inr:          o.amount_inr,
        plan_name:           o.plan_name,
        customer_name:       o.customer_name?.trim() || null,
        customer_email:      o.customer_email || null,
        invoice_number:      `ORD-${o.razorpay_order_id?.slice(-8).toUpperCase()}`,
        created_at:          o.paid_at ?? o.created_at,
        status:              "paid",
      }],
    } as any;
  }

  if (!res.rows.length) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const inv      = res.rows[0];
  const planName = (inv.plan_name as string).replace("Pentellia ", "");
  const html     = invoiceHtml(inv, planName);

  // Return HTML directly (browser can print-to-PDF)
  // This avoids Chromium cold start on every download
  if (format === "html") {
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="invoice-${inv.invoice_number}.html"`,
      },
    });
  }

  // PDF via Chromium (same as /api/pdf reports)
  try {
    const isProd  = process.env.NODE_ENV === "production";
    let   browser: any;

    if (isProd) {
      const chromium   = (await import("@sparticuz/chromium-min")).default;
      const puppeteer  = (await import("puppeteer-core")).default;
      const execPath   = await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar",
      );
      browser = await puppeteer.launch({
        args:           chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: execPath,
        headless:       true,
      });
    } else {
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({ headless: true });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf  = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" } });
    await browser.close();

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${inv.invoice_number}.pdf"`,
        "Content-Length":      pdf.length.toString(),
        "Cache-Control":       "private, max-age=3600",
      },
    });

  } catch (err: any) {
    console.error("[Invoice PDF] Chromium failed, falling back to HTML:", err?.message);
    // Fallback: return HTML for browser print-to-PDF
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type":        "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="invoice-${inv.invoice_number}.html"`,
      },
    });
  }
}
