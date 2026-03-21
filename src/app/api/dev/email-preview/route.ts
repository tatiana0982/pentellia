// src/app/api/dev/email-preview/route.ts
// Development-only route to preview all email templates in the browser.
// Remove or protect with auth before going to production.
// Usage: GET /api/dev/email-preview?template=welcome

import { NextRequest, NextResponse } from "next/server";
import {
  welcomeEmail,
  verifyEmailOtpEmail,
  forgotPasswordOtpEmail,
  passwordChangedEmail,
  loginAlertEmail,
  domainVerifiedEmail,
  scanStartedEmail,
  scanCompleteEmail,
  scanFailedEmail,
  creditsAddedEmail,
  lowCreditsEmail,
  creditsExhaustedEmail,
  aiSummaryGeneratedEmail,
  generalNotificationEmail,
} from "@/lib/email-templates";

// Block in production
const IS_DEV = process.env.NODE_ENV !== "production";

const NOW = new Date().toLocaleString("en-IN", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const TEMPLATES: Record<string, () => string> = {
  welcome: () => welcomeEmail("Arjun"),
  verify_otp: () => verifyEmailOtpEmail("Arjun", "847291"),
  forgot_password: () => forgotPasswordOtpEmail("Arjun", "362054"),
  password_changed: () => passwordChangedEmail("Arjun", "103.206.104.156", NOW),
  login_alert: () =>
    loginAlertEmail(
      "Arjun",
      "103.206.104.156",
      "Hyderabad, India",
      "Chrome / Windows 11",
      NOW,
    ),
  domain_verified: () => domainVerifiedEmail("Arjun", "acmecorp.com"),
  scan_started: () =>
    scanStartedEmail("Arjun", "Web Scanner", "acmecorp.com", "abc123def456", 2.0, 297.5),
  scan_complete: () =>
    scanCompleteEmail("Arjun", "Web Scanner", "acmecorp.com", "abc123def456", 14, "High"),
  scan_failed: () =>
    scanFailedEmail("Arjun", "Port Scanner", "acmecorp.com", "Target host unreachable after 30s"),
  credits_added: () =>
    creditsAddedEmail("Arjun", 499, 499, 791.5, "pay_QXdemoPaymentId", NOW),
  low_credits: () => lowCreditsEmail("Arjun", 24.5, 25),
  credits_exhausted: () => creditsExhaustedEmail("Arjun"),
  ai_summary: () =>
    aiSummaryGeneratedEmail("Arjun", "Web Scanner", "acmecorp.com", "abc123def456"),
  general: () =>
    generalNotificationEmail(
      "Arjun",
      "Scheduled Maintenance — 2 March 2026",
      "Pentellia will undergo scheduled maintenance on 2 March 2026 between 02:00 and 04:00 IST. Scanning services will be temporarily unavailable during this window. All scheduled assessments will resume automatically.",
      "Check System Status",
      "https://pentellia.io",
    ),
};

export async function GET(req: NextRequest) {
  if (!IS_DEV) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const template = searchParams.get("template");

  // Index page — list all templates
  if (!template) {
    const links = Object.keys(TEMPLATES)
      .map(
        (key) =>
          `<li style="margin:8px 0;"><a href="?template=${key}" style="color:#a78bfa;font-family:monospace;font-size:14px;">${key}</a></li>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Email Previews</title></head>
<body style="font-family:system-ui;background:#05050a;color:#c0c0d8;padding:40px;max-width:600px;margin:0 auto;">
  <p style="color:#7c3aed;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 8px;">Pentellia</p>
  <h1 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 32px;">Email Template Previews</h1>
  <ul style="list-style:none;padding:0;margin:0;">${links}</ul>
</body></html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  }

  const fn = TEMPLATES[template];
  if (!fn) {
    return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 404 });
  }

  return new NextResponse(fn(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}