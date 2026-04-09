// src/lib/subscription.ts
// ── PENTELLIA PHASE 3 — SUBSCRIPTION CORE LOGIC ───────────────────────
// Replaces the old credit/wallet system entirely.
// All plan lookups, usage checks, and usage increments live here.

import { query } from "@/config/db";

// ── Types ──────────────────────────────────────────────────────────────
export type ScanType = "deep" | "light" | "report";

export interface SubscriptionPlan {
  id:                 string;
  name:               string;
  price_inr:          number;
  deep_scan_monthly:  number;
  light_scan_monthly: number;
  report_monthly:     number;
  deep_scan_daily:    number;
  light_scan_daily:   number;
  report_daily:       number;
  is_active:          boolean;
  sort_order:         number;
}

export interface UserSubscription {
  id:                   string;
  user_uid:             string;
  plan_id:              string;
  status:               "active" | "expired" | "cancelled";
  started_at:           Date;
  expires_at:           Date;
  razorpay_order_id:    string | null;
  razorpay_payment_id:  string | null;
  plan:                 SubscriptionPlan;
}

export interface UsageTracking {
  id:               string;
  user_uid:         string;
  period_start:     Date;
  period_end:       Date;
  deep_scans_used:  number;
  light_scans_used: number;
  reports_used:     number;
}

export interface UsageStatus {
  allowed:        boolean;
  reason?:        string;
  code?:          "NO_SUBSCRIPTION" | "PLAN_EXPIRED" | "MONTHLY_LIMIT" | "DAILY_LIMIT";
  monthlyUsed:    number;
  monthlyLimit:   number;
  dailyUsed:      number;
  dailyLimit:     number;
}

// ── Get all active plans ───────────────────────────────────────────────
export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  const res = await query(
    `SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY sort_order ASC`,
  );
  return res.rows;
}

// ── Get a single plan by ID ────────────────────────────────────────────
export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
  const res = await query(
    `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [planId],
  );
  return res.rows[0] ?? null;
}

// ── Get user's active subscription (with plan details) ─────────────────
export async function getActiveSubscription(uid: string): Promise<UserSubscription | null> {
  const res = await query(
    `SELECT
       us.id, us.user_uid, us.plan_id, us.status,
       us.started_at, us.expires_at,
       us.razorpay_order_id, us.razorpay_payment_id,
       sp.id              AS plan_id_ref,
       sp.name            AS plan_name,
       sp.price_inr,
       sp.deep_scan_monthly, sp.light_scan_monthly, sp.report_monthly,
       sp.deep_scan_daily,   sp.light_scan_daily,   sp.report_daily,
       sp.is_active, sp.sort_order
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_uid = $1
       AND us.status = 'active'
       AND us.expires_at > NOW()
     LIMIT 1`,
    [uid],
  );

  if (!res.rows.length) return null;
  const r = res.rows[0];

  return {
    id:                  r.id,
    user_uid:            r.user_uid,
    plan_id:             r.plan_id,
    status:              r.status,
    started_at:          r.started_at,
    expires_at:          r.expires_at,
    razorpay_order_id:   r.razorpay_order_id,
    razorpay_payment_id: r.razorpay_payment_id,
    plan: {
      id:                 r.plan_id_ref,
      name:               r.plan_name,
      price_inr:          r.price_inr,
      deep_scan_monthly:  r.deep_scan_monthly,
      light_scan_monthly: r.light_scan_monthly,
      report_monthly:     r.report_monthly,
      deep_scan_daily:    r.deep_scan_daily,
      light_scan_daily:   r.light_scan_daily,
      report_daily:       r.report_daily,
      is_active:          r.is_active,
      sort_order:         r.sort_order,
    },
  };
}

// ── Get or create usage row for current billing period ─────────────────
export async function getOrCreateUsageTracking(
  uid: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<UsageTracking> {
  const res = await query(
    `INSERT INTO usage_tracking
       (user_uid, period_start, period_end,
        deep_scans_used, light_scans_used, reports_used)
     VALUES ($1, $2, $3, 0, 0, 0)
     ON CONFLICT (user_uid, period_start) DO UPDATE
       SET updated_at = NOW()
     RETURNING *`,
    [uid, periodStart, periodEnd],
  );
  return res.rows[0];
}

// ── Check if user can execute a scan/report ────────────────────────────
// Returns { allowed, reason, code, monthlyUsed, monthlyLimit, dailyUsed, dailyLimit }
export async function checkUsageLimit(
  uid:      string,
  scanType: ScanType,
): Promise<UsageStatus> {
  // 1. Get active subscription
  const sub = await getActiveSubscription(uid);

  if (!sub) {
    return {
      allowed:      false,
      reason:       "No active subscription. Please subscribe to a plan.",
      code:         "NO_SUBSCRIPTION",
      monthlyUsed:  0,
      monthlyLimit: 0,
      dailyUsed:    0,
      dailyLimit:   0,
    };
  }

  // 2. Double-check expiry
  if (new Date(sub.expires_at) <= new Date()) {
    return {
      allowed:      false,
      reason:       "Your subscription has expired. Please renew to continue.",
      code:         "PLAN_EXPIRED",
      monthlyUsed:  0,
      monthlyLimit: 0,
      dailyUsed:    0,
      dailyLimit:   0,
    };
  }

  const plan = sub.plan;

  // 3. Get monthly limits for this scan type
  const monthlyLimit = scanType === "deep"
    ? plan.deep_scan_monthly
    : scanType === "light"
    ? plan.light_scan_monthly
    : plan.report_monthly;

  const dailyLimit = scanType === "deep"
    ? plan.deep_scan_daily
    : scanType === "light"
    ? plan.light_scan_daily
    : plan.report_daily;

  const usedCol = scanType === "deep"
    ? "deep_scans_used"
    : scanType === "light"
    ? "light_scans_used"
    : "reports_used";

  // 4. Get/create usage row
  const usage = await getOrCreateUsageTracking(
    uid,
    sub.started_at,
    sub.expires_at,
  );

  const monthlyUsed = Number(usage[usedCol as keyof UsageTracking]);

  // 5. Check monthly limit
  if (monthlyUsed >= monthlyLimit) {
    return {
      allowed:      false,
      reason:       `Monthly ${scanType} scan limit reached (${monthlyUsed}/${monthlyLimit}). Upgrade your plan for more.`,
      code:         "MONTHLY_LIMIT",
      monthlyUsed,
      monthlyLimit,
      dailyUsed:    0,
      dailyLimit,
    };
  }

  // 6. Check daily limit — count today's scans from scans table
  const dailyRes = await query(
    `SELECT COUNT(*) AS cnt
     FROM scans
     WHERE user_uid  = $1
       AND tool_id   IN (
         SELECT id FROM tools
         WHERE category IN (
           CASE WHEN $2 = 'deep'   THEN 'web,vulnerability,exploit,injection,composite,cloud'
                WHEN $2 = 'light'  THEN 'network,reconnaissance,auth,cms,intelligence'
                ELSE 'report'
           END
         )
       )
       AND created_at >= DATE_TRUNC('day', NOW())
       AND deleted_at IS NULL`,
    [uid, scanType],
  );

  // Simpler daily check: just count all scans today regardless of type
  const dailyCountRes = await query(
    `SELECT
       COUNT(*) FILTER (WHERE t.category IN ('web','vulnerability','exploit','injection','composite','cloud'))
         AS deep_today,
       COUNT(*) FILTER (WHERE t.category IN ('network','reconnaissance','auth','cms','intelligence'))
         AS light_today
     FROM scans s
     JOIN tools t ON s.tool_id = t.id
     WHERE s.user_uid    = $1
       AND s.created_at >= DATE_TRUNC('day', NOW())
       AND s.deleted_at IS NULL`,
    [uid],
  );

  const row = dailyCountRes.rows[0];
  const dailyUsed = scanType === "deep"
    ? Number(row.deep_today ?? 0)
    : Number(row.light_today ?? 0);

  if (dailyUsed >= dailyLimit) {
    return {
      allowed:      false,
      reason:       `Daily ${scanType} scan limit reached (${dailyUsed}/${dailyLimit}). Limits reset at midnight UTC.`,
      code:         "DAILY_LIMIT",
      monthlyUsed,
      monthlyLimit,
      dailyUsed,
      dailyLimit,
    };
  }

  return {
    allowed:      true,
    monthlyUsed,
    monthlyLimit,
    dailyUsed,
    dailyLimit,
  };
}

// ── Increment usage counter after successful scan ──────────────────────
// Called AFTER the scan is confirmed queued (not before — no charge on failure)
export async function incrementUsage(
  uid:      string,
  scanType: ScanType,
): Promise<void> {
  const sub = await getActiveSubscription(uid);
  if (!sub) return; // No subscription — shouldn't happen if checkUsageLimit passed

  const col = scanType === "deep"
    ? "deep_scans_used"
    : scanType === "light"
    ? "light_scans_used"
    : "reports_used";

  await query(
    `INSERT INTO usage_tracking
       (user_uid, period_start, period_end, ${col})
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_uid, period_start) DO UPDATE
       SET ${col}      = usage_tracking.${col} + 1,
           updated_at  = NOW()`,
    [uid, sub.started_at, sub.expires_at],
  );
}

// ── Activate a subscription after payment ─────────────────────────────
export async function activateSubscription(
  uid:              string,
  planId:           string,
  razorpayOrderId:  string,
  razorpayPaymentId: string,
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  await query(
    `INSERT INTO user_subscriptions
       (user_uid, plan_id, status, started_at, expires_at,
        razorpay_order_id, razorpay_payment_id)
     VALUES ($1, $2, 'active', NOW(), $3, $4, $5)
     ON CONFLICT (user_uid) DO UPDATE SET
       plan_id             = EXCLUDED.plan_id,
       status              = 'active',
       started_at          = NOW(),
       expires_at          = EXCLUDED.expires_at,
       razorpay_order_id   = EXCLUDED.razorpay_order_id,
       razorpay_payment_id = EXCLUDED.razorpay_payment_id`,
    [uid, planId, expiresAt, razorpayOrderId, razorpayPaymentId],
  );

  // Reset usage tracking for new period
  await query(
    `INSERT INTO usage_tracking
       (user_uid, period_start, period_end,
        deep_scans_used, light_scans_used, reports_used)
     VALUES ($1, NOW(), $2, 0, 0, 0)
     ON CONFLICT (user_uid, period_start) DO UPDATE SET
       deep_scans_used  = 0,
       light_scans_used = 0,
       reports_used     = 0,
       updated_at       = NOW()`,
    [uid, expiresAt],
  );
}

// ── Get current usage summary for dashboard ───────────────────────────
export async function getUsageSummary(uid: string) {
  const sub = await getActiveSubscription(uid);
  if (!sub) return null;

  const usageRes = await query(
    `SELECT deep_scans_used, light_scans_used, reports_used
     FROM usage_tracking
     WHERE user_uid = $1 AND period_start = $2
     LIMIT 1`,
    [uid, sub.started_at],
  );

  const usage = usageRes.rows[0] ?? {
    deep_scans_used:  0,
    light_scans_used: 0,
    reports_used:     0,
  };

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  return {
    plan:            sub.plan,
    status:          sub.status,
    expiresAt:       sub.expires_at,
    daysLeft,
    usage: {
      deepScans:  { used: Number(usage.deep_scans_used),  limit: sub.plan.deep_scan_monthly },
      lightScans: { used: Number(usage.light_scans_used), limit: sub.plan.light_scan_monthly },
      reports:    { used: Number(usage.reports_used),     limit: sub.plan.report_monthly },
    },
  };
}