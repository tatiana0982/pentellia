"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet, CreditCard, Zap, Check, ChevronRight,
  Loader2, RefreshCw, Clock, ArrowUpRight, ArrowDownLeft,
  Shield, Lock, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────
interface WalletData {
  balance:         number;
  totalSpent:      number;
  totalBought:     number;
  totalScans:      number;
  verifiedDomains: number;
}

interface Transaction {
  id:            string;
  type:          "credit" | "debit";
  amount:        number;
  balance_after: number;
  description:   string;
  ref_type:      string;
  created_at:    string;
}

// ─── Server-authoritative tiers (must match create-order/route.ts) ────
const TIERS = [
  { id: "plan_299",  inr:  299, label: "₹299",  popular: false, bonus: ""        },
  { id: "plan_499",  inr:  499, label: "₹499",  popular: true,  bonus: "Popular" },
  { id: "plan_999",  inr:  999, label: "₹999",  popular: false, bonus: "Best"    },
  { id: "plan_1999", inr: 1999, label: "₹1,999", popular: false, bonus: ""       },
  { id: "plan_2499", inr: 2499, label: "₹2,499", popular: false, bonus: "Max"    },
];

// Scan estimator — how many operations ₹N buys
function estimateScans(inr: number) {
  return {
    standard: Math.floor(inr / 0.5),
    light:    Math.floor(inr / 1.0),
    deep:     Math.floor(inr / 2.0),
    ai:       Math.floor(inr / 5.0),
  };
}

// ─── Skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-slate-800/50 animate-pulse", className)} />;
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  // Safe default: all zeros — never null, never crashes on render
  const [wallet,       setWallet]       = useState<WalletData>({
    balance: 0, totalSpent: 0, totalBought: 0, totalScans: 0, verifiedDomains: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [paying,       setPaying]       = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<"topup" | "history">("topup");

  // ── Fetch wallet + transactions ────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [wRes, tRes] = await Promise.all([
        fetch("/api/subscription/wallet-summary"),
        fetch("/api/subscription/status?limit=20"),
      ]);
      const [wData, tData] = await Promise.all([wRes.json(), tRes.json()]);

      if (wData.success) {
        setWallet({
          balance:         wData.balance         ?? 0,
          totalSpent:      wData.totalSpent       ?? 0,
          totalBought:     wData.totalBought      ?? 0,
          totalScans:      wData.totalScans       ?? 0,
          verifiedDomains: wData.verifiedDomains  ?? 0,
        });
      }
      if (tData.success) setTransactions(tData.transactions ?? []);
    } catch {
      // Silent — don't crash the page on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Razorpay payment flow ──────────────────────────────────────────
  const handleTopUp = async (planId: string, amountINR: number) => {
    setPaying(planId);
    try {
      // 1. Create order server-side
      const orderRes  = await fetch("/api/subscription/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

      // 2. Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    "INR",
        name:        "Pentellia",
        description: orderData.name,
        order_id:    orderData.orderId,
        prefill:     {},
        theme:       { color: "#7c3aed" },
        handler: async (response: any) => {
          // 3. Verify on server
          const verifyRes  = await fetch("/api/subscription/verify-payment", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            toast.success(`₹${amountINR} added to your wallet!`);
            fetchData(true); // Refresh wallet silently
          } else {
            toast.error("Payment verification failed. Contact support.");
          }
          setPaying(null);
        },
        modal: {
          ondismiss: () => setPaying(null),
        },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setPaying(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  const balance     = wallet.balance;
  const pct         = wallet.totalBought > 0
    ? Math.min(100, Math.round((balance / 2499) * 100))
    : 0;

  const walletStatus =
    balance === 0   ? { label: "Empty",   color: "text-red-400",    bar: "bg-red-500"    }
    : balance < 5   ? { label: "Low",     color: "text-amber-400",  bar: "bg-amber-500"  }
    : balance < 50  ? { label: "Active",  color: "text-violet-400", bar: "bg-violet-500" }
                    : { label: "Healthy", color: "text-emerald-400", bar: "bg-emerald-500" };

  return (
    <>
      {/* Razorpay checkout script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 font-sans text-slate-200">

        {/* ── Wallet card ─────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/60 via-indigo-950/40 to-[#08080f]">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage:"radial-gradient(circle at 20% 50%, rgba(124,58,237,0.4) 0%, transparent 55%)" }} />
          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Wallet Balance</p>
                {loading
                  ? <Skeleton className="h-10 w-36 mt-1" />
                  : <h2 className="text-4xl font-black text-white tracking-tight">
                      ₹{balance.toFixed(2)}
                    </h2>}
                <p className={cn("text-sm font-semibold mt-1", walletStatus.color)}>
                  {walletStatus.label}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchData(true)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <div className="h-12 w-12 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-violet-400" />
                </div>
              </div>
            </div>

            {/* Balance bar */}
            <div className="mb-6">
              <div className="h-1.5 w-full rounded-full bg-slate-800/60 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", walletStatus.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">
                {pct}% of ₹2,499 reference capacity
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Added",  value: loading ? null : `₹${wallet.totalBought.toFixed(0)}`  },
                { label: "Total Spent",  value: loading ? null : `₹${wallet.totalSpent.toFixed(0)}`   },
                { label: "Scans Run",    value: loading ? null : wallet.totalScans.toString()          },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/40">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">{s.label}</p>
                  {s.value === null
                    ? <Skeleton className="h-5 w-16" />
                    : <p className="text-sm font-bold text-white">{s.value}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800/50 w-fit">
          {(["topup", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
                activeTab === tab
                  ? "bg-violet-600 text-white shadow-[0_2px_8px_rgba(124,58,237,0.35)]"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50",
              )}
            >
              {tab === "topup" ? "Add Funds" : "Transaction History"}
            </button>
          ))}
        </div>

        {/* ── Top-up tab ──────────────────────────────────────────── */}
        {activeTab === "topup" && (
          <div className="space-y-6">

            {/* Tiers grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {TIERS.map((tier) => {
                const est     = estimateScans(tier.inr);
                const isPaying = paying === tier.id;
                return (
                  <div
                    key={tier.id}
                    className={cn(
                      "relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-150 cursor-pointer group",
                      tier.popular
                        ? "bg-violet-600/10 border-violet-500/30 hover:border-violet-500/50"
                        : "bg-[#0d0e1a] border-slate-800/60 hover:border-slate-700/60",
                    )}
                    onClick={() => !isPaying && handleTopUp(tier.id, tier.inr)}
                  >
                    {tier.bonus && (
                      <span className={cn(
                        "absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full",
                        tier.popular ? "bg-violet-600 text-white" : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/25",
                      )}>
                        {tier.bonus}
                      </span>
                    )}

                    <div className="text-center">
                      <p className="text-2xl font-black text-white">{tier.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">wallet credits</p>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Standard scans</span>
                        <span className="font-semibold text-white">{est.standard}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Deep scans</span>
                        <span className="font-semibold text-white">{est.deep}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AI summaries</span>
                        <span className="font-semibold text-white">{est.ai}</span>
                      </div>
                    </div>

                    <button
                      disabled={isPaying}
                      className={cn(
                        "w-full mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all",
                        tier.popular
                          ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_2px_12px_rgba(124,58,237,0.35)]"
                          : "bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50",
                        isPaying && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {isPaying
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Processing…</>
                        : <><CreditCard className="h-3.5 w-3.5" />Pay ₹{tier.inr}</>}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Credit rate table */}
            <div className="rounded-2xl bg-[#0d0e1a] border border-slate-800/60 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" /> Credit Usage Rates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Normal Scan",    cost: "₹0.50", color: "text-emerald-400" },
                  { label: "Light Scan",     cost: "₹1.00", color: "text-blue-400"    },
                  { label: "Deep Scan",      cost: "₹2.00", color: "text-amber-400"   },
                  { label: "AI Summary",     cost: "₹5.00", color: "text-violet-400"  },
                ].map((r) => (
                  <div key={r.label} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/40 text-center">
                    <p className={cn("text-lg font-black", r.color)}>{r.cost}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 py-2">
              {[
                { icon: Lock,       label: "256-bit SSL Encrypted"  },
                { icon: Shield,     label: "PCI DSS Compliant"      },
                { icon: BadgeCheck, label: "Powered by Razorpay"    },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-xs text-slate-500">
                  <t.icon className="h-3.5 w-3.5 text-violet-400" />
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── History tab ─────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className={cn("h-16 rounded-xl", i % 2 && "opacity-60")} />
              ))
            ) : transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/20 py-16 flex flex-col items-center gap-3">
                <Clock className="h-8 w-8 text-slate-600" />
                <p className="text-slate-500 text-sm">No transactions yet</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[#0d0e1a] border border-slate-800/50 hover:border-slate-700/60 transition-all"
                >
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    tx.type === "credit" ? "bg-emerald-500/10" : "bg-red-500/10",
                  )}>
                    {tx.type === "credit"
                      ? <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                      : <ArrowUpRight  className="h-4 w-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{tx.description}</p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-sm font-bold",
                      tx.type === "credit" ? "text-emerald-400" : "text-red-400",
                    )}>
                      {tx.type === "credit" ? "+" : "−"}₹{Math.abs(parseFloat(String(tx.amount))).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-600">bal ₹{parseFloat(String(tx.balance_after)).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}