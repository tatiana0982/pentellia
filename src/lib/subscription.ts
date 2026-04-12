// src/lib/subscription.ts
// ── PENTELLIA PHASE 3 — SUBSCRIPTION CORE LOGIC ───────────────────────
//
// PLAN TRANSITION RULES:
//   Upgrade   (sort_order increases): immediate — new plan + reset usage
//   Same plan                        : extend expiry by 30d + reset usage
//   Downgrade (sort_order decreases) : deferred — stored as pending_plan_id,
//                                      applied when current plan expires
//   Expired                          : getActiveSubscription returns null,
//                                      scan APIs return 402
//
// DAILY LIMITS: tracked in daily_usage table (faster than scanning scans table)
// MONTHLY LIMITS: tracked in usage_tracking table, reset on plan activation

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
  pending_plan_id:      string | null;
  plan:                 SubscriptionPlan;
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

// ── Get user's active subscription ────────────────────────────────────
// Also applies any pending deferred downgrade if the current plan has expired.
export async function getActiveSubscription(uid: string): Promise<UserSubscription | null> {
  // First, apply any pending downgrade that's now due
  await applyPendingDowngradeIfDue(uid);

  const res = await query(
    `SELECT
       us.id, us.user_uid, us.plan_id, us.status,
       us.started_at, us.expires_at,
       us.razorpay_order_id, us.razorpay_payment_id,
       us.pending_plan_id,
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
    pending_plan_id:     r.pending_plan_id ?? null,
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

// ── Apply a pending downgrade if the current plan has expired ──────────
// Called automatically inside getActiveSubscription.
async function applyPendingDowngradeIfDue(uid: string): Promise<void> {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 30);

  // Atomic UPDATE: reads pending_plan_id and applies it in a single statement.
  // Eliminates race condition where two concurrent requests both read the same row.
  const res = await query(
    `UPDATE user_subscriptions SET
       plan_id         = pending_plan_id,
       status          = 'active',
       started_at      = NOW(),
       expires_at      = $1,
       pending_plan_id = NULL,
       pending_plan_at = NULL
     WHERE user_uid = $2
       AND pending_plan_id IS NOT NULL
       AND expires_at <= NOW()
     RETURNING pending_plan_id AS applied_plan`,
    [newExpiry, uid],
  );
  if (!res.rows.length) return;  // nothing to apply, or another request got there first

  // Reset usage for new period
  await query(
    `INSERT INTO usage_tracking
       (user_uid, period_start, period_end, deep_scans_used, light_scans_used, reports_used)
     VALUES ($1, NOW(), $2, 0, 0, 0)
     ON CONFLICT (user_uid, period_start) DO UPDATE SET
       deep_scans_used  = 0,
       light_scans_used = 0,
       reports_used     = 0,
       updated_at       = NOW()`,
    [uid, newExpiry],
  );
}

// ── Check if user can execute a scan/report ────────────────────────────
export async function checkUsageLimit(
  uid:      string,
  scanType: ScanType,
): Promise<UsageStatus> {
  const sub = await getActiveSubscription(uid);

  if (!sub) {
    return {
      allowed: false, reason: "No active subscription. Please subscribe to a plan.",
      code: "NO_SUBSCRIPTION", monthlyUsed: 0, monthlyLimit: 0, dailyUsed: 0, dailyLimit: 0,
    };
  }

  if (new Date(sub.expires_at) <= new Date()) {
    return {
      allowed: false, reason: "Your subscription has expired. Please renew to continue.",
      code: "PLAN_EXPIRED", monthlyUsed: 0, monthlyLimit: 0, dailyUsed: 0, dailyLimit: 0,
    };
  }

  const plan = sub.plan;

  const monthlyLimit = scanType === "deep" ? plan.deep_scan_monthly
    : scanType === "light" ? plan.light_scan_monthly : plan.report_monthly;
  const dailyLimit   = scanType === "deep" ? plan.deep_scan_daily
    : scanType === "light" ? plan.light_scan_daily : plan.report_daily;
  const usedCol      = scanType === "deep" ? "deep_scans_used"
    : scanType === "light" ? "light_scans_used" : "reports_used";

  // ── Monthly usage from usage_tracking ────────────────────────
  const monthlyRes = await query(
    `SELECT ${usedCol} AS used FROM usage_tracking
     WHERE user_uid = $1 AND period_start = $2 LIMIT 1`,
    [uid, sub.started_at],
  );
  const monthlyUsed = Number(monthlyRes.rows[0]?.used ?? 0);

  if (monthlyUsed >= monthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly ${scanType} scan limit reached (${monthlyUsed}/${monthlyLimit}). Upgrade your plan for more.`,
      code: "MONTHLY_LIMIT", monthlyUsed, monthlyLimit, dailyUsed: 0, dailyLimit,
    };
  }

  // ── Daily usage from daily_usage table ───────────────────────
  const dailyRes = await query(
    `SELECT ${usedCol} AS used FROM daily_usage
     WHERE user_uid = $1 AND date = CURRENT_DATE LIMIT 1`,
    [uid],
  );
  const dailyUsed = Number(dailyRes.rows[0]?.used ?? 0);

  if (dailyUsed >= dailyLimit) {
    // Calculate exact reset time — midnight UTC today
    const now = new Date();
    const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const resetAt = midnightUTC.toISOString();
    const minsLeft = Math.ceil((midnightUTC.getTime() - now.getTime()) / 60000);
    const hh = String(Math.floor(minsLeft / 60)).padStart(2, "0");
    const mm = String(minsLeft % 60).padStart(2, "0");
    return {
      allowed: false,
      reason: `Daily ${scanType} scan limit reached (${dailyUsed}/${dailyLimit}). Resets in ${hh}:${mm}.`,
      code: "DAILY_LIMIT", monthlyUsed, monthlyLimit, dailyUsed, dailyLimit, resetAt,
    };
  }

  return { allowed: true, monthlyUsed, monthlyLimit, dailyUsed, dailyLimit };
}

// ── Increment both monthly and daily usage after scan success ──────────
export async function incrementUsage(uid: string, scanType: ScanType): Promise<void> {
  const sub = await getActiveSubscription(uid);
  if (!sub) return;

  const col = scanType === "deep" ? "deep_scans_used"
    : scanType === "light" ? "light_scans_used" : "reports_used";

  // Monthly
  await query(
    `INSERT INTO usage_tracking (user_uid, period_start, period_end, ${col})
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_uid, period_start) DO UPDATE
       SET ${col} = usage_tracking.${col} + 1, updated_at = NOW()`,
    [uid, sub.started_at, sub.expires_at],
  );

  // Daily
  await query(
    `INSERT INTO daily_usage (user_uid, date, ${col})
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_uid, date) DO UPDATE
       SET ${col} = daily_usage.${col} + 1, updated_at = NOW()`,
    [uid],
  );
}

// ── Activate subscription — handles all plan transition scenarios ───────
//
// UPGRADE   (new sort_order > current): immediate, reset usage
// SAME PLAN (same sort_order)         : extend +30d, reset usage
// DOWNGRADE (new sort_order < current): store as pending, current plan unchanged
//
export async function activateSubscription(
  uid:               string,
  planId:            string,
  razorpayOrderId:   string,
  razorpayPaymentId: string,
): Promise<{ immediate: boolean; message: string }> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Get plans for comparison
  const [newPlan, currentSub] = await Promise.all([
    getPlanById(planId),
    // Get current sub raw (skip applyPendingDowngrade to avoid recursion)
    query(
      `SELECT us.plan_id, sp.sort_order, us.expires_at
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_uid = $1 AND us.status = 'active' AND us.expires_at > NOW()
       LIMIT 1`,
      [uid],
    ),
  ]);

  if (!newPlan) throw new Error(`Plan not found: ${planId}`);

  const currentRow         = currentSub.rows[0];
  const currentSortOrder   = currentRow ? Number(currentRow.sort_order) : -1;
  const newSortOrder       = Number(newPlan.sort_order);
  const hasActivePlan      = !!currentRow;

  // ── DOWNGRADE: defer to after current plan expires ────────────
  if (hasActivePlan && newSortOrder < currentSortOrder) {
    await query(
      `UPDATE user_subscriptions SET
         pending_plan_id = $1,
         pending_plan_at = NOW()
       WHERE user_uid = $2`,
      [planId, uid],
    );
    // Still record the payment order for history
    return {
      immediate: false,
      message: `Downgrade to ${newPlan.name} scheduled. Your current plan continues until ${new Date(currentRow.expires_at).toLocaleDateString()}.`,
    };
  }

  // ── UPGRADE or SAME PLAN: immediate activation ─────────────────
  await query("BEGIN");
  try {
  await query(
    `INSERT INTO user_subscriptions
       (user_uid, plan_id, status, started_at, expires_at,
        razorpay_order_id, razorpay_payment_id, pending_plan_id, pending_plan_at)
     VALUES ($1, $2, 'active', NOW(), $3, $4, $5, NULL, NULL)
     ON CONFLICT (user_uid) DO UPDATE SET
       plan_id             = EXCLUDED.plan_id,
       status              = 'active',
       started_at          = NOW(),
       expires_at          = EXCLUDED.expires_at,
       razorpay_order_id   = EXCLUDED.razorpay_order_id,
       razorpay_payment_id = EXCLUDED.razorpay_payment_id,
       pending_plan_id     = NULL,
       pending_plan_at     = NULL`,
    [uid, planId, expiresAt, razorpayOrderId, razorpayPaymentId],
  );

  // Reset usage tracking for new period
  await query(
    `INSERT INTO usage_tracking
       (user_uid, period_start, period_end, deep_scans_used, light_scans_used, reports_used)
     VALUES ($1, NOW(), $2, 0, 0, 0)
     ON CONFLICT (user_uid, period_start) DO UPDATE SET
       deep_scans_used  = 0,
       light_scans_used = 0,
       reports_used     = 0,
       updated_at       = NOW()`,
    [uid, expiresAt],
  );

  // Reset today's daily usage for the new plan
  await query(
    `INSERT INTO daily_usage (user_uid, date, deep_scans_used, light_scans_used, reports_used)
     VALUES ($1, CURRENT_DATE, 0, 0, 0)
     ON CONFLICT (user_uid, date) DO UPDATE SET
       deep_scans_used  = 0,
       light_scans_used = 0,
       reports_used     = 0,
       updated_at       = NOW()`,
    [uid],
  );

  const action = !hasActivePlan ? "activated"
    : newSortOrder > currentSortOrder ? "upgraded"
    : "renewed";

  await query("COMMIT");
  } catch (txErr) {
    await query("ROLLBACK");
    throw txErr;
  }

  return { immediate: true, message: `Plan ${action} successfully.` };
}

// ── Get usage summary for dashboard display ────────────────────────────
export async function getUsageSummary(uid: string) {
  const sub = await getActiveSubscription(uid);
  if (!sub) return null;

  const [usageRes, dailyRes] = await Promise.all([
    query(
      `SELECT deep_scans_used, light_scans_used, reports_used
       FROM usage_tracking WHERE user_uid = $1 AND period_start = $2 LIMIT 1`,
      [uid, sub.started_at],
    ),
    query(
      `SELECT deep_scans_used, light_scans_used, reports_used
       FROM daily_usage WHERE user_uid = $1 AND date = CURRENT_DATE LIMIT 1`,
      [uid],
    ),
  ]);

  const monthly = usageRes.rows[0] ?? { deep_scans_used: 0, light_scans_used: 0, reports_used: 0 };
  const daily   = dailyRes.rows[0]  ?? { deep_scans_used: 0, light_scans_used: 0, reports_used: 0 };

  const daysLeft = Math.max(
    0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return {
    plan:       sub.plan,
    status:     sub.status,
    expiresAt:  sub.expires_at,
    pendingPlanId: sub.pending_plan_id,
    daysLeft,
    usage: {
      deepScans:  { used: Number(monthly.deep_scans_used),  limit: sub.plan.deep_scan_monthly,  dailyUsed: Number(daily.deep_scans_used),  dailyLimit: sub.plan.deep_scan_daily  },
      lightScans: { used: Number(monthly.light_scans_used), limit: sub.plan.light_scan_monthly, dailyUsed: Number(daily.light_scans_used), dailyLimit: sub.plan.light_scan_daily },
      reports:    { used: Number(monthly.reports_used),     limit: sub.plan.report_monthly,     dailyUsed: Number(daily.reports_used),     dailyLimit: sub.plan.report_daily     },
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────
export async function getOrCreateUsageTracking(
  uid: string, periodStart: Date, periodEnd: Date,
) {
  const res = await query(
    `INSERT INTO usage_tracking
       (user_uid, period_start, period_end, deep_scans_used, light_scans_used, reports_used)
     VALUES ($1, $2, $3, 0, 0, 0)
     ON CONFLICT (user_uid, period_start) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [uid, periodStart, periodEnd],
  );
  return res.rows[0];
}