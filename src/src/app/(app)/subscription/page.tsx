"use client";

import { useWallet } from "@/providers/WalletProvider";

import React, { useState, useEffect, useCallback } from "react";
import {
  Check, Loader2, Zap, Shield, Crown, Building2,
  Clock, ChevronRight, ChevronDown, Download,
  CreditCard, Calendar, TrendingUp, RefreshCw,
  Lock, Star, Receipt, AlertTriangle, Info, X, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { refreshSession } from "@/lib/refreshSession";

interface Plan {
  id: string; name: string; price_inr: number;
  deep_scan_monthly: number; light_scan_monthly: number; report_monthly: number;
  deep_scan_daily: number; light_scan_daily: number; report_daily: number;
}
interface CurrentSub {
  planId: string; planName: string; status: string;
  expiresAt: string; daysLeft: number; pendingPlanId?: string | null;
}
interface UsageItem { used: number; limit: number; dailyUsed?: number; dailyLimit?: number; }
interface UsageData { deepScans: UsageItem; lightScans: UsageItem; reports: UsageItem; }
interface PaymentRecord {
  razorpay_order_id: string; razorpay_payment_id: string;
  amount_inr: number; plan_id: string; status: string; paid_at: string;
}
interface InvoiceMap { [paymentId: string]: { id: string; invoice_number: string } }

declare global { interface Window { Razorpay: any; } }

const PLAN_ICONS: Record<string, React.ElementType> = {
  recon: Shield, hunter: Zap, elite: Crown, elite_max: Building2,
};

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-white/[0.04]", className)} />;
}
function PageSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <Sk className="h-6 w-52" />
      <Sk className="h-36 w-full rounded-lg" />
      <Sk className="h-20 w-full rounded-lg" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Sk key={i} className="h-56 rounded-lg" />)}</div>
    </div>
  );
}

function UsageBar({ label, used, limit, dailyUsed, dailyLimit }: { label: string; used: number; limit: number; dailyUsed?: number; dailyLimit?: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-violet-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono">
          <span className="text-slate-200">{used}</span><span className="text-slate-600">/{limit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", bar)} style={{ width: `${pct}%` }} />
      </div>
      {dailyUsed !== undefined && dailyLimit !== undefined && (
        <p className="text-[10px] text-slate-600">{dailyUsed}/{dailyLimit} today</p>
      )}
    </div>
  );
}

function PlanCard({ plan, isCurrentPlan, isPendingPlan, isBusy, onSubscribe }: {
  plan: Plan; isCurrentPlan: boolean; isPendingPlan: boolean; isBusy: boolean; onSubscribe: (id: string) => void;
}) {
  const Icon      = PLAN_ICONS[plan.id] ?? Shield;
  const isPopular = plan.id === "hunter";

  return (
    <div className={cn(
      "relative flex flex-col rounded-lg border overflow-hidden transition-all duration-200",
      isCurrentPlan ? "border-violet-500/40 bg-violet-500/[0.05]"
      : isPendingPlan ? "border-amber-500/30 bg-amber-500/[0.03]"
      : isPopular    ? "border-violet-500/20 bg-[#0d0e1a] hover:border-violet-500/35"
      : "border-white/[0.07] bg-[#0d0e1a] hover:border-white/[0.14]",
    )}>
      <div className={cn("h-[2px] w-full", isCurrentPlan ? "bg-gradient-to-r from-violet-600 to-indigo-500" : isPopular ? "bg-gradient-to-r from-violet-700 to-violet-500" : "bg-white/[0.04]")} />
      <div className="p-4 flex flex-col flex-1 gap-3.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn("h-7 w-7 rounded-md flex items-center justify-center border", isCurrentPlan ? "bg-violet-500/15 border-violet-500/25" : "bg-violet-500/10 border-violet-500/10")}>
              <Icon className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">{plan.name.replace("Pentellia ", "")}</p>
              {isPopular && !isCurrentPlan && (
                <span className="text-[10px] font-medium text-violet-400 flex items-center gap-0.5 mt-0.5">
                  <Star className="h-2.5 w-2.5 fill-violet-400" /> Popular
                </span>
              )}
            </div>
          </div>
          {isCurrentPlan && <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/25 px-1.5 py-0.5 rounded">Active</span>}
          {isPendingPlan && <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">Scheduled</span>}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-xs text-slate-500">₹</span>
          <span className="text-xl font-bold text-white">{plan.price_inr.toLocaleString("en-IN")}</span>
          <span className="text-xs text-slate-500">/mo</span>
        </div>

        <ul className="space-y-1.5 flex-1">
          {[
            `${plan.deep_scan_monthly} deep scans (${plan.deep_scan_daily}/day)`,
            `${plan.light_scan_monthly} light scans (${plan.light_scan_daily}/day)`,
            `${plan.report_monthly} reports`,
          ].map((f, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-3 w-3 text-violet-500/60 shrink-0" />
              <span className="text-xs text-slate-400">{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onSubscribe(plan.id)}
          disabled={isCurrentPlan || isBusy}
          className={cn(
            "w-full h-8 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5",
            isCurrentPlan ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 cursor-default"
            : isPopular    ? "bg-violet-600 hover:bg-violet-500 text-white"
            : "bg-white/[0.06] hover:bg-white/[0.10] text-slate-200 border border-white/[0.07]",
            isBusy && !isCurrentPlan && "opacity-50 cursor-not-allowed",
          )}
        >
          {isBusy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing</>
          : isCurrentPlan ? <><Check className="h-3.5 w-3.5" /> Current Plan</>
          : <>Select <ChevronRight className="h-3 w-3" /></>}
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { refresh: refreshWallet } = useWallet();
  const [plans,       setPlans]       = useState<Plan[]>([]);
  const [currentSub,  setCurrentSub]  = useState<CurrentSub | null>(null);
  const [usage,       setUsage]       = useState<UsageData | null>(null);
  const [payments,    setPayments]    = useState<PaymentRecord[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [showPlans,   setShowPlans]   = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [receiptModal, setReceiptModal] = useState<{ html: string; paymentId: string; invoiceNumber: string } | null>(null);
  const [userEmail,   setUserEmail]   = useState("");
  const [userName,    setUserName]    = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, statusRes, userRes] = await Promise.all([
        fetch("/api/subscription/plans").then(r => r.json()),
        fetch("/api/subscription/status").then(r => r.json()),
        fetch("/api/users").then(r => r.json()),
      ]);
      if (plansRes.success)             setPlans(plansRes.plans ?? []);
      if (plansRes.currentSubscription) setCurrentSub(plansRes.currentSubscription);
      if (plansRes.usageSummary?.usage) setUsage(plansRes.usageSummary.usage);
      if (statusRes.paymentHistory) {
        const pmts: PaymentRecord[] = statusRes.paymentHistory ?? [];
        setPayments(pmts);
        // All payments get a download button — invoice route handles both
        // new payments (invoices table) and old payments (razorpay_orders fallback)
      }
      if (userRes.success) {
        setUserEmail(userRes.user?.email ?? "");
        setUserName(`${userRes.user?.firstName ?? ""} ${userRes.user?.lastName ?? ""}`.trim());
      }
    } catch { toast.error("Failed to load subscription data"); }
    finally  { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (document.getElementById("rzp-script")) return;
    const s = Object.assign(document.createElement("script"), { id: "rzp-script", src: "https://checkout.razorpay.com/v1/checkout.js" });
    document.body.appendChild(s);
  }, []);

  const handleSubscribe = async (planId: string) => {
    setCheckingOut(planId);
    try {
      // Refresh session cookie before any payment API call —
      // prevents 401s from stale tokens after Google login or long idle
      await refreshSession();

      const orderRes  = await fetch("/api/subscription/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

      const rzp = new window.Razorpay({
        key: orderData.keyId, amount: orderData.amount, currency: "INR",
        name: "Pentellia", description: orderData.description, order_id: orderData.orderId,
        prefill: { name: userName, email: userEmail }, theme: { color: "#7C3AED" },
        handler: async (response: any) => {
          try {
            // Re-refresh after Razorpay popup closes — popup can take minutes
            await refreshSession();

            const vRes  = await fetch("/api/subscription/verify-payment", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, planId }),
            });
            const vData = await vRes.json();
            if (vData.success) {
              const msg = vData.immediate === false
                ? vData.message
                : "Subscription activated! A confirmation has been sent to your email.";
              toast.success(msg, { duration: 5000 });
              setShowPlans(false);
              await loadData();
              refreshWallet();
            } else {
              toast.error(vData.error || "Activation failed. Contact support if payment was deducted.");
            }
          } catch {
            toast.error("Network error during verification. Contact support if payment was deducted.");
          } finally {
            setCheckingOut(null);
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

  // Open receipt modal (fetches HTML, renders inline)
  const handleViewReceipt = async (paymentId: string) => {
    setDownloading(paymentId);
    try {
      const res = await fetch(`/api/invoice/download?payment_id=${paymentId}&format=html`);
      if (!res.ok) { toast.error("Could not load receipt"); return; }
      const html = await res.text();
      // Extract invoice number from HTML title
      const match = html.match(/Invoice ([\w-]+)/);
      const invoiceNumber = match ? match[1] : paymentId.slice(-8).toUpperCase();
      setReceiptModal({ html, paymentId, invoiceNumber });
    } catch { toast.error("Failed to load receipt"); }
    finally { setDownloading(null); }
  };

  // Direct PDF download
  const handleDownloadPdf = async (paymentId: string) => {
    setDownloading(paymentId);
    try {
      const res = await fetch(`/api/invoice/download?payment_id=${paymentId}&format=pdf`);
      if (!res.ok) { toast.error("Could not generate PDF"); return; }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `pentellia-invoice-${paymentId.slice(-8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
    finally { setDownloading(null); }
  };

  const handleDownloadInvoice = handleViewReceipt; // kept for backward compat

  if (isLoading) return <PageSkeleton />;

  const hasActivePlan = !!currentSub && currentSub.status === "active" && currentSub.daysLeft > 0;
  const isExpiring    = hasActivePlan && currentSub!.daysLeft <= 7;
  const daysLeft      = currentSub?.daysLeft ?? 0;
  const barPct        = Math.min(100, Math.round((daysLeft / 30) * 100));
  const pendingPlan   = plans.find(p => p.id === currentSub?.pendingPlanId);

  return (
    <div className="px-8 pt-6 pb-10 space-y-6 animate-in fade-in duration-300">

      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">Billing & Subscription</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your plan, usage, and payment history.</p>
      </div>

      {/* ── Current plan ── */}
      {hasActivePlan && currentSub ? (
        <div className="rounded-lg border border-white/[0.07] bg-[#0d0e1a] overflow-hidden">
          <div className={cn("h-[2px] w-full", isExpiring ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-violet-600 to-indigo-500")} />
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="h-11 w-11 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
                  {React.createElement(PLAN_ICONS[currentSub.planId] ?? Shield, { className: "h-5 w-5 text-violet-400" })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-semibold text-white">{currentSub.planName}</p>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                      isExpiring ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-violet-300 bg-violet-500/10 border-violet-500/20"
                    )}>
                      {isExpiring ? "Expiring Soon" : "Active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      Expires {new Date(currentSub.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className={cn("text-xs font-medium", isExpiring ? "text-amber-400" : "text-slate-400")}>
                      {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", isExpiring ? "bg-amber-500" : "bg-violet-500")} style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPlans(v => !v)}
                className="flex items-center gap-2 px-4 h-9 rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] text-sm text-slate-300 transition-all shrink-0"
              >
                {showPlans ? "Hide Plans" : isExpiring ? "Renew Plan" : "Change Plan"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showPlans && "rotate-180")} />
              </button>
            </div>

            {/* Pending downgrade notice */}
            {pendingPlan && (
              <div className="mt-4 flex items-start gap-2.5 p-3 rounded-md bg-amber-500/[0.06] border border-amber-500/20">
                <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  Downgrade to <strong>{pendingPlan.name.replace("Pentellia ", "")}</strong> is scheduled and will apply when your current plan expires.
                  Your usage limits will not decrease until then.
                </p>
              </div>
            )}

            {/* Usage */}
            {usage && (
              <div className="mt-4 pt-4 border-t border-white/[0.05]">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                  <p className="text-xs font-medium text-slate-400">Current Period Usage</p>
                  <span className="ml-auto text-[10px] text-slate-600">resets on plan renewal</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <UsageBar label="Deep Scans"  used={usage.deepScans.used}  limit={usage.deepScans.limit}  dailyUsed={usage.deepScans.dailyUsed}  dailyLimit={usage.deepScans.dailyLimit} />
                  <UsageBar label="Light Scans" used={usage.lightScans.used} limit={usage.lightScans.limit} dailyUsed={usage.lightScans.dailyUsed} dailyLimit={usage.lightScans.dailyLimit} />
                  <UsageBar label="Reports"     used={usage.reports.used}    limit={usage.reports.limit}    dailyUsed={usage.reports.dailyUsed}    dailyLimit={usage.reports.dailyLimit} />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.05] p-5 flex items-start gap-4">
          <div className="h-9 w-9 rounded-md bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">No active subscription</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Choose a plan below to start scanning. All plans include AI summaries and PDF reports.
            </p>
          </div>
        </div>
      )}

      {/* ── Plans ── */}
      {(!hasActivePlan || showPlans) && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200 space-y-3">
          {hasActivePlan && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Upgrading takes effect immediately. Downgrading applies after your current plan expires.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentSub?.planId === plan.id}
                isPendingPlan={currentSub?.pendingPlanId === plan.id}
                isBusy={checkingOut === plan.id}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Payments by Razorpay · 30-day cycles · No auto-renewal
          </p>
        </div>
      )}

      {/* ── Payment history with invoice download ── */}
      {payments.length > 0 ? (
        <div className="rounded-lg border border-white/[0.07] bg-[#0d0e1a] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-slate-500" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Payment History</p>
            </div>
            <span className="text-[11px] text-slate-600">{payments.length} record{payments.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="hidden sm:grid grid-cols-[1fr_140px_120px_100px_44px] gap-4 px-5 py-2 border-b border-white/[0.04]">
            {["Plan", "Payment ID", "Date", "Amount", ""].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-white/[0.04]">
            {payments.map(p => {
              const planLabel = plans.find(pl => pl.id === p.plan_id)?.name?.replace("Pentellia ", "") ?? p.plan_id;
              const isDown    = downloading === p.razorpay_payment_id;
              return (
                <div key={p.razorpay_order_id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                  {/* Mobile */}
                  <div className="sm:hidden flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200 font-medium">{planLabel} Plan</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.razorpay_payment_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">₹{Number(p.amount_inr).toLocaleString("en-IN")}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleViewReceipt(p.razorpay_payment_id)} disabled={isDown}
                          className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                          {isDown ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => handleDownloadPdf(p.razorpay_payment_id)} disabled={isDown}
                          className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[1fr_140px_120px_100px_44px] gap-4 items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-md bg-violet-500/10 border border-violet-500/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-3 w-3 text-violet-400" />
                      </div>
                      <span className="text-sm text-slate-200 font-medium">{planLabel} Plan</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono truncate">{p.razorpay_payment_id}</span>
                    <span className="text-xs text-slate-400">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">₹{Number(p.amount_inr).toLocaleString("en-IN")}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleViewReceipt(p.razorpay_payment_id)} disabled={isDown}
                        title="View receipt"
                        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all disabled:opacity-50">
                        {isDown ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleDownloadPdf(p.razorpay_payment_id)} disabled={isDown}
                        title="Download PDF"
                        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all disabled:opacity-50">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.07] bg-[#0d0e1a] p-8 flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Receipt className="h-5 w-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 font-medium">No payments yet</p>
          <p className="text-xs text-slate-600">Your payment history will appear here after subscribing.</p>
        </div>
      )}
      {/* ── Receipt Modal ──────────────────────────────────────── */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setReceiptModal(null)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0d0e1a] border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">Invoice {receiptModal.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(receiptModal.paymentId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </button>
                <button onClick={() => setReceiptModal(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Invoice HTML rendered in scaled iframe */}
            <div className="bg-white overflow-auto" style={{ maxHeight: "calc(90vh - 56px)" }}>
              <iframe
                srcDoc={receiptModal.html}
                title="Invoice"
                className="w-full border-0"
                style={{ minHeight: "600px", height: "100%" }}
                onLoad={e => {
                  const iframe = e.currentTarget;
                  const doc    = iframe.contentDocument;
                  if (doc) iframe.style.height = doc.body.scrollHeight + "px";
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}