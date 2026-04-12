// src/lib/email-templates.ts
// Professional email template system for Pentellia Security Platform
// All templates share a common base layout — dark/purple brand theme
// Tone: professional, credible, enterprise-grade — no emoji, no casual language

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pentellia.io";
const SUPPORT_EMAIL = "pentellia@encoderspro.com";
const YEAR = new Date().getFullYear();
// BASE LAYOUT
// Shared shell used by every template. Accepts a content block.

function base(options: {
  previewText: string;
  headerLabel: string;
  headerSubtitle?: string;
  accentColor?: string;         // default: #7c3aed (violet-600)
  topBarColor?: string;         // default: same as accent
  content: string;
  footerNote?: string;
}): string {
  const accent = options.accentColor ?? "#7c3aed";
  const bar = options.topBarColor ?? accent;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${options.previewText}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #05050a; }
    a { color: ${accent}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-body-pad { padding: 32px 24px !important; }
      .cta-button { display: block !important; text-align: center !important; }
      .meta-grid td { display: block !important; width: 100% !important; padding-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#05050a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Preview text (hidden) -->
  <div style="display:none;font-size:1px;color:#05050a;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${options.previewText}&#160;&#847; &#160;&#847; &#160;&#847; &#160;&#847; &#160;&#847;
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px 40px 16px;background-color:#05050a;">

        <!-- Email container -->
        <table class="email-container" role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"
          style="max-width:560px;width:100%;">

          <!-- Top accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,${bar},${bar}cc);height:3px;border-radius:3px 3px 0 0;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:#0b0c18;padding:36px 48px 32px 48px;border-left:1px solid rgba(124,58,237,0.15);border-right:1px solid rgba(124,58,237,0.15);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
                      <span style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;">
                        <span style="color:${accent};">&#9632;</span>&nbsp;Pentellia
                      </span>
                    </a>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#4a4a6a;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;">
                      Security Intelligence
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero band -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f0b1f 0%,#120d22 50%,#0b0c18 100%);padding:40px 48px 36px 48px;border-left:1px solid rgba(124,58,237,0.15);border-right:1px solid rgba(124,58,237,0.15);">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${accent};">
                ${options.headerLabel}
              </p>
              ${
                options.headerSubtitle
                  ? `<p style="margin:0;font-size:22px;font-weight:700;color:#f1f0f8;line-height:1.3;letter-spacing:-0.3px;">
                      ${options.headerSubtitle}
                    </p>`
                  : ""
              }
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body-pad" style="background-color:#0b0c18;padding:40px 48px;border-left:1px solid rgba(124,58,237,0.15);border-right:1px solid rgba(124,58,237,0.15);">
              ${options.content}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background-color:#0b0c18;padding:0 48px;border-left:1px solid rgba(124,58,237,0.15);border-right:1px solid rgba(124,58,237,0.15);">
              <hr style="border:0;border-top:1px solid rgba(255,255,255,0.06);margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#080910;padding:28px 48px;border-left:1px solid rgba(124,58,237,0.12);border-right:1px solid rgba(124,58,237,0.12);border-bottom:1px solid rgba(124,58,237,0.12);border-radius:0 0 8px 8px;">
              ${
                options.footerNote
                  ? `<p style="margin:0 0 14px 0;font-size:12px;color:#5a5a7a;line-height:1.6;">${options.footerNote}</p>
                     <hr style="border:0;border-top:1px solid rgba(255,255,255,0.04);margin:0 0 14px 0;" />`
                  : ""
              }
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#3a3a5a;line-height:1.7;">
                      Pentellia Security &mdash; Cybersecurity Intelligence Platform<br />
                      <a href="${APP_URL}" style="color:#4a4a7a;text-decoration:none;">${APP_URL}</a>
                      &nbsp;&bull;&nbsp;
                      <a href="mailto:${SUPPORT_EMAIL}" style="color:#4a4a7a;text-decoration:none;">${SUPPORT_EMAIL}</a>
                    </p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:11px;color:#3a3a5a;">&copy; ${YEAR} Pentellia</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
// SHARED COMPONENTS

function para(text: string, muted = false): string {
  const color = muted ? "#8a8aaa" : "#c8c8e0";
  return `<p style="margin:0 0 20px 0;font-size:15px;color:${color};line-height:1.7;">${text}</p>`;
}

function ctaButton(label: string, href: string, accent = "#7c3aed"): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="border-radius:6px;background:${accent};">
          <a href="${href}" class="cta-button" target="_blank"
            style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;letter-spacing:0.2px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function infoBox(rows: { label: string; value: string }[], accent = "#7c3aed"): string {
  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#5a5a7a;">${r.label}</span>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;">
          <span style="font-size:13px;color:#d0d0e8;font-weight:500;">${r.value}</span>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="border:1px solid rgba(124,58,237,0.2);border-radius:8px;background-color:#0f0b1f;margin:0 0 24px 0;overflow:hidden;">
      ${rowsHtml}
    </table>`;
}

function otpBox(otp: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="background:#0f0b1f;border:1px solid rgba(124,58,237,0.3);border-radius:8px;margin:24px 0;overflow:hidden;">
      <tr>
        <td style="padding:28px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#5a5a7a;">
            One-Time Passcode
          </p>
          <p style="margin:0;font-size:38px;font-weight:700;letter-spacing:14px;color:#a78bfa;font-family:'Courier New',Courier,monospace;">
            ${otp}
          </p>
        </td>
      </tr>
    </table>`;
}

function warningBox(text: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="border-left:3px solid #f59e0b;background:rgba(245,158,11,0.06);border-radius:0 6px 6px 0;margin:0 0 24px 0;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#d4a84b;line-height:1.6;">${text}</p>
        </td>
      </tr>
    </table>`;
}

function alertBox(text: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="border-left:3px solid #ef4444;background:rgba(239,68,68,0.06);border-radius:0 6px 6px 0;margin:0 0 24px 0;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#f87171;line-height:1.6;">${text}</p>
        </td>
      </tr>
    </table>`;
}

function successBox(text: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="border-left:3px solid #10b981;background:rgba(16,185,129,0.06);border-radius:0 6px 6px 0;margin:0 0 24px 0;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#6ee7b7;line-height:1.6;">${text}</p>
        </td>
      </tr>
    </table>`;
}

function featureList(items: string[]): string {
  const listItems = items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#7c3aed;margin-top:5px;"></span>
              </td>
              <td>
                <span style="font-size:14px;color:#c0c0d8;line-height:1.6;">${item}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
      ${listItems}
    </table>`;
}
// 1. WELCOME — sent on first sign-up

export function welcomeEmail(firstName: string): string {
  return base({
    previewText: `Welcome to Pentellia — your security intelligence platform is ready.`,
    headerLabel: "Welcome to Pentellia",
    headerSubtitle: `Your infrastructure security command centre is ready, ${firstName}.`,
    content: `
      ${para(`Thank you for joining Pentellia. Your account has been created and you now have access to our full suite of security intelligence tools — purpose-built for teams that take infrastructure protection seriously.`)}
      ${para(`To begin securing your assets, complete two quick steps:`)}
      ${featureList([
        "Verify your domain to unlock scanning capabilities",
        "Add credits to your wallet to run your first assessment",
      ])}
      ${ctaButton("Access Your Dashboard", `${APP_URL}/dashboard`)}
      ${para(`If you have any questions or need assistance getting started, our team is available at <a href="mailto:${SUPPORT_EMAIL}" style="color:#a78bfa;">${SUPPORT_EMAIL}</a>.`, true)}
    `,
    footerNote: `You received this message because an account was created at Pentellia using this email address. If this was not you, please contact us immediately.`,
  });
}
// 2. OTP — email verification on signup

export function verifyEmailOtpEmail(firstName: string, otp: string): string {
  return base({
    previewText: `Your Pentellia email verification code: ${otp}`,
    headerLabel: "Email Verification",
    headerSubtitle: "Confirm your email address to activate your account.",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`Use the passcode below to verify your email address. This code is valid for <strong style="color:#c0c0d8;">10 minutes</strong> and may only be used once.`)}
      ${otpBox(otp)}
      ${warningBox(`If you did not create a Pentellia account, you can safely disregard this message. No action is required.`)}
      ${para(`Do not share this code with anyone. Pentellia will never ask for your passcode by phone or email.`, true)}
    `,
    footerNote: `This is an automated security message. Do not reply to this email.`,
  });
}
// 3. FORGOT PASSWORD — OTP to reset password

export function forgotPasswordOtpEmail(firstName: string, otp: string): string {
  return base({
    previewText: `Your Pentellia password reset code: ${otp}`,
    headerLabel: "Password Reset Request",
    headerSubtitle: "A request was made to reset your account password.",
    accentColor: "#6366f1",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`We received a request to reset the password associated with this email address. Use the passcode below to proceed. This code expires in <strong style="color:#c0c0d8;">10 minutes</strong>.`)}
      ${otpBox(otp)}
      ${alertBox(`If you did not request a password reset, your account credentials may be at risk. We recommend logging in and reviewing your recent activity immediately. Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#f87171;">${SUPPORT_EMAIL}</a> if you need assistance.`)}
      ${para(`Do not share this code with anyone. Pentellia staff will never request your passcode.`, true)}
    `,
    footerNote: `This is an automated security message from Pentellia. Do not reply to this email.`,
  });
}
// 4. PASSWORD CHANGED — alert after password update

export function passwordChangedEmail(
  firstName: string,
  ipAddress: string,
  timestamp: string,
): string {
  return base({
    previewText: `Your Pentellia account password was changed.`,
    headerLabel: "Security Alert",
    headerSubtitle: "Your account password has been updated.",
    accentColor: "#ef4444",
    topBarColor: "#dc2626",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`The password for your Pentellia account was successfully changed. If you made this change, no further action is required.`)}
      ${infoBox([
        { label: "Event", value: "Password Changed" },
        { label: "IP Address", value: ipAddress },
        { label: "Date & Time", value: timestamp },
      ], "#ef4444")}
      ${alertBox(`If you did not change your password, your account may have been compromised. Please contact our security team immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color:#f87171;">${SUPPORT_EMAIL}</a> and do not delay.`)}
      ${ctaButton("Secure My Account", `${APP_URL}/account/user-settings`, "#dc2626")}
    `,
    footerNote: `This security notification was sent to protect your Pentellia account. It cannot be disabled.`,
  });
}
// 5. LOGIN ALERT — new device or location

export function loginAlertEmail(
  firstName: string,
  ipAddress: string,
  location: string,
  userAgent: string,
  timestamp: string,
): string {
  return base({
    previewText: `New login detected on your Pentellia account.`,
    headerLabel: "Login Notification",
    headerSubtitle: "A sign-in to your account was recorded.",
    accentColor: "#6366f1",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`A successful sign-in was recorded for your Pentellia account. Review the details below. If this was you, no action is required.`)}
      ${infoBox([
        { label: "IP Address", value: ipAddress },
        { label: "Location", value: location || "Unknown" },
        { label: "Device", value: userAgent.split(")")[0].replace("(", "").trim() || "Unknown" },
        { label: "Date & Time", value: timestamp },
      ], "#6366f1")}
      ${warningBox(`If you do not recognise this sign-in, change your password immediately and contact our team at <a href="mailto:${SUPPORT_EMAIL}" style="color:#d4a84b;">${SUPPORT_EMAIL}</a>.`)}
      ${ctaButton("View Account Security", `${APP_URL}/account/login-history`, "#6366f1")}
    `,
    footerNote: `Login notifications help protect your account. Contact support to adjust your notification preferences.`,
  });
}
// 6. DOMAIN VERIFIED — domain ownership confirmed

export function domainVerifiedEmail(firstName: string, domainName: string): string {
  return base({
    previewText: `Domain verified — ${domainName} is now authorised on Pentellia.`,
    headerLabel: "Domain Verified",
    headerSubtitle: `${domainName} has been successfully verified.`,
    accentColor: "#059669",
    topBarColor: "#047857",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`Your domain <strong style="color:#c0c0d8;">${domainName}</strong> has been verified and is now authorised on the Pentellia platform. You have full access to all scanning and monitoring capabilities.`)}
      ${successBox(`Domain ownership confirmed. All security tools are now active for <strong style="color:#6ee7b7;">${domainName}</strong>.`)}
      ${para(`The following capabilities are now available:`)}
      ${featureList([
        "Vulnerability scanning across all supported tool categories",
        "Asset discovery and attack surface monitoring",
        "AI-powered executive security reports",
        "Automated threat detection and alerting",
      ])}
      ${ctaButton("Launch a Scan", `${APP_URL}/dashboard/new-scan`, "#059669")}
    `,
    footerNote: `If you did not authorise this domain, contact us at ${SUPPORT_EMAIL} immediately.`,
  });
}
// 7. SCAN STARTED — confirmation when a scan is queued

export function scanStartedEmail(
  firstName: string,
  tool: string,
  target: string,
  scanId: string,
  creditsDeducted: number,
  balanceAfter: number,
): string {
  return base({
    previewText: `Scan initiated — ${tool} running against ${target}.`,
    headerLabel: "Scan Initiated",
    headerSubtitle: `Your security assessment has been queued.`,
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`Your scan request has been accepted and is now processing. You will receive a notification when the assessment is complete.`)}
      ${infoBox([
        { label: "Tool", value: tool },
        { label: "Target", value: target },
        { label: "Scan ID", value: scanId.slice(0, 16).toUpperCase() + "..." },
        { label: "Credits Deducted", value: `\u20B9${creditsDeducted.toFixed(2)}` },
        { label: "Remaining Balance", value: `\u20B9${balanceAfter.toFixed(2)}` },
      ])}
      ${para(`Scan duration varies by tool and target complexity. Most assessments complete within 2 to 15 minutes. You will be notified automatically upon completion.`, true)}
      ${ctaButton("Monitor Scan Progress", `${APP_URL}/dashboard/scans`)}
    `,
    footerNote: `Credits are non-refundable once a scan has been queued and accepted by the processing engine.`,
  });
}
// 8. SCAN COMPLETE — results available

export function scanCompleteEmail(
  firstName: string,
  tool: string,
  target: string,
  scanId: string,
  findingCount: number,
  riskLevel: string,
): string {
  const riskColor =
    riskLevel.toLowerCase() === "critical"
      ? "#ef4444"
      : riskLevel.toLowerCase() === "high"
        ? "#f97316"
        : riskLevel.toLowerCase() === "medium"
          ? "#eab308"
          : "#10b981";

  return base({
    previewText: `Scan complete — ${findingCount} finding${findingCount !== 1 ? "s" : ""} identified for ${target}.`,
    headerLabel: "Scan Complete",
    headerSubtitle: `Your ${tool} assessment has finished.`,
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`The security assessment you initiated has completed. Your report is available in the dashboard for review, export, and AI-assisted analysis.`)}
      ${infoBox([
        { label: "Tool", value: tool },
        { label: "Target", value: target },
        { label: "Total Findings", value: findingCount.toString() },
        { label: "Risk Level", value: `<span style="color:${riskColor};font-weight:600;">${riskLevel}</span>` },
      ])}
      ${para(`We recommend reviewing all findings and prioritising remediation based on severity. Use the AI Summary feature to generate an executive-grade analysis of the results.`, true)}
      ${ctaButton("View Full Report", `${APP_URL}/dashboard/scans`)}
    `,
    footerNote: `Findings are provided for informational purposes. Always validate results in your specific environment before taking action.`,
  });
}
// 9. SCAN FAILED — scan encountered an error

export function scanFailedEmail(
  firstName: string,
  tool: string,
  target: string,
  reason: string,
): string {
  return base({
    previewText: `Scan failed — ${tool} could not complete for ${target}.`,
    headerLabel: "Scan Failed",
    headerSubtitle: `An error occurred during your security assessment.`,
    accentColor: "#dc2626",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`Unfortunately, the scan you initiated was unable to complete successfully. The details are provided below.`)}
      ${infoBox([
        { label: "Tool", value: tool },
        { label: "Target", value: target },
        { label: "Reason", value: reason || "Internal processing error" },
      ], "#dc2626")}
      ${alertBox(`Credits for failed scans are not automatically refunded. If you believe this failure was caused by a platform error rather than a configuration issue, please contact support with your scan details.`)}
      ${para(`Common reasons for scan failures include unreachable targets, rate limiting by the target host, and invalid input parameters. Please verify your configuration and retry.`, true)}
      ${ctaButton("Retry Scan", `${APP_URL}/dashboard/new-scan`)}
    `,
    footerNote: `For support, contact ${SUPPORT_EMAIL} with your scan ID and the error details shown above.`,
  });
}
// 10. CREDITS ADDED — successful wallet top-up

export function creditsAddedEmail(
  firstName: string,
  amountPaid: number,
  creditsAdded: number,
  newBalance: number,
  paymentId: string,
  timestamp: string,
): string {
  return base({
    previewText: `Payment confirmed — \u20B9${creditsAdded.toFixed(2)} added to your Pentellia wallet.`,
    headerLabel: "Payment Confirmed",
    headerSubtitle: `Your wallet has been credited.`,
    accentColor: "#059669",
    topBarColor: "#047857",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`Your payment has been processed successfully and the corresponding credits have been added to your Pentellia wallet. Your account is ready for use.`)}
      ${infoBox([
        { label: "Amount Paid", value: `\u20B9${amountPaid.toFixed(2)}` },
        { label: "Credits Added", value: `\u20B9${creditsAdded.toFixed(2)}` },
        { label: "New Wallet Balance", value: `\u20B9${newBalance.toFixed(2)}` },
        { label: "Payment Reference", value: paymentId },
        { label: "Date & Time", value: timestamp },
      ], "#059669")}
      ${para(`Credits are consumed on a per-operation basis. Normal scans consume \u20B90.50 per run. Deep scans consume \u20B92.00. AI-powered summaries consume \u20B95.00.`, true)}
      ${ctaButton("Start a Scan", `${APP_URL}/dashboard/new-scan`, "#059669")}
    `,
    footerNote: `This is a confirmation of a charge processed via Razorpay. Retain this email for your records. For billing enquiries, contact ${SUPPORT_EMAIL}.`,
  });
}
// 11. LOW CREDITS REMINDER — balance below threshold

export function lowCreditsEmail(
  firstName: string,
  currentBalance: number,
  thresholdPercent: number,
): string {
  return base({
    previewText: `Your Pentellia wallet balance is running low — \u20B9${currentBalance.toFixed(2)} remaining.`,
    headerLabel: "Low Balance Notice",
    headerSubtitle: `Your scan credits are running low.`,
    accentColor: "#d97706",
    topBarColor: "#b45309",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`Your Pentellia wallet balance has fallen below the recommended threshold. To avoid interruption to your security monitoring and scanning operations, we recommend topping up your account.`)}
      ${infoBox([
        { label: "Current Balance", value: `\u20B9${currentBalance.toFixed(2)}` },
        { label: "Status", value: `<span style="color:#d97706;font-weight:600;">Below ${thresholdPercent}% of last top-up</span>` },
      ], "#d97706")}
      ${warningBox(`With your current balance, you have approximately ${Math.floor(currentBalance / 0.5)} normal scans or ${Math.floor(currentBalance / 5)} AI summaries remaining. Scans will be paused when your balance reaches zero.`)}
      ${para(`Add credits now to maintain uninterrupted access to your security toolset.`, true)}
      ${ctaButton("Top Up Wallet", `${APP_URL}/subscription`, "#d97706")}
    `,
    footerNote: `You are receiving this notice because your balance has dropped below the configured alert threshold. Manage your notification preferences in account settings.`,
  });
}
// 12. CREDITS EXHAUSTED — balance is zero

export function creditsExhaustedEmail(firstName: string): string {
  return base({
    previewText: `Your Pentellia wallet balance is zero — scanning has been paused.`,
    headerLabel: "Scanning Paused",
    headerSubtitle: `Your wallet balance has been exhausted.`,
    accentColor: "#ef4444",
    topBarColor: "#dc2626",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`Your Pentellia wallet balance has reached zero. All scan operations and AI-powered features have been temporarily suspended until your account is funded.`)}
      ${alertBox(`Active monitoring and scheduled scans have been paused. Your existing scan history and reports remain fully accessible.`)}
      ${para(`To restore access to the full platform, add credits to your wallet. Scanning will resume automatically once your balance is replenished.`, true)}
      ${ctaButton("Restore Access", `${APP_URL}/subscription`, "#dc2626")}
      ${para(`If you have questions about your usage or need assistance, contact our team at <a href="mailto:${SUPPORT_EMAIL}" style="color:#a78bfa;">${SUPPORT_EMAIL}</a>.`, true)}
    `,
    footerNote: `Pentellia is a pay-as-you-go platform. There are no recurring charges. Credits are only consumed when scans are executed.`,
  });
}
// 13. AI SUMMARY GENERATED — report available

export function aiSummaryGeneratedEmail(
  firstName: string,
  tool: string,
  target: string,
  scanId: string,
): string {
  return base({
    previewText: `AI security report generated for ${target} — ready for review.`,
    headerLabel: "AI Report Ready",
    headerSubtitle: `Your executive security analysis is available.`,
    accentColor: "#7c3aed",
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(`The AI-powered security summary for your ${tool} assessment of <strong style="color:#c0c0d8;">${target}</strong> has been generated and is ready for review.`)}
      ${successBox(`The report includes an executive summary, risk classification, business impact analysis, prioritised findings, and recommended remediation steps.`)}
      ${para(`This summary is designed for both technical and non-technical stakeholders and may be included in PDF reports for distribution to your team or management.`, true)}
      ${ctaButton("View AI Summary", `${APP_URL}/dashboard/scans`)}
    `,
    footerNote: `AI-generated summaries are produced by language models and should be reviewed by a qualified security professional before being relied upon for remediation decisions.`,
  });
}
// 14. GENERAL NOTIFICATION — used by the notifications system

export function generalNotificationEmail(
  firstName: string,
  title: string,
  message: string,
  ctaLabel?: string,
  ctaHref?: string,
): string {
  return base({
    previewText: `${title} — Pentellia Security`,
    headerLabel: "Notification",
    headerSubtitle: title,
    content: `
      ${para(`Hello ${firstName},`)}
      ${para(message)}
      ${ctaLabel && ctaHref ? ctaButton(ctaLabel, ctaHref) : ""}
      ${para(`For assistance, contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#a78bfa;">${SUPPORT_EMAIL}</a>.`, true)}
    `,
  });
}
