"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Wallet,
  CreditCard,
  Zap,
  Check,
  Loader2,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Lock,
  BadgeCheck,
  Download,
  ChevronRight,
  Activity,
  Target,
  FileText,
  Sparkles,
  AlertTriangle,
  X,
  TrendingUp,
  Database,
  Cpu,
  Globe,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────
interface WalletData {
  balance: number;
  totalSpent: number;
  totalBought: number;
  totalScans: number;
  verifiedDomains: number;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  description: string;
  ref_type: string;
  ref_id?: string;
  created_at: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Server-authoritative tiers ────────────────────────────────────────
const TIERS = [
  { id: "plan_299",  inr: 299,  label: "₹299",   tag: "",       tagColor: "" },
  { id: "plan_499",  inr: 499,  label: "₹499",   tag: "Popular", tagColor: "violet" },
  { id: "plan_999",  inr: 999,  label: "₹999",   tag: "Best",    tagColor: "fuchsia" },
  { id: "plan_1999", inr: 1999, label: "₹1,999", tag: "",       tagColor: "" },
  { id: "plan_2499", inr: 2499, label: "₹2,499", tag: "Max",    tagColor: "emerald" },
];

// ─── Pricing rates for calculator ──────────────────────────────────────
const RATES = {
  deepScan:    2.00,
  lightScan:   1.00,
  normalScan:  0.50,
  aiSummary:   5.00,
};

function estimateUsage(inr: number) {
  return {
    deep:   Math.floor(inr / RATES.deepScan),
    light:  Math.floor(inr / RATES.lightScan),
    normal: Math.floor(inr / RATES.normalScan),
    ai:     Math.floor(inr / RATES.aiSummary),
  };
}

// ─── Skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-slate-800/50 animate-pulse", className)} />;
}

// ─── Low Balance Modal ─────────────────────────────────────────────────
function LowBalanceModal({
  balance,
  onClose,
  onTopUp,
}: {
  balance: number;
  onClose: () => void;
  onTopUp: () => void;
}) {
  const isEmpty = balance === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-[#0d0010] shadow-[0_0_60px_rgba(239,68,68,0.2)] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
        
        <div className="p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEmpty ? "Wallet Empty" : "Low Balance Warning"}
              </h3>
              <p className="text-sm text-slate-400">
                {isEmpty ? "Scanning is paused" : `₹${balance.toFixed(2)} remaining`}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            {isEmpty
              ? "Your wallet has run out of credits. All scan operations have been paused. Top up now to continue securing your infrastructure."
              : "Your balance is critically low. You may run out of credits soon, causing scan interruptions. We recommend topping up now."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 transition-all"
            >
              Dismiss
            </button>
            <button
              onClick={() => { onClose(); onTopUp(); }}
              className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(124,58,237,0.35)] transition-all"
            >
              Top Up Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ─────────────────────────────────────────────────────
function ReceiptModal({
  transaction,
  user,
  onClose,
}: {
  transaction: Transaction | null;
  user: UserProfile | null;
  onClose: () => void;
}) {
  if (!transaction) return null;

  const handlePrint = () => {
    const receiptWindow = window.open("", "_blank", "width=600,height=800");
    if (!receiptWindow) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Pentellia Payment Receipt</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 40px; }
    .receipt { max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4c1d95, #7c3aed); color: white; padding: 30px; text-align: center; }
    .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
    .subtitle { font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 2px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-top: 12px; }
    .body { padding: 30px; }
    .amount-box { background: #f8f7ff; border: 1px solid #ede9fe; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .amount { font-size: 40px; font-weight: 800; color: #4c1d95; }
    .amount-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; color: #1a1a2e; text-align: right; max-width: 250px; word-break: break-all; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6; border-top: 1px solid #e5e7eb; }
    .status { display: inline-flex; align-items: center; gap: 6px; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo">■ PENTELLIA</div>
      <div class="subtitle">Security Intelligence Platform</div>
      <div class="badge">Payment Receipt</div>
    </div>
    <div class="body">
      <div class="amount-box">
        <div class="amount">₹${parseFloat(String(transaction.amount)).toFixed(2)}</div>
        <div class="amount-label">Amount Credited</div>
        <div style="margin-top:12px"><span class="status">✓ Payment Successful</span></div>
      </div>
      <div class="row"><span class="label">Transaction ID</span><span class="value">${transaction.ref_id || transaction.id}</span></div>
      <div class="row"><span class="label">Receipt No.</span><span class="value">RCP-${transaction.id.slice(0,8).toUpperCase()}</span></div>
      <div class="row"><span class="label">Date & Time</span><span class="value">${new Date(transaction.created_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "medium" })}</span></div>
      <div class="row"><span class="label">Customer Name</span><span class="value">${user ? `${user.firstName} ${user.lastName}`.trim() || "Customer" : "Customer"}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${user?.email || "—"}</span></div>
      <div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>
      <div class="row"><span class="label">Payment Method</span><span class="value">Razorpay (Online Payment)</span></div>
      <div class="row"><span class="label">Balance After</span><span class="value">₹${parseFloat(String(transaction.balance_after)).toFixed(2)}</span></div>
      <div class="row"><span class="label">Currency</span><span class="value">INR (Indian Rupee)</span></div>
    </div>
    <div class="footer">
      <strong>Pentellia Security</strong> · pentellia.io<br />
      This is a computer-generated receipt and does not require a signature.<br />
      For support: pentellia@encoderspro.com<br />
      © ${new Date().getFullYear()} Pentellia. All rights reserved.
    </div>
  </div>
  <script>window.print(); window.onafterprint = () => window.close();</script>
</body>
</html>`;
    receiptWindow.document.write(html);
    receiptWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-violet-500/20 bg-[#0d0e1a] shadow-2xl overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 to-fuchsia-600" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Payment Receipt</h3>
                <p className="text-xs text-slate-500">Auto-generated · No signature required</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Amount hero */}
          <div className="rounded-xl bg-gradient-to-br from-violet-600/15 to-fuchsia-600/10 border border-violet-500/20 p-5 text-center mb-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Amount Credited</p>
            <p className="text-4xl font-black text-white">₹{parseFloat(String(transaction.amount)).toFixed(2)}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <Check className="h-3 w-3" /> Verified & Credited
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2.5 mb-5">
            {[
              { label: "Receipt No.", value: `RCP-${transaction.id.slice(0, 8).toUpperCase()}` },
              { label: "Transaction ID", value: transaction.ref_id || transaction.id, mono: true },
              { label: "Date & Time", value: new Date(transaction.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) },
              { label: "Customer", value: user ? `${user.firstName} ${user.lastName}`.trim() : "—" },
              { label: "Email", value: user?.email || "—" },
              { label: "Balance After", value: `₹${parseFloat(String(transaction.balance_after)).toFixed(2)}` },
              { label: "Payment via", value: "Razorpay (Online)" },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-2 border-b border-slate-800/50 last:border-0">
                <span className="text-xs text-slate-500 shrink-0">{row.label}</span>
                <span className={cn("text-xs font-semibold text-slate-200 text-right break-all", row.mono && "font-mono text-[10px]")}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-center text-slate-600 mb-4">
            This is a computer-generated receipt and does not require a signature.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 transition-all"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(124,58,237,0.25)] transition-all"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Calculator ────────────────────────────────────────────────
function PricingCalculator({
  onAmountSelect,
  paying,
}: {
  onAmountSelect: (planId: string, amount: number) => void;
  paying: string | null;
}) {
  const [deepOps,   setDeepOps]   = useState(10);
  const [lightOps,  setLightOps]  = useState(20);
  const [normalOps, setNormalOps] = useState(50);
  const [aiSums,    setAiSums]    = useState(5);

  const rawTotal = (deepOps * RATES.deepScan) + (lightOps * RATES.lightScan) + (normalOps * RATES.normalScan) + (aiSums * RATES.aiSummary);
  const MIN = 10;
  const total = Math.max(rawTotal, MIN);
  const minApplied = rawTotal < MIN;

  // Map total to closest tier or custom
  const getClosestPlan = () => {
    const sorted = [...TIERS].sort((a, b) => Math.abs(a.inr - total) - Math.abs(b.inr - total));
    const closest = sorted[0];
    if (Math.abs(closest.inr - total) <= 50) return closest;
    return null;
  };

  const closestPlan = getClosestPlan();

  const sliderCls = "w-full h-1.5 rounded-full appearance-none bg-slate-800 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0d0e1a] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.5)]";

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-[#0d0e1a] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800/50 bg-violet-500/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <BarChart2 className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Usage Estimator</h3>
            <p className="text-xs text-slate-500">Drag sliders to estimate your wallet top-up</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Sliders */}
        {[
          { label: "Deep Scans", icon: Cpu, value: deepOps, setter: setDeepOps, max: 200, rate: RATES.deepScan, color: "text-red-400", desc: "Full intensive scans" },
          { label: "Light Scans", icon: Activity, value: lightOps, setter: setLightOps, max: 500, rate: RATES.lightScan, color: "text-amber-400", desc: "Standard tool runs" },
          { label: "Normal Scans", icon: Globe, value: normalOps, setter: setNormalOps, max: 1000, rate: RATES.normalScan, color: "text-blue-400", desc: "Quick checks & probes" },
          { label: "AI Summaries", icon: Sparkles, value: aiSums, setter: setAiSums, max: 50, rate: RATES.aiSummary, color: "text-fuchsia-400", desc: "Executive AI reports" },
        ].map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                <span className="text-[10px] text-slate-600">{item.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{item.value}</span>
                <span className={cn("text-[10px] font-bold", item.color)}>
                  ₹{(item.value * item.rate).toFixed(2)}
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={item.max}
              step={1}
              value={item.value}
              onChange={(e) => item.setter(Number(e.target.value))}
              className={sliderCls}
              style={{ background: `linear-gradient(to right, #7c3aed ${(item.value / item.max) * 100}%, #1e293b ${(item.value / item.max) * 100}%)` }}
            />
            <div className="flex justify-between text-[9px] text-slate-700">
              <span>₹{item.rate}/each</span>
              <span>{item.max} max</span>
            </div>
          </div>
        ))}

        {/* Breakdown */}
        <div className="rounded-xl bg-slate-900/40 border border-slate-800/50 p-4 space-y-2">
          {[
            { label: "Deep Scans", cost: deepOps * RATES.deepScan },
            { label: "Light Scans", cost: lightOps * RATES.lightScan },
            { label: "Normal Scans", cost: normalOps * RATES.normalScan },
            { label: "AI Summaries", cost: aiSums * RATES.aiSummary },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-xs">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-semibold text-slate-300">₹{row.cost.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-slate-700/50 pt-2 mt-2 flex justify-between items-baseline">
            <span className="text-xs text-slate-400 font-semibold">Estimated Total</span>
            <div className="text-right">
              <span className="text-xl font-black text-white">₹{total.toFixed(2)}</span>
              {minApplied && (
                <p className="text-[10px] text-amber-400 mt-0.5">Min. ₹{MIN} applied</p>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        {closestPlan ? (
          <button
            onClick={() => onAmountSelect(closestPlan.id, closestPlan.inr)}
            disabled={!!paying}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(124,58,237,0.25)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {paying ? "Processing…" : `Top Up ₹${closestPlan.inr}`}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 text-center">Select a plan below that covers your estimated ₹{total.toFixed(2)}</p>
            <div className="flex flex-wrap gap-2">
              {TIERS.filter((t) => t.inr >= total).slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onAmountSelect(t.id, t.inr)}
                  disabled={!!paying}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 transition-all disabled:opacity-50"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const [wallet,       setWallet]       = useState<WalletData>({ balance: 0, totalSpent: 0, totalBought: 0, totalScans: 0, verifiedDomains: 0 });
  const [user,         setUser]         = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [paying,       setPaying]       = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<"topup" | "calculator" | "history">("topup");
  const [receipt,      setReceipt]      = useState<Transaction | null>(null);
  const [showLowBal,   setShowLowBal]   = useState(false);
  const hasShownLowBal = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [wRes, tRes, uRes] = await Promise.all([
        fetch("/api/subscription/wallet-summary"),
        fetch("/api/subscription/status?limit=20"),
        fetch("/api/users"),
      ]);
      const [wData, tData, uData] = await Promise.all([wRes.json(), tRes.json(), uRes.json()]);

      if (wData.success) {
        const bal = wData.balance ?? 0;
        setWallet({
          balance:         bal,
          totalSpent:      wData.totalSpent       ?? 0,
          totalBought:     wData.totalBought      ?? 0,
          totalScans:      wData.totalScans       ?? 0,
          verifiedDomains: wData.verifiedDomains  ?? 0,
        });
        // Show modal once per session for low/empty balance
        if (!hasShownLowBal.current && (bal === 0 || bal < 5)) {
          hasShownLowBal.current = true;
          setShowLowBal(true);
        }
      }
      if (tData.success) setTransactions(tData.transactions ?? []);
      if (uData.success) setUser(uData.user ?? null);
    } catch { /* silent */ }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTopUp = async (planId: string, amountINR: number) => {
    setPaying(planId);
    try {
      const orderRes  = await fetch("/api/subscription/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

      const rzp = new (window as any).Razorpay({
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    "INR",
        name:        "Pentellia",
        description: orderData.name,
        order_id:    orderData.orderId,
        prefill:     { name: user ? `${user.firstName} ${user.lastName}` : "", email: user?.email || "" },
        theme:       { color: "#7c3aed" },
        handler: async (response: any) => {
          const verifyRes  = await fetch("/api/subscription/verify-payment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            toast.success(`₹${amountINR} added to your wallet!`);
            window.dispatchEvent(new Event("wallet-refresh"));
            await fetchData(true);
            // Show receipt for latest credit transaction
            const latestTx = transactions.find((t) => t.type === "credit");
            if (latestTx) setReceipt(latestTx);
            // Re-fetch to get the real new transaction
            setTimeout(async () => {
              const tRes   = await fetch("/api/subscription/status?limit=20").catch(() => null);
              const tData  = tRes ? await tRes.json().catch(() => null) : null;
              if (tData?.success && tData.transactions?.length) {
                setTransactions(tData.transactions);
                setReceipt(tData.transactions[0]);
              }
            }, 1200);
          } else {
            toast.error("Payment verification failed. Contact support.");
          }
          setPaying(null);
        },
        modal: { ondismiss: () => setPaying(null) },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setPaying(null);
    }
  };

  const balance    = wallet.balance;
  const pct        = wallet.totalBought > 0 ? Math.min(100, Math.round((balance / 2499) * 100)) : 0;
  const isNewUser  = wallet.totalBought === 0;

  const walletStatus =
    balance === 0    ? { label: "Empty",   color: "text-red-400",    bar: "bg-red-500",     ring: "#ef4444" }
    : balance < 5    ? { label: "Critical", color: "text-red-400",   bar: "bg-red-500",     ring: "#ef4444" }
    : balance < 20   ? { label: "Low",      color: "text-amber-400", bar: "bg-amber-500",   ring: "#f59e0b" }
    : balance < 100  ? { label: "Active",   color: "text-violet-400",bar: "bg-violet-500",  ring: "#7c3aed" }
                     : { label: "Healthy",  color: "text-emerald-400",bar: "bg-emerald-500", ring: "#10b981" };

  return (
    <>
      {/* Razorpay SDK */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      {/* Modals */}
      {showLowBal && (
        <LowBalanceModal
          balance={balance}
          onClose={() => setShowLowBal(false)}
          onTopUp={() => { setActiveTab("topup"); hasShownLowBal.current = false; }}
        />
      )}
      {receipt && (
        <ReceiptModal
          transaction={receipt}
          user={user}
          onClose={() => setReceipt(null)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8 font-sans text-slate-200">

        {/* ── Wallet Hero Card ─────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-[#0d0e1a] to-[#08080f]">
          {/* Glow */}
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle at 20% 50%, rgba(124,58,237,0.4) 0%, transparent 55%)" }} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

              {/* Left — Balance */}
              <div className="flex items-center gap-5">
                {/* Animated ring */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle
                      cx="40" cy="40" r="35" fill="none"
                      stroke={walletStatus.ring}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 35}`}
                      strokeDashoffset={`${2 * Math.PI * 35 * (1 - pct / 100)}`}
                      style={{ transition: "stroke-dashoffset 0.8s ease", filter: `drop-shadow(0 0 6px ${walletStatus.ring})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wallet className="h-7 w-7" style={{ color: walletStatus.ring }} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Wallet Balance</p>
                  {loading
                    ? <Skeleton className="h-10 w-36 mt-1" />
                    : <h2 className="text-4xl font-black text-white tracking-tight">
                        ₹{balance.toFixed(2)}
                      </h2>}
                  <span className={cn("text-sm font-semibold mt-1 inline-block", walletStatus.color)}>
                    {walletStatus.label}
                  </span>
                </div>
              </div>

              {/* Right — Stats */}
              <div className="grid grid-cols-3 gap-3 flex-1 max-w-md">
                {[
                  { label: "Total Added",  value: loading ? null : `₹${wallet.totalBought.toFixed(0)}`,  icon: ArrowDownLeft, c: "text-emerald-400" },
                  { label: "Total Spent",  value: loading ? null : `₹${wallet.totalSpent.toFixed(0)}`,   icon: ArrowUpRight,  c: "text-red-400" },
                  { label: "Scans Run",    value: loading ? null : wallet.totalScans.toString(),          icon: Activity,      c: "text-violet-400" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/40 flex flex-col gap-1">
                    <s.icon className={cn("h-3.5 w-3.5", s.c)} />
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{s.label}</p>
                    {s.value === null
                      ? <Skeleton className="h-5 w-16" />
                      : <p className="text-sm font-bold text-white">{s.value}</p>}
                  </div>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchData(true)}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="h-1.5 w-full rounded-full bg-slate-800/60 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", walletStatus.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[10px] text-slate-600">{pct}% of ₹2,499 reference</p>
                <p className="text-[10px] text-slate-600">{wallet.verifiedDomains} verified domain{wallet.verifiedDomains !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Low balance warning inline */}
            {!loading && balance < 20 && balance > 0 && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300/80">
                  Low balance! With ₹{balance.toFixed(2)} you have approximately{" "}
                  <strong>{Math.floor(balance / RATES.normalScan)}</strong> normal scans or{" "}
                  <strong>{Math.floor(balance / RATES.aiSummary)}</strong> AI summaries remaining.
                </p>
              </div>
            )}
            {!loading && balance === 0 && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 animate-pulse" />
                <p className="text-xs text-red-300/80 font-semibold">
                  ⚠ Scanning paused — wallet empty. Top up now to resume security assessments.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800/50 w-fit">
          {(["topup", "calculator", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-violet-600 text-white shadow-[0_2px_8px_rgba(124,58,237,0.35)]"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50",
              )}
            >
              {tab === "topup" ? "Quick Top-Up" : tab === "calculator" ? "Usage Estimator" : "Transaction History"}
            </button>
          ))}
        </div>

        {/* ── Quick Top-Up tab ──────────────────────────────────── */}
        {activeTab === "topup" && (
          <div className="space-y-6">
            {/* New user banner */}
            {isNewUser && !loading && (
              <div className="rounded-2xl bg-gradient-to-r from-violet-950/60 to-fuchsia-950/40 border border-violet-500/20 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Welcome to Pentellia! 🎉</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You received a <strong className="text-violet-300">₹10 signup bonus</strong> in your wallet. 
                      Top up to unlock the full power of AI-powered security scanning.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tier grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {TIERS.map((tier) => {
                const est      = estimateUsage(tier.inr);
                const isPaying = paying === tier.id;
                const isPopular = tier.tag === "Popular";
                const isBest   = tier.tag === "Best";
                const isMax    = tier.tag === "Max";

                return (
                  <div
                    key={tier.id}
                    onClick={() => !isPaying && handleTopUp(tier.id, tier.inr)}
                    className={cn(
                      "relative rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer group",
                      isPopular ? "bg-violet-600/10 border-violet-500/30 hover:border-violet-400/60 shadow-[0_0_20px_rgba(124,58,237,0.1)]"
                      : isBest   ? "bg-fuchsia-600/10 border-fuchsia-500/30 hover:border-fuchsia-400/60 shadow-[0_0_20px_rgba(217,70,239,0.1)]"
                      : isMax    ? "bg-emerald-600/10 border-emerald-500/30 hover:border-emerald-400/60"
                      : "bg-[#0d0e1a] border-slate-800/60 hover:border-slate-600/60",
                    )}
                  >
                    {tier.tag && (
                      <span className={cn(
                        "absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full",
                        isPopular ? "bg-violet-600 text-white"
                        : isBest  ? "bg-fuchsia-600 text-white"
                        : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30",
                      )}>
                        {tier.tag}
                      </span>
                    )}

                    {/* Price */}
                    <div className="text-center pt-2">
                      <p className={cn("text-2xl font-black", isPopular ? "text-violet-300" : isBest ? "text-fuchsia-300" : "text-white")}>
                        {tier.label}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">wallet credits</p>
                    </div>

                    {/* Usage estimates */}
                    <div className="space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> Normal</span>
                        <span className="font-bold text-white">{est.normal}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Cpu className="h-2.5 w-2.5" /> Deep</span>
                        <span className="font-bold text-white">{est.deep}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> AI</span>
                        <span className="font-bold text-white">{est.ai}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      disabled={!!paying}
                      className={cn(
                        "w-full mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                        isPopular ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_2px_12px_rgba(124,58,237,0.35)]"
                        : isBest  ? "bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_2px_12px_rgba(217,70,239,0.25)]"
                        : "bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50",
                        isPaying && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {isPaying
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Processing…</>
                        : <><CreditCard className="h-3.5 w-3.5" />Pay {tier.label}</>}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Credit rate card */}
            <div className="rounded-2xl bg-[#0d0e1a] border border-slate-800/60 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" /> Credit Usage Rates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Normal Scan",  cost: "₹0.50", sub: "per run",  icon: Globe,    color: "text-blue-400" },
                  { label: "Light Scan",   cost: "₹1.00", sub: "per run",  icon: Activity, color: "text-amber-400" },
                  { label: "Deep Scan",    cost: "₹2.00", sub: "per run",  icon: Cpu,      color: "text-orange-400" },
                  { label: "AI Summary",   cost: "₹5.00", sub: "per gen",  icon: Sparkles, color: "text-fuchsia-400" },
                ].map((r) => (
                  <div key={r.label} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/40 text-center">
                    <r.icon className={cn("h-4 w-4 mx-auto mb-2", r.color)} />
                    <p className={cn("text-lg font-black", r.color)}>{r.cost}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{r.label}</p>
                    <p className="text-[9px] text-slate-600">{r.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 py-1">
              {[
                { icon: Lock,       label: "256-bit SSL Encrypted" },
                { icon: Shield,     label: "PCI DSS Compliant" },
                { icon: BadgeCheck, label: "Powered by Razorpay" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-xs text-slate-500">
                  <t.icon className="h-3.5 w-3.5 text-violet-400" />
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Calculator tab ──────────────────────────────────────── */}
        {activeTab === "calculator" && (
          <PricingCalculator onAmountSelect={handleTopUp} paying={paying} />
        )}

        {/* ── History tab ─────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-3">
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
                  className="flex items-center gap-4 p-4 rounded-xl bg-[#0d0e1a] border border-slate-800/50 hover:border-slate-700/60 transition-all group"
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

                  <div className="text-right shrink-0 mr-2">
                    <p className={cn("text-sm font-bold", tx.type === "credit" ? "text-emerald-400" : "text-red-400")}>
                      {tx.type === "credit" ? "+" : "−"}₹{Math.abs(parseFloat(String(tx.amount))).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-600">bal ₹{parseFloat(String(tx.balance_after)).toFixed(2)}</p>
                  </div>

                  {/* Receipt button — only for credit transactions */}
                  {tx.type === "credit" && (
                    <button
                      onClick={() => setReceipt(tx)}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                      title="Download receipt"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}