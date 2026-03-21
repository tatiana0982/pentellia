// src/lib/audit.ts
// Centralised audit logger. Fire-and-forget — never blocks a request.

import { query } from "@/config/db";

export type AuditEventType =
  | "login"
  | "logout"
  | "scan_start"
  | "scan_complete"
  | "scan_failed"
  | "scan_cancelled"
  | "payment_initiated"
  | "payment_success"
  | "payment_failed"
  | "domain_added"
  | "domain_verified"
  | "domain_deleted"
  | "ai_summary_generated"
  | "ai_summary_loaded"
  | "report_exported"
  | "credits_deducted"
  | "credits_added"
  | "profile_updated"
  | "api_key_created"
  | "api_key_deleted"
  | "unauthorized_attempt"
  | "rate_limit_hit"
  | "insufficient_credits"
  | "domain_not_verified";

export type AuditSeverity = "debug" | "info" | "warning" | "error" | "critical";

interface AuditOptions {
  userUid?: string;
  ipAddress?: string;
  userAgent?: string;
  eventType: AuditEventType;
  resourceType?: "scan" | "domain" | "report" | "payment" | "user" | "ai_summary";
  resourceId?: string;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
}

/**
 * log() — async, fire-and-forget audit entry.
 * Never throws. Silently logs errors to console only.
 */
export async function log(opts: AuditOptions): Promise<void> {
  const {
    userUid,
    ipAddress,
    userAgent,
    eventType,
    resourceType,
    resourceId,
    metadata,
    severity = "info",
  } = opts;

  // Non-blocking
  query(
    `INSERT INTO audit_logs
       (user_uid, ip_address, user_agent, event_type, resource_type, resource_id, metadata, severity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userUid ?? null,
      ipAddress ?? null,
      userAgent ?? null,
      eventType,
      resourceType ?? null,
      resourceId ?? null,
      metadata ? JSON.stringify(metadata) : null,
      severity,
    ],
  ).catch((err) => {
    console.error("[Audit] Failed to write log:", err);
  });
}

/**
 * Extract IP from Next.js request headers
 */
export function getIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}