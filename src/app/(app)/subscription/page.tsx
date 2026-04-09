"use client";

// src/app/(app)/subscription/page.tsx
// Phase 3: Calculator REMOVED. Fixed plan cards with Razorpay checkout.

import React, { useState, useEffect, useCallback } from "react";
import {
  Check, Loader2, Zap, Shield, Crown, Building2,
  RefreshCw, Clock, AlertTriangle, ChevronRight,
  ArrowUpRight, ArrowDownLeft,
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

declare global {
  interface Window { Razorpay: any; }
}

// ── Plan icons ─────────────────────────────────────────────────────────
const PLAN_ICONS: Record<string, React.ElementType> = {
  recon:     Shield,
  hunter:    Zap,
  elite:     Crown,
  elite_max: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  recon:     "from-slate-500/20 to-slate-600/10 border-slate-500/30",
  hunter:    "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  elite:     "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
  elite_max: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
};

const PLAN_BADGE: Record<string, string | null> = {
  recon:     null,
  hunter:    "Most Popular",
  elite:     "Best Value",
  elite_max: "Enterprise",
};

// ── Usage bar ──────────────────────────────────────────────────────────
function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-violet-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{used}/{limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const [plans, setPlans]                 = useState<Plan[]>([]);
  const [currentSub, setCurrentSub]       = useState<CurrentSub | null>(null);
  const [usage, setUsage]                 = useState<UsageData | null>(null);
  const [payments, setPayments]           = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [checkingOut, setCheckingOut]     = useState<string | null>(null);
  const [userEmail, setUserEmail]         = useState("");
  const [userName, setUserName]           = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, statusRes, userRes] = await Promise.all([
        fetch("/api/subscription/plans").then(r => r.json()),
        fetch("/api/subscription/status").then(r => r.json()),
        fetch("/api/users").then(r => r.json()),
      ]);

      if (plansRes.success)  setPlans(plansRes.plans ?? []);
      if (plansRes.currentSubscription) setCurrentSub(plansRes.currentSubscription);
      if (plansRes.usageSummary?.usage)  setUsage(plansRes.usageSummary.usage);
      if (statusRes.paymentHistory)      setPayments(statusRes.paymentHistory ?? []);
      if (userRes.success) {
        setUserEmail(userRes.user?.email ?? "");
        setUserName(`${userRes.user?.firstName ?? ""} ${userRes.user?.lastName ?? ""}`.trim());
      }
    } catch (err) {
      toast.error("Failed to load subscription data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load Razorpay script
  useEffect(() => {
    if (document.getElementById("razorpay-script")) return;
    const s = document.createElement("script");
    s.id  = "razorpay-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(s);
  }, []);

  const handleSubscribe = async (planId: string) => {
    setCheckingOut(planId);
    try {
      // 1. Create order
      const orderRes = await fetch("/api/subscription/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

      // 2. Open Razorpay checkout
      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    "INR",
        name:        "Pentellia",
        description: orderData.description,
        order_id:    orderData.orderId,
        prefill:     { name: userName, email: userEmail },
        theme:       { color: "#7C3AED" },
        handler: async (response: any) => {
          // 3. Verify payment
          const verifyRes = await fetch("/api/subscription/verify-payment", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              planId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success("Subscription activated! 🎉");
            await loadData();
          } else {
            toast.error(verifyData.error || "Activation failed");
          }
        },
        modal: { ondismiss: () => setCheckingOut(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setCheckingOut(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Subscription</h1>
        <p className="text-sm text-slate-400 mt-1">
          Choose a plan that fits your security scanning needs.
        </p>
      </div>

      {/* Current subscription status */}
      {currentSub && (
        <div className={cn(
          "rounded-2xl border p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between",
          currentSub.daysLeft === 0
            ? "border-red-500/20 bg-red-500/5"
            : currentSub.daysLeft <= 3
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-violet-500/20 bg-violet-500/5",
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              "bg-violet-500/20",
            )}>
              {React.createElement(PLAN_ICONS[currentSub.planId] ?? Shield, {
                className: "h-5 w-5 text-violet-400",
              })}
            </div>
            <div>
              <p className="font-semibold text-white">{currentSub.planName}</p>
              <p className="text-xs text-slate-400">
                {currentSub.daysLeft === 0
                  ? "Expired"
                  : `${currentSub.daysLeft} day${currentSub.daysLeft !== 1 ? "s" : ""} remaining`
                }
                {" · "}Expires {new Date(currentSub.expiresAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
          {currentSub.daysLeft <= 7 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Renew below to continue uninterrupted
            </div>
          )}
        </div>
      )}

      {/* Usage bars */}
      {usage && currentSub && (
        <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/50 p-5 space-y-3">
          <p className="text-sm font-medium text-slate-300">Current Period Usage</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UsageBar label="Deep Scans"  used={usage.deepScans.used}  limit={usage.deepScans.limit} />
            <UsageBar label="Light Scans" used={usage.lightScans.used} limit={usage.lightScans.limit} />
            <UsageBar label="Reports"     used={usage.reports.used}    limit={usage.reports.limit} />
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map(plan => {
          const Icon       = PLAN_ICONS[plan.id] ?? Shield;
          const colors     = PLAN_COLORS[plan.id] ?? PLAN_COLORS.recon;
          const badge      = PLAN_BADGE[plan.id];
          const isActive   = currentSub?.planId === plan.id;
          const isLoading  = checkingOut === plan.id;
          const isPopular  = plan.id === "hunter";

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border bg-gradient-to-br p-5 flex flex-col gap-4",
                colors,
                isPopular && "ring-1 ring-violet-500/50",
              )}
            >
              {badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-600 text-white whitespace-nowrap">
                  {badge}
                </span>
              )}

              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                    Active
                  </span>
                )}
              </div>

              <div>
                <p className="font-semibold text-white text-sm">{plan.name}</p>
                <p className="mt-1">
                  <span className="text-2xl font-bold text-white">
                    ₹{plan.price_inr.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </p>
              </div>

              {/* Limits */}
              <ul className="space-y-1.5 flex-1">
                {[
                  { label: `${plan.deep_scan_monthly} deep scans/mo`,  sub: `${plan.deep_scan_daily}/day`  },
                  { label: `${plan.light_scan_monthly} light scans/mo`, sub: `${plan.light_scan_daily}/day` },
                  { label: `${plan.report_monthly} reports/mo`,        sub: `${plan.report_daily}/day`     },
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300">
                      {f.label}
                      <span className="text-slate-500 ml-1">({f.sub})</span>
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isActive || !!checkingOut}
                className={cn(
                  "w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : isPopular
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-white/10 hover:bg-white/20 text-slate-200",
                  !!checkingOut && !isLoading && "opacity-40 cursor-not-allowed",
                )}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : isActive ? (
                  <><Check className="h-4 w-4" /> Current Plan</>
                ) : (
                  <>Subscribe <ChevronRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/50 overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <p className="text-sm font-medium text-slate-300">Payment History</p>
          </div>
          <div className="divide-y divide-white/5">
            {payments.map(p => (
              <div key={p.razorpay_order_id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200">{p.plan_id ? `Plan: ${p.plan_id}` : "Subscription"}</p>
                    <p className="text-xs text-slate-500">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      {" · "}
                      <span className="font-mono text-[10px]">{p.razorpay_payment_id}</span>
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-400">
                  +₹{Number(p.amount_inr).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}