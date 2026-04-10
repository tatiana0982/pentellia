"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Check, Loader2, Zap, Shield, Crown, Building2,
  Clock, ChevronRight, ArrowDownLeft, ChevronDown,
  CreditCard, Calendar, BarChart3, RefreshCw,
  Lock, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────
interface Plan {
  id:                  string;
  name:                string;
  price_inr:           number;
  deep_scan_monthly:   number;
  light_scan_monthly:  number;
  report_monthly:      number;
  deep_scan_daily:     number;
  light_scan_daily:    number;
  report_daily:        number;
}

interface CurrentSub {
  planId:    string;
  planName:  string;
  status:    string;
  expiresAt: string;
  daysLeft:  number;
}

interface UsageData {
  deepScans:  { used: number; limit: number };
  lightScans: { used: number; limit: number };
  reports:    { used: number; limit: number };
}

interface PaymentRecord {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  amount_inr:          number;
  plan_id:             string;
  status:              string;
  paid_at:             string;
}

declare global { interface Window { Razorpay: any; } }

const PLAN_ICONS: Record<string, React.ElementType> = {
  recon: Shield, hunter: Zap, elite: Crown, elite_max: Building2,
};

// ── Skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-white/5", className)} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72" /></div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Usage bar ─────────────────────────────────────────────────────────
function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct   = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-violet-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-slate-300">{used}<span className="text-slate-600">/{limit}</span></span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────
function PlanCard({
  plan, isActive, isCurrentPlan, isBusy, onSubscribe,
}: {
  plan: Plan;
  isActive: boolean;
  isCurrentPlan: boolean;
  isBusy: boolean;
  onSubscribe: (id: string) => void;
}) {
  const Icon      = PLAN_ICONS[plan.id] ?? Shield;
  const isPopular = plan.id === "hunter";
  const isEnterprise = plan.id === "elite_max";

  return (
    <div className={cn(
      "relative flex flex-col bg-[#0B0C15]/60 backdrop-blur-sm border transition-all duration-200",
      isPopular && !isCurrentPlan
        ? "border-violet-500/40 shadow-[0_0_24px_rgba(124,58,237,0.12)]"
        : isCurrentPlan
        ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
        : "border-white/[0.08] hover:border-white/[0.14]",
      "rounded-xl overflow-hidden",
    )}>
      {/* Top accent line */}
      <div className={cn(
        "h-[2px] w-full",
        isCurrentPlan ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
        : isPopular    ? "bg-gradient-to-r from-violet-600 to-indigo-500"
        : isEnterprise ? "bg-gradient-to-r from-amber-600 to-orange-500"
        : "bg-white/[0.06]",
      )} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              isCurrentPlan ? "bg-emerald-500/10" : "bg-violet-500/10",
            )}>
              <Icon className={cn("h-4 w-4", isCurrentPlan ? "text-emerald-400" : "text-violet-400")} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">
                {plan.name.replace("Pentellia ", "")}
              </p>
              {isPopular && !isCurrentPlan && (
                <span className="text-[10px] font-medium text-violet-400 flex items-center gap-1 mt-0.5">
                  <Star className="h-2.5 w-2.5 fill-violet-400" /> Most Popular
                </span>
              )}
            </div>
          </div>
          {isCurrentPlan && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Check className="h-2.5 w-2.5" /> Active
            </span>
          )}
        </div>

        {/* Price */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-slate-500 font-medium">₹</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              {plan.price_inr.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-slate-500">/month</span>
          </div>
        </div>

        {/* Limits */}
        <ul className="space-y-1.5 flex-1">
          {[
            { label: `${plan.deep_scan_monthly} deep scans`, sub: `${plan.deep_scan_daily}/day` },
            { label: `${plan.light_scan_monthly} light scans`, sub: `${plan.light_scan_daily}/day` },
            { label: `${plan.report_monthly} reports`, sub: `${plan.report_daily}/day` },
          ].map((f, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-3 w-3 text-slate-600 shrink-0" />
              <span className="text-xs text-slate-400">{f.label}</span>
              <span className="text-[10px] text-slate-600 ml-auto">{f.sub}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onSubscribe(plan.id)}
          disabled={isCurrentPlan || isBusy}
          className={cn(
            "w-full h-9 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            isCurrentPlan
              ? "bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20"
              : isPopular
              ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)]"
              : "bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 border border-white/[0.08]",
            isBusy && !isCurrentPlan && "opacity-50 cursor-not-allowed",
          )}
        >
          {isBusy ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing</>
          ) : isCurrentPlan ? (
            <><Check className="h-3.5 w-3.5" /> Current Plan</>
          ) : (
            <>Subscribe <ChevronRight className="h-3.5 w-3.5" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const [plans,        setPlans]        = useState<Plan[]>([]);
  const [currentSub,   setCurrentSub]   = useState<CurrentSub | null>(null);
  const [usage,        setUsage]        = useState<UsageData | null>(null);
  const [payments,     setPayments]     = useState<PaymentRecord[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [checkingOut,  setCheckingOut]  = useState<string | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [userEmail,    setUserEmail]    = useState("");
  const [userName,     setUserName]     = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, statusRes, userRes] = await Promise.all([
        fetch("/api/subscription/plans").then(r => r.json()),
        fetch("/api/subscription/status").then(r => r.json()),
        fetch("/api/users").then(r => r.json()),
      ]);
      if (plansRes.success)            setPlans(plansRes.plans ?? []);
      if (plansRes.currentSubscription) setCurrentSub(plansRes.currentSubscription);
      if (plansRes.usageSummary?.usage) setUsage(plansRes.usageSummary.usage);
      if (statusRes.paymentHistory)    setPayments(statusRes.paymentHistory ?? []);
      if (userRes.success) {
        setUserEmail(userRes.user?.email ?? "");
        setUserName(`${userRes.user?.firstName ?? ""} ${userRes.user?.lastName ?? ""}`.trim());
      }
    } catch {
      toast.error("Failed to load subscription data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (document.getElementById("rzp-script")) return;
    const s = Object.assign(document.createElement("script"), {
      id: "rzp-script", src: "https://checkout.razorpay.com/v1/checkout.js",
    });
    document.body.appendChild(s);
  }, []);

  const handleSubscribe = async (planId: string) => {
    setCheckingOut(planId);
    try {
      const orderRes  = await fetch("/api/subscription/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

      const rzp = new window.Razorpay({
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    "INR",
        name:        "Pentellia",
        description: orderData.description,
        order_id:    orderData.orderId,
        prefill:     { name: userName, email: userEmail },
        theme:       { color: "#7C3AED" },
        handler: async (response: any) => {
          const verifyRes  = await fetch("/api/subscription/verify-payment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success("Subscription activated.");
            setShowAllPlans(false);
            await loadData();
          } else {
            toast.error(verifyData.error || "Activation failed");
          }
        },
        modal: { ondismiss: () => setCheckingOut(null) },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setCheckingOut(null);
    }
  };

  if (isLoading) return <PageSkeleton />;

  const hasActivePlan = !!currentSub && currentSub.status === "active" && currentSub.daysLeft > 0;
  const isExpiring    = hasActivePlan && currentSub!.daysLeft <= 7;
  const planName      = currentSub?.planName?.replace("Pentellia ", "") ?? "";

  // Plans to show: if has active plan and not expanded, only show other plans collapsed
  const visiblePlans  = showAllPlans || !hasActivePlan ? plans : [];

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">Billing & Subscription</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your plan, usage, and payment history.</p>
      </div>

      {/* ── Active subscription card ── */}
      {hasActivePlan && currentSub ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 backdrop-blur-sm overflow-hidden">
          {/* Status bar at top */}
          <div className={cn(
            "h-[2px]",
            isExpiring
              ? "bg-gradient-to-r from-amber-600 to-amber-400"
              : "bg-gradient-to-r from-emerald-600 to-emerald-400",
          )} />
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Plan info */}
              <div className="flex items-center gap-4 flex-1">
                <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  {React.createElement(PLAN_ICONS[currentSub.planId] ?? Shield, {
                    className: "h-5 w-5 text-violet-400",
                  })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-white">{currentSub.planName}</p>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      isExpiring
                        ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                        : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
                    )}>
                      {isExpiring ? "Expiring Soon" : "Active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      Renews {new Date(currentSub.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      isExpiring ? "text-amber-400" : "text-slate-400",
                    )}>
                      {currentSub.daysLeft} day{currentSub.daysLeft !== 1 ? "s" : ""} remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => setShowAllPlans(v => !v)}
                className="flex items-center gap-2 px-4 h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-300 transition-all shrink-0"
              >
                {showAllPlans ? "Hide Plans" : (isExpiring ? "Renew Plan" : "Change Plan")}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAllPlans && "rotate-180")} />
              </button>
            </div>

            {/* Usage bars */}
            {usage && (
              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Current Period Usage
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <UsageBar label="Deep Scans"  used={usage.deepScans.used}  limit={usage.deepScans.limit} />
                  <UsageBar label="Light Scans" used={usage.lightScans.used} limit={usage.lightScans.limit} />
                  <UsageBar label="Reports"     used={usage.reports.used}    limit={usage.reports.limit} />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No active plan banner */
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">No active subscription</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a plan below to start scanning. All plans include AI summaries and PDF reports.
            </p>
          </div>
        </div>
      )}

      {/* ── Plan grid — shown when no plan, or when change/renew clicked ── */}
      {(!hasActivePlan || showAllPlans) && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
          {hasActivePlan && (
            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Secure checkout via Razorpay. Your current plan continues until you switch.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isActive={plan.id === "hunter"}
                isCurrentPlan={currentSub?.planId === plan.id}
                isBusy={checkingOut === plan.id}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-3 flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Payments processed by Razorpay. Subscriptions are valid for 30 days and do not auto-renew.
          </p>
        </div>
      )}

      {/* ── Payment history ── */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Payment History</p>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {payments.map(p => {
              const planLabel = plans.find(pl => pl.id === p.plan_id)?.name?.replace("Pentellia ", "") ?? p.plan_id;
              return (
                <div key={p.razorpay_order_id} className="px-5 py-3 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-200 font-medium">{planLabel} Plan</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.razorpay_payment_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">₹{Number(p.amount_inr).toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}