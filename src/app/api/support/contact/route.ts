// src/app/api/support/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { query } from "@/config/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { subject, category, message, priority } = body;
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const userRes = await query(
    `SELECT first_name, last_name, email, company FROM users WHERE uid = $1`, [uid],
  ).catch(() => null);
  const user = userRes?.rows?.[0] ?? {};

  const adminEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return NextResponse.json({ error: "Email not configured" }, { status: 503 });

  const priorityColors: Record<string, string> = {
    low: "#3b82f6", medium: "#f59e0b", high: "#ef4444", critical: "#7c3aed",
  };
  const pc = priorityColors[priority] || "#f59e0b";

  const html = `<div style="font-family:sans-serif;max-width:620px;margin:0 auto;background:#08080f;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid rgba(139,92,246,0.2);">
      <h2 style="color:#a78bfa;margin:0 0 4px;">Pentellia — Support Ticket</h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Submitted from the platform dashboard</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <tr><td style="padding:8px 12px;background:#1e1b4b;color:#94a3b8;width:110px;">From</td><td style="padding:8px 12px;background:#0f0f1a;">${user.first_name || ""} ${user.last_name || ""} &lt;${user.email || uid}&gt;</td></tr>
        <tr><td style="padding:8px 12px;background:#1e1b4b;color:#94a3b8;">Company</td><td style="padding:8px 12px;background:#0f0f1a;">${user.company || "—"}</td></tr>
        <tr><td style="padding:8px 12px;background:#1e1b4b;color:#94a3b8;">User UID</td><td style="padding:8px 12px;background:#0f0f1a;font-family:monospace;font-size:11px;">${uid}</td></tr>
        <tr><td style="padding:8px 12px;background:#1e1b4b;color:#94a3b8;">Category</td><td style="padding:8px 12px;background:#0f0f1a;">${category || "General"}</td></tr>
        <tr><td style="padding:8px 12px;background:#1e1b4b;color:#94a3b8;">Priority</td><td style="padding:8px 12px;background:#0f0f1a;"><span style="background:${pc}25;color:${pc};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;">${priority || "medium"}</span></td></tr>
      </table>
      <h3 style="color:#a78bfa;font-size:15px;margin:0 0 12px;">${subject.replace(/</g,"&lt;")}</h3>
      <div style="background:#0f0f1a;border-left:3px solid #a78bfa;padding:16px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.8;white-space:pre-wrap;">${message.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
      <p style="color:#475569;font-size:11px;margin:20px 0 0;text-align:right;">Sent: ${new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</p>
    </div>`;

  const sent = await sendEmail(adminEmail, `[Pentellia Support] [${(priority||"MEDIUM").toUpperCase()}] ${subject}`, html).catch(() => false);
  if (sent === false) return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  return NextResponse.json({ success: true });
}