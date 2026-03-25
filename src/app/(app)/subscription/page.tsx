"use client";

// src/app/(app)/subscription/page.tsx
// Pentellia Wallet & Billing Page — Phase 2+
// Billing model: usage-based, pre-paid wallet. No fixed subscription tiers.
// Users interact with a pricing calculator to determine their top-up amount.

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
  Download,
  ChevronRight,
  Activity,
  Target,
  FileText,
  Sparkles,
  AlertTriangle,
  X,
  Database,
  Cpu,
  Globe,
  BarChart2,
  TrendingUp,
  Layers,
  BrainCircuit,
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
  id:           string;
  type:         "credit" | "debit";
  amount:       number;
  balance_after: number;
  description:  string;
  ref_type:     string;
  ref_id?:      string;
  created_at:   string;
}

interface UserProfile {
  firstName: string;
  lastName:  string;
  email:     string;
}

interface PricingRates {
  deep_op:       number;
  light_op:      number;
  report:        number;
  token_input:   number;
  token_output:  number;
  minimum_inr:   number;
}

// ─── Fallback rates (if /api/pricing/rates is unreachable) ─────────────
const DEFAULT_RATES: PricingRates = {
  deep_op:      250,
  light_op:     170,
  report:       100,
  token_input:  180 / 1e6,
  token_output: 250 / 1e6,
  minimum_inr:  6500,
};

// ─── Defaults that produce exactly ₹6,480 → floors to ₹6,500 ──────────
const SLIDER_DEFAULTS = {
  deepOps:      10,
  lightOps:     15,
  reports:      10,
  inputTokens:  1_000_000,
  outputTokens: 1_000_000,
};

// ─── Helper ─────────────────────────────────────────────────────────────
const fmtINR = (v: number) =>
  `₹${new Intl.NumberFormat("en-IN").format(Math.round(v))}`;

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-slate-800/50 animate-pulse", className)} />;
}

// ─── Low Balance Modal ──────────────────────────────────────────────────
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
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/25 bg-[#0a0b14] shadow-[0_0_80px_rgba(239,68,68,0.15)] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />
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
              ? "Your wallet has run out of credits. All scan operations are paused. Top up now to continue securing your infrastructure."
              : "Your balance is critically low. Operations may fail soon. We recommend topping up now."}
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
              className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-[0_4px_20px_rgba(124,58,237,0.4)] transition-all"
            >
              Top Up Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ──────────────────────────────────────────────────────
function ReceiptModal({
  transaction,
  user,
  onClose,
}: {
  transaction: Transaction | null;
  user:        UserProfile | null;
  onClose:     () => void;
}) {
  if (!transaction) return null;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Pentellia Receipt</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#fff;color:#1a1a2e;padding:40px}.receipt{max-width:500px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}.header{background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;padding:30px;text-align:center}.logo{font-size:22px;font-weight:900;margin-bottom:6px}.sub{font-size:11px;opacity:.8;text-transform:uppercase;letter-spacing:2px}.badge{display:inline-block;background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:11px;margin-top:12px}.body{padding:28px}.amount-box{background:#f8f7ff;border:1px solid #ede9fe;border-radius:8px;padding:20px;text-align:center;margin-bottom:22px}.amount{font-size:38px;font-weight:900;color:#4c1d95}.amount-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #e5e7eb;font-size:13px}.row:last-child{border-bottom:none}.label{color:#6b7280}.value{font-weight:600;color:#1a1a2e;text-align:right;max-width:260px;word-break:break-all}.footer{background:#f9fafb;padding:18px 28px;text-align:center;font-size:11px;color:#9ca3af;line-height:1.6;border-top:1px solid #e5e7eb}.status{display:inline-flex;align-items:center;gap:6px;background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}@media print{body{padding:0}}</style>
</head><body><div class="receipt"><div class="header"><div class="logo">▪ PENTELLIA</div><div class="sub">Security Intelligence Platform</div><div class="badge">Payment Receipt</div></div>
<div class="body"><div class="amount-box"><div class="amount">₹${parseFloat(String(transaction.amount)).toFixed(2)}</div><div class="amount-label">Amount Credited</div><div style="margin-top:12px"><span class="status">✓ Payment Successful</span></div></div>
<div class="row"><span class="label">Transaction ID</span><span class="value">${transaction.ref_id || transaction.id}</span></div>
<div class="row"><span class="label">Receipt No.</span><span class="value">RCP-${transaction.id.slice(0,8).toUpperCase()}</span></div>
<div class="row"><span class="label">Date & Time</span><span class="value">${new Date(transaction.created_at).toLocaleString("en-IN",{dateStyle:"long",timeStyle:"medium"})}</span></div>
<div class="row"><span class="label">Customer</span><span class="value">${user?`${user.firstName} ${user.lastName}`.trim()||"Customer":"Customer"}</span></div>
<div class="row"><span class="label">Email</span><span class="value">${user?.email||"—"}</span></div>
<div class="row"><span class="label">Balance After</span><span class="value">₹${parseFloat(String(transaction.balance_after)).toFixed(2)}</span></div>
<div class="row"><span class="label">Payment via</span><span class="value">Razorpay (Online)</span></div></div>
<div class="footer"><strong>Pentellia Security</strong> · pentellia.io<br/>Computer-generated receipt · No signature required<br/>© ${new Date().getFullYear()} Pentellia. All rights reserved.</div></div>
<script>window.print();window.onafterprint=()=>window.close();</script></body></html>`;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-violet-500/20 bg-[#0a0b14] shadow-[0_0_60px_rgba(124,58,237,0.15)] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
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

          <div className="rounded-xl bg-gradient-to-br from-violet-600/12 to-purple-600/8 border border-violet-500/20 p-5 text-center mb-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Amount Credited</p>
            <p className="text-4xl font-black text-white">
              ₹{parseFloat(String(transaction.amount)).toFixed(2)}
            </p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <Check className="h-3 w-3" /> Verified & Credited
            </span>
          </div>

          <div className="space-y-2.5 mb-5">
            {[
              { label: "Receipt No.",     value: `RCP-${transaction.id.slice(0,8).toUpperCase()}` },
              { label: "Transaction ID",  value: transaction.ref_id || transaction.id, mono: true },
              { label: "Date & Time",     value: new Date(transaction.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}) },
              { label: "Customer",        value: user ? `${user.firstName} ${user.lastName}`.trim() : "—" },
              { label: "Email",           value: user?.email || "—" },
              { label: "Balance After",   value: `₹${parseFloat(String(transaction.balance_after)).toFixed(2)}` },
              { label: "Payment via",     value: "Razorpay (Online)" },
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
            Computer-generated receipt — does not require a signature.
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
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-[0_4px_20px_rgba(124,58,237,0.3)] transition-all"
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

// ─── Pricing Calculator ─────────────────────────────────────────────────
function PricingCalculator({
  rates,
  onProceed,
  paying,
}: {
  rates:     PricingRates;
  onProceed: (config: typeof SLIDER_DEFAULTS, total: number) => void;
  paying:    boolean;
}) {
  const [deepOps,      setDeepOps]      = useState(SLIDER_DEFAULTS.deepOps);
  const [lightOps,     setLightOps]     = useState(SLIDER_DEFAULTS.lightOps);
  const [reports,      setReports]      = useState(SLIDER_DEFAULTS.reports);
  const [inputTokens,  setInputTokens]  = useState(SLIDER_DEFAULTS.inputTokens);
  const outputTokens = inputTokens; // always mirrors input

  const deepCost    = deepOps     * rates.deep_op;
  const lightCost   = lightOps    * rates.light_op;
  const reportCost  = reports     * rates.report;
  const inputCost   = inputTokens * rates.token_input;
  const outputCost  = outputTokens * rates.token_output;
  const subtotal    = deepCost + lightCost + reportCost + inputCost + outputCost;
  const total       = Math.max(subtotal, rates.minimum_inr);
  const minApplied  = subtotal < rates.minimum_inr;

  const sliderCls =
    "w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer " +
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] " +
    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 " +
    "[&::-webkit-slider-thumb]:border-[2.5px] [&::-webkit-slider-thumb]:border-[#0a0b14] " +
    "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(139,92,246,0.4),0_4px_12px_rgba(139,92,246,0.5)] " +
    "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125";

  const getTrack = (val: number, max: number, color: string) => ({
    background: `linear-gradient(to right, ${color} ${(val / max) * 100}%, rgba(30,27,46,0.8) ${(val / max) * 100}%)`,
  });

  const fmtTok = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
  };

  const sliders = [
    {
      label: "Deep Operations",
      icon:  Cpu,
      dot:   "#818cf8",
      desc:  "Full-scope vulnerability scans",
      value: deepOps,
      setter:(v:number) => setDeepOps(v),
      max:   1000,
      step:  1,
      rate:  rates.deep_op,
      cost:  deepCost,
      color: "#818cf8",
      rateLabel: `₹${rates.deep_op} / op`,
    },
    {
      label: "Light Operations",
      icon:  Activity,
      dot:   "#38bdf8",
      desc:  "Quick checks & single-endpoint probes",
      value: lightOps,
      setter:(v:number) => setLightOps(v),
      max:   5000,
      step:  5,
      rate:  rates.light_op,
      cost:  lightCost,
      color: "#38bdf8",
      rateLabel: `₹${rates.light_op} / op`,
    },
    {
      label: "Report Generations",
      icon:  FileText,
      dot:   "#fb923c",
      desc:  "AI-compiled executive summaries",
      value: reports,
      setter:(v:number) => setReports(v),
      max:   200,
      step:  1,
      rate:  rates.report,
      cost:  reportCost,
      color: "#fb923c",
      rateLabel: `₹${rates.report} / report`,
    },
    {
      label: "Input AI Tokens",
      icon:  BrainCircuit,
      dot:   "#a78bfa",
      desc:  "LLM prompt & copilot tokens",
      value: inputTokens,
      setter:(v:number) => setInputTokens(v),
      max:   10_000_000,
      step:  100_000,
      rate:  rates.token_input * 1e6,
      cost:  inputCost,
      color: "#a78bfa",
      rateLabel: `₹${(rates.token_input * 1e6).toFixed(0)} / 1M`,
      fmtVal: fmtTok,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sliders */}
      <div className="grid gap-4">
        {sliders.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-800/60 bg-[#0d0f1c] p-5 hover:border-violet-500/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.dot}18`, border: `1px solid ${s.dot}30` }}
                >
                  <s.icon className="h-4 w-4" style={{ color: s.dot }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{s.label}</p>
                  <p className="text-[11px] text-slate-500">{s.desc}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-white">
                  {s.fmtVal ? s.fmtVal(s.value) : new Intl.NumberFormat("en-IN").format(s.value)}
                </p>
                <p
                  className="text-sm font-bold"
                  style={{ color: s.dot }}
                >
                  {fmtINR(s.cost)}
                </p>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={s.max}
              step={s.step}
              value={s.value}
              onChange={(e) => s.setter(Number(e.target.value))}
              className={sliderCls}
              style={getTrack(s.value, s.max, s.color)}
            />
            <div className="flex justify-between mt-2 text-[10px] text-slate-600">
              <span
                className="px-2 py-0.5 rounded-md"
                style={{ background: `${s.dot}12`, color: s.dot, border: `1px solid ${s.dot}25` }}
              >
                {s.rateLabel}
              </span>
              <span>max {s.fmtVal ? s.fmtVal(s.max) : new Intl.NumberFormat("en-IN").format(s.max)}</span>
            </div>
          </div>
        ))}

        {/* Output tokens — auto-mirrored */}
        <div className="rounded-2xl border border-slate-800/40 bg-[#0d0f1c]/60 p-5 opacity-70">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "#c084fc18", border: "1px solid #c084fc30" }}>
                <Sparkles className="h-4 w-4" style={{ color: "#c084fc" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  Output AI Tokens
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">AUTO</span>
                </p>
                <p className="text-[11px] text-slate-500">Response tokens — mirrors input</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-white">{fmtTok(outputTokens)}</p>
              <p className="text-sm font-bold" style={{ color: "#c084fc" }}>{fmtINR(outputCost)}</p>
            </div>
          </div>
          <input
            type="range" min={0} max={10_000_000} step={100_000}
            value={outputTokens} readOnly tabIndex={-1}
            className={sliderCls}
            style={{ ...getTrack(outputTokens, 10_000_000, "#c084fc"), pointerEvents: "none", filter: "grayscale(0.3)" }}
          />
          <div className="flex justify-between mt-2 text-[10px] text-slate-600">
            <span className="px-2 py-0.5 rounded-md" style={{ background: "#c084fc12", color: "#c084fc", border: "1px solid #c084fc25" }}>
              ₹{(rates.token_output * 1e6).toFixed(0)} / 1M
            </span>
            <span>auto-calculated</span>
          </div>
        </div>
      </div>

      {/* Cost breakdown + total */}
      <div className="rounded-2xl border border-slate-800/60 bg-[#0d0f1c] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cost Breakdown</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: "Deep Operations",   cost: deepCost,   dot: "#818cf8" },
            { label: "Light Operations",  cost: lightCost,  dot: "#38bdf8" },
            { label: "Report Generations",cost: reportCost, dot: "#fb923c" },
            { label: "Input Tokens",      cost: inputCost,  dot: "#a78bfa" },
            { label: "Output Tokens",     cost: outputCost, dot: "#c084fc" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: row.dot }} />
                {row.label}
              </span>
              <span className="font-semibold text-slate-200">{fmtINR(row.cost)}</span>
            </div>
          ))}

          <div className="border-t border-slate-700/50 pt-3 mt-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-semibold text-slate-300">{fmtINR(subtotal)}</span>
            </div>
          </div>

          {/* Floor label */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-500/5 border border-violet-500/15 text-xs">
            <Lock className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span className="text-slate-400">Minimum recharge floor:</span>
            <span className="ml-auto font-bold text-violet-300">₹{new Intl.NumberFormat("en-IN").format(rates.minimum_inr)}</span>
          </div>

          {/* Grand total */}
          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/6 border border-violet-500/20 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Wallet Top-Up Amount</p>
              {minApplied && (
                <p className="text-[10px] text-amber-400 mt-0.5">⚡ Floor price applied</p>
              )}
            </div>
            <p className="text-3xl font-black text-white tracking-tight">{fmtINR(total)}</p>
          </div>
        </div>
      </div>

      {/* Proceed CTA */}
      <button
        onClick={() =>
          onProceed(
            { deepOps, lightOps, reports, inputTokens, outputTokens },
            total,
          )
        }
        disabled={paying}
        className={cn(
          "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-black text-white transition-all",
          "bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700",
          "shadow-[0_4px_28px_rgba(124,58,237,0.45)]",
          "hover:shadow-[0_6px_36px_rgba(124,58,237,0.6)] hover:-translate-y-0.5",
          "active:translate-y-0",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        )}
      >
        {paying ? (
          <><Loader2 className="h-5 w-5 animate-spin" />Processing Payment…</>
        ) : (
          <><CreditCard className="h-5 w-5" />Add {fmtINR(total)} to Wallet</>
        )}
      </button>

      <p className="text-center text-[11px] text-slate-500">
        Amount is server-verified before charging. Funds are consumed as operations execute.
      </p>
    </div>
  );
}

// ─── Transaction Row ─────────────────────────────────────────────────────
function TxRow({
  tx,
  onViewReceipt,
}: {
  tx:            Transaction;
  onViewReceipt: (tx: Transaction) => void;
}) {
  const isCredit = tx.type === "credit";
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-800/50 last:border-0 group">
      <div
        className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
          isCredit
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-red-500/10 border border-red-500/20",
        )}
      >
        {isCredit
          ? <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          : <ArrowUpRight   className="h-4 w-4 text-red-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 truncate">{tx.description}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={cn("text-sm font-bold", isCredit ? "text-emerald-400" : "text-red-400")}>
          {isCredit ? "+" : "−"}₹{parseFloat(String(tx.amount)).toFixed(2)}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Bal: ₹{parseFloat(String(tx.balance_after)).toFixed(2)}
        </p>
      </div>

      {isCredit && (
        <button
          onClick={() => onViewReceipt(tx)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="View receipt"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const [wallet,       setWallet]       = useState<WalletData>({ balance: 0, totalSpent: 0, totalBought: 0, totalScans: 0, verifiedDomains: 0 });
  const [user,         setUser]         = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates,        setRates]        = useState<PricingRates>(DEFAULT_RATES);
  const [loading,      setLoading]      = useState(true);
  const [paying,       setPaying]       = useState(false);
  const [activeTab,    setActiveTab]    = useState<"calculator" | "history">("calculator");
  const [receipt,      setReceipt]      = useState<Transaction | null>(null);
  const [showLowBal,   setShowLowBal]   = useState(false);
  const hasShownLowBal = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [wRes, tRes, uRes, rRes] = await Promise.all([
        fetch("/api/subscription/wallet-summary"),
        fetch("/api/subscription/status?limit=20"),
        fetch("/api/users"),
        fetch("/api/pricing/rates"),
      ]);
      const [wData, tData, uData, rData] = await Promise.all([
        wRes.json(), tRes.json(), uRes.json(), rRes.json(),
      ]);

      if (wData.success) {
        const bal = wData.balance ?? 0;
        setWallet({
          balance:         bal,
          totalSpent:      wData.totalSpent       ?? 0,
          totalBought:     wData.totalBought      ?? 0,
          totalScans:      wData.totalScans       ?? 0,
          verifiedDomains: wData.verifiedDomains  ?? 0,
        });
        if (!hasShownLowBal.current && (bal === 0 || bal < 50)) {
          hasShownLowBal.current = true;
          setShowLowBal(true);
        }
      }
      if (tData.success)         setTransactions(tData.transactions ?? []);
      if (uData.success)         setUser(uData.user ?? null);
      if (rData.rates)           setRates({ ...DEFAULT_RATES, ...rData.rates });
    } catch { /* silent */ }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh wallet balance on external event (e.g., iframe postMessage)
  useEffect(() => {
    const handler = () => fetchData(true);
    window.addEventListener("wallet-refresh", handler);
    return () => window.removeEventListener("wallet-refresh", handler);
  }, [fetchData]);

  const handleProceed = async (
    config: typeof SLIDER_DEFAULTS,
    totalINR: number,
  ) => {
    setPaying(true);
    try {
      // Send calculator config to server — server recalculates total independently
      const orderRes  = await fetch("/api/subscription/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(config),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

      const rzp = new (window as any).Razorpay({
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    "INR",
        name:        "Pentellia",
        description: orderData.description,
        order_id:    orderData.orderId,
        prefill:     { name: user ? `${user.firstName} ${user.lastName}` : "", email: user?.email || "" },
        theme:       { color: "#7c3aed" },
        handler: async (response: any) => {
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
            toast.success(`${fmtINR(verifyData.amountAdded)} added to your wallet!`);
            window.dispatchEvent(new Event("wallet-refresh"));
            await fetchData(true);
            // Fetch latest transaction for receipt
            setTimeout(async () => {
              const tRes  = await fetch("/api/subscription/status?limit=20").catch(() => null);
              const tData = tRes ? await tRes.json().catch(() => null) : null;
              if (tData?.success && tData.transactions?.length) {
                setTransactions(tData.transactions);
                setReceipt(tData.transactions[0]);
                setActiveTab("history");
              }
            }, 1000);
          } else {
            toast.error("Payment verification failed. Contact support.");
          }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setPaying(false);
    }
  };

  const balance = wallet.balance;
  const isNew   = wallet.totalBought === 0;

  const walletStatus =
    balance === 0   ? { label: "Empty",    color: "text-red-400",     bar: "bg-red-500",     ring: "#ef4444", glow: "rgba(239,68,68,0.3)" }
    : balance < 50  ? { label: "Critical", color: "text-red-400",     bar: "bg-red-500",     ring: "#ef4444", glow: "rgba(239,68,68,0.3)" }
    : balance < 200 ? { label: "Low",      color: "text-amber-400",   bar: "bg-amber-500",   ring: "#f59e0b", glow: "rgba(245,158,11,0.25)" }
    : balance < 1000? { label: "Active",   color: "text-violet-400",  bar: "bg-violet-500",  ring: "#8b5cf6", glow: "rgba(139,92,246,0.35)" }
    :                 { label: "Healthy",  color: "text-emerald-400", bar: "bg-emerald-500", ring: "#10b981", glow: "rgba(16,185,129,0.3)" };

  // Progress relative to last meaningful amount purchased
  const refAmt = Math.max(wallet.totalBought, rates.minimum_inr);
  const pct    = wallet.totalBought > 0 ? Math.min(100, Math.round((balance / refAmt) * 100)) : 0;

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      {showLowBal && (
        <LowBalanceModal
          balance={balance}
          onClose={() => setShowLowBal(false)}
          onTopUp={() => { setActiveTab("calculator"); hasShownLowBal.current = false; }}
        />
      )}
      {receipt && (
        <ReceiptModal transaction={receipt} user={user} onClose={() => setReceipt(null)} />
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-7 text-slate-200">

        {/* ── Wallet Hero ─────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-violet-500/15 bg-gradient-to-br from-[#0d0f1c] via-[#0a0b14] to-[#08080f]">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 600px 300px at 15% 60%, ${walletStatus.glow}, transparent 70%)` }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

              {/* Balance + ring */}
              <div className="flex items-center gap-5">
                <div className="relative h-[72px] w-[72px] shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="31" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                    <circle
                      cx="36" cy="36" r="31" fill="none"
                      stroke={walletStatus.ring}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 31}`}
                      strokeDashoffset={`${2 * Math.PI * 31 * (1 - pct / 100)}`}
                      style={{
                        transition: "stroke-dashoffset 1s ease",
                        filter: `drop-shadow(0 0 8px ${walletStatus.ring})`,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wallet className="h-6 w-6" style={{ color: walletStatus.ring }} />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wallet Balance</p>
                  {loading
                    ? <Skeleton className="h-10 w-36" />
                    : <h2 className="text-4xl font-black text-white tracking-tight">
                        ₹{balance.toFixed(2)}
                      </h2>}
                  <span className={cn("text-sm font-semibold mt-1 inline-block", walletStatus.color)}>
                    {walletStatus.label}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 flex-1 max-w-sm">
                {[
                  { label: "Total Added",  value: loading ? null : fmtINR(wallet.totalBought), icon: ArrowDownLeft, c: "text-emerald-400" },
                  { label: "Total Spent",  value: loading ? null : fmtINR(wallet.totalSpent),  icon: ArrowUpRight,  c: "text-red-400"     },
                  { label: "Scans Run",    value: loading ? null : wallet.totalScans.toString(), icon: Activity,     c: "text-violet-400"  },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/40 flex flex-col gap-1.5">
                    <s.icon className={cn("h-3.5 w-3.5", s.c)} />
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{s.label}</p>
                    {s.value === null
                      ? <Skeleton className="h-5 w-14" />
                      : <p className="text-sm font-bold text-white">{s.value}</p>}
                  </div>
                ))}
              </div>

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
                <p className="text-[10px] text-slate-600">{pct}% remaining of last top-up</p>
                <p className="text-[10px] text-slate-600">{wallet.verifiedDomains} verified domain{wallet.verifiedDomains !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Alert banners */}
            {!loading && balance < 200 && balance > 0 && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300/80">
                  Low balance — top up to avoid scan interruptions.
                </p>
              </div>
            )}
            {!loading && balance === 0 && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 animate-pulse" />
                <p className="text-xs text-red-300/80 font-semibold">
                  ⚠ Scanning paused — wallet empty. Top up to resume security assessments.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Rate reference card ─────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/50 bg-[#0d0f1c] p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Credit Usage Rates
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Deep Op",      cost: fmtINR(rates.deep_op),             sub: "per operation", icon: Cpu,         color: "#818cf8" },
              { label: "Light Op",     cost: fmtINR(rates.light_op),            sub: "per operation", icon: Activity,    color: "#38bdf8" },
              { label: "Report",       cost: fmtINR(rates.report),              sub: "per report",    icon: FileText,    color: "#fb923c" },
              { label: "Input Token",  cost: `₹${(rates.token_input*1e6).toFixed(0)}`, sub: "per 1M tokens", icon: BrainCircuit, color: "#a78bfa" },
              { label: "Output Token", cost: `₹${(rates.token_output*1e6).toFixed(0)}`, sub: "per 1M tokens", icon: Sparkles,  color: "#c084fc" },
            ].map((r) => (
              <div
                key={r.label}
                className="p-3 rounded-xl border text-center"
                style={{ background: `${r.color}08`, borderColor: `${r.color}20` }}
              >
                <r.icon className="h-4 w-4 mx-auto mb-2" style={{ color: r.color }} />
                <p className="text-sm font-black text-white">{r.cost}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{r.label}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">{r.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800/50 w-fit">
          {(["calculator", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-violet-600 text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50",
              )}
            >
              {tab === "calculator" ? "Pricing Calculator" : "Transaction History"}
            </button>
          ))}
        </div>

        {/* ── Pricing Calculator tab ──────────────────────────── */}
        {activeTab === "calculator" && (
          <div className="space-y-5">
            {/* New user banner */}
            {isNew && !loading && (
              <div className="rounded-2xl bg-gradient-to-r from-violet-950/60 to-purple-950/40 border border-violet-500/20 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Welcome to Pentellia! 🎉</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Use the calculator below to estimate your usage and top up your wallet.
                      The minimum recharge is <strong className="text-violet-300">₹6,500</strong> —
                      set the sliders to your expected workload and proceed to payment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <PricingCalculator
              rates={rates}
              onProceed={handleProceed}
              paying={paying}
            />

            {/* Security note */}
            <div className="flex items-center justify-center gap-6 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-emerald-500" /> HMAC-SHA256 verified</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-violet-400" /> Server-authoritative amount</span>
              <span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3 text-blue-400" /> Razorpay PCI-DSS</span>
            </div>
          </div>
        )}

        {/* ── Transaction History tab ─────────────────────────── */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-slate-800/50 bg-[#0d0f1c] overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Transaction History</h3>
                  <p className="text-[11px] text-slate-500">{transactions.length} recent transactions</p>
                </div>
              </div>
              <button
                onClick={() => fetchData(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-2">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <Database className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No transactions yet</p>
                  <p className="text-xs text-slate-600 mt-1">Your payment history will appear here</p>
                </div>
              ) : (
                <div className="px-4">
                  {transactions.map((tx) => (
                    <TxRow key={tx.id} tx={tx} onViewReceipt={setReceipt} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}