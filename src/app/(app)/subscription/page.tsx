"use client";

// src/app/(app)/subscription/page.tsx
// Pentellia Wallet & Billing — production-grade redesign
// ─ Enforced slider minimums (can never produce < ₹6,500)
// ─ Payment trust badges  
// ─ Drag affordance hints
// ─ Matching typography scale

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Wallet, CreditCard, Zap, Check, Loader2, RefreshCw, Clock,
  ArrowUpRight, ArrowDownLeft, Shield, Lock, Download, FileText,
  Sparkles, AlertTriangle, X, Database, Cpu, Activity, BrainCircuit,
  Minus, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────
interface WalletData {
  balance: number; totalSpent: number; totalBought: number;
  totalScans: number; verifiedDomains: number;
}
interface Transaction {
  id: string; type: "credit" | "debit"; amount: number;
  balance_after: number; description: string; ref_type: string;
  ref_id?: string; created_at: string;
}
interface UserProfile { firstName: string; lastName: string; email: string; }
interface PricingRates {
  deep_op: number; light_op: number; report: number;
  token_input: number; token_output: number; minimum_inr: number;
}

// ─── Fallback rates ───────────────────────────────────────────────────────
const DEFAULT_RATES: PricingRates = {
  deep_op: 250, light_op: 170, report: 100,
  token_input: 180 / 1e6, token_output: 250 / 1e6, minimum_inr: 6500,
};

// ─── Slider minimums: sum = ₹6,480 → always floors to ₹6,500 ────────────
// Users can ONLY increase from the base bundle — never go below it.
const SLIDER_MINS = {
  deepOps:     10,        // ₹2,500  
  lightOps:    15,        // ₹2,550
  reports:     10,        // ₹1,000
  inputTokens: 1_000_000, // ₹180 in + ₹250 out = ₹430
};
const SLIDER_DEFAULTS = {
  deepOps:     SLIDER_MINS.deepOps,
  lightOps:    SLIDER_MINS.lightOps,
  reports:     SLIDER_MINS.reports,
  inputTokens: SLIDER_MINS.inputTokens,
  outputTokens:SLIDER_MINS.inputTokens,
};

const fmtINR = (v: number) =>
  `₹${new Intl.NumberFormat("en-IN").format(Math.round(v))}`;

const fmtTok = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-slate-800/50 animate-pulse", className)} />;
}

// ─── Payment method badges ────────────────────────────────────────────────
function PaymentBadges() {
  const methods = [
    {
      name: "UPI",
      badge: (
        <span className="flex items-center gap-1">
          <span className="font-black text-[10px]" style={{ color: "#5f259f" }}>U</span>
          <span className="font-black text-[10px]" style={{ color: "#097939" }}>P</span>
          <span className="font-black text-[10px]" style={{ color: "#f26522" }}>I</span>
        </span>
      ),
    },
    {
      name: "Visa",
      badge: (
        <span className="font-black italic text-[11px] tracking-tight" style={{ color: "#1a1f71", textShadow: "0 0 1px rgba(255,255,255,0.3)" }}>
          <span style={{ color: "#1565C0" }}>VISA</span>
        </span>
      ),
    },
    {
      name: "Mastercard",
      badge: (
        <span className="flex items-center">
          <span className="h-4 w-4 rounded-full" style={{ background: "#EB001B", opacity: 0.9 }} />
          <span className="h-4 w-4 rounded-full -ml-2" style={{ background: "#F79E1B", opacity: 0.9 }} />
        </span>
      ),
    },
    {
      name: "RuPay",
      badge: (
        <span className="font-black text-[10px] tracking-tight">
          <span style={{ color: "#006BA6" }}>Ru</span><span style={{ color: "#E8891D" }}>Pay</span>
        </span>
      ),
    },
    {
      name: "Net Banking",
      badge: (
        <span className="text-[10px] font-bold text-slate-400">NET</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Accepted payments</p>
      <div className="flex items-center gap-2 flex-wrap">
        {methods.map((m) => (
          <div
            key={m.name}
            title={m.name}
            className="flex items-center justify-center h-7 px-2.5 rounded-md bg-white/[0.06] border border-slate-700/50 min-w-[44px]"
          >
            {m.badge}
          </div>
        ))}
        <span className="text-[10px] text-slate-600 ml-1">& more via Razorpay</span>
      </div>
    </div>
  );
}

// ─── Low Balance Modal ────────────────────────────────────────────────────
function LowBalanceModal({ balance, onClose, onTopUp }: {
  balance: number; onClose: () => void; onTopUp: () => void;
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
              <h3 className="text-lg font-bold text-white">{isEmpty ? "Wallet Empty" : "Low Balance Warning"}</h3>
              <p className="text-sm text-slate-400">{isEmpty ? "Scanning is paused" : `₹${balance.toFixed(2)} remaining`}</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            {isEmpty
              ? "Your wallet has run out of credits. All scan operations are paused. Top up now to continue."
              : "Your balance is critically low. Operations may fail soon. We recommend topping up now."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onClose} className="py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 transition-all">Dismiss</button>
            <button
              onClick={() => { onClose(); onTopUp(); }}
              className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-[0_4px_20px_rgba(124,58,237,0.4)] transition-all"
            >Top Up Now</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ────────────────────────────────────────────────────────
function ReceiptModal({ transaction, user, onClose }: {
  transaction: Transaction | null; user: UserProfile | null; onClose: () => void;
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
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-violet-600/12 to-purple-600/8 border border-violet-500/20 p-5 text-center mb-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Amount Credited</p>
            <p className="text-4xl font-black text-white">₹{parseFloat(String(transaction.amount)).toFixed(2)}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <Check className="h-3 w-3" /> Verified & Credited
            </span>
          </div>
          <div className="space-y-2.5 mb-5">
            {[
              { label: "Receipt No.",    value: `RCP-${transaction.id.slice(0,8).toUpperCase()}` },
              { label: "Transaction ID", value: transaction.ref_id || transaction.id, mono: true },
              { label: "Date & Time",    value: new Date(transaction.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}) },
              { label: "Customer",       value: user ? `${user.firstName} ${user.lastName}`.trim() : "—" },
              { label: "Email",          value: user?.email || "—" },
              { label: "Balance After",  value: `₹${parseFloat(String(transaction.balance_after)).toFixed(2)}` },
              { label: "Payment via",    value: "Razorpay (Online)" },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-2 border-b border-slate-800/50 last:border-0">
                <span className="text-xs text-slate-500 shrink-0">{row.label}</span>
                <span className={cn("text-xs font-semibold text-slate-200 text-right break-all", row.mono && "font-mono text-[10px]")}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 transition-all">Close</button>
            <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-[0_4px_20px_rgba(124,58,237,0.3)] transition-all">
              <Download className="h-4 w-4" />Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Single slider item ───────────────────────────────────────────────────
function PlanSlider({
  icon: Icon, label, tag, color, value, min, max, step, cost, rateLabel, fmtVal,
  onChange, isFirst,
}: {
  icon: React.ElementType; label: string; tag: string; color: string;
  value: number; min: number; max: number; step: number;
  cost: number; rateLabel: string; fmtVal?: (v: number) => string;
  onChange: (v: number) => void; isFirst?: boolean;
}) {
  const fmt      = fmtVal ?? ((v: number) => new Intl.NumberFormat("en-IN").format(v));
  const pct      = ((value - min) / (max - min)) * 100;
  const canDec   = value > min;
  const stepOnce = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, value + dir * step));
    onChange(next);
  };

  return (
    <div className="group/slider py-5 px-5 first:pt-4">
      {/* Label row */}
      <div className="flex items-start justify-between mb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover/slider:scale-105"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-100 leading-tight">{label}</p>
            <span
              className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: `${color}14`, color: `${color}cc` }}
            >
              {tag}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[22px] font-black text-white leading-none tracking-tight">
            {fmt(value)}
          </p>
          <p className="text-[13px] font-bold mt-0.5" style={{ color }}>{fmtINR(cost)}</p>
        </div>
      </div>

      {/* Slider + step buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => stepOnce(-1)}
          disabled={!canDec}
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all border",
            canDec
              ? "border-slate-700 text-slate-400 hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/8 active:scale-95"
              : "border-slate-800/40 text-slate-700 cursor-not-allowed",
          )}
        >
          <Minus className="h-3 w-3" />
        </button>

        <div className="relative flex-1 py-2 cursor-pointer">
          {/* Track background */}
          <div className="h-2 w-full rounded-full bg-slate-800/70 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${color}70, ${color})`,
                boxShadow: `0 0 8px ${color}50`,
              }}
            />
          </div>
          {/* Actual input — layered over track */}
          <input
            type="range"
            min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-grab active:cursor-grabbing"
            style={{ height: "100%" }}
          />
          {/* Visual thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full pointer-events-none transition-all duration-100 flex items-center justify-center"
            style={{
              left: `calc(${pct}% - ${pct * 0.18}px)`,
              background: color,
              boxShadow: `0 0 0 3px rgba(0,0,0,0.6), 0 0 12px ${color}70`,
            }}
          >
            {/* grip dots */}
            <div className="flex gap-[2px]">
              <div className="h-[5px] w-[1.5px] rounded-full bg-black/50" />
              <div className="h-[5px] w-[1.5px] rounded-full bg-black/50" />
              <div className="h-[5px] w-[1.5px] rounded-full bg-black/50" />
            </div>
          </div>
        </div>

        <button
          onClick={() => stepOnce(1)}
          disabled={value >= max}
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all border",
            value < max
              ? "border-slate-700 text-slate-400 hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/8 active:scale-95"
              : "border-slate-800/40 text-slate-700 cursor-not-allowed",
          )}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Footer: rate | hint | max */}
      <div className="flex items-center justify-between mt-2 px-[38px]">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ background: `${color}12`, color: `${color}bb` }}
        >
          {rateLabel}
        </span>
        {isFirst && (
          <span className="text-[10px] text-slate-600 flex items-center gap-1">
            <span>↔</span> drag or use buttons
          </span>
        )}
        <span className="text-[11px] text-slate-600">
          max {fmtVal ? fmtVal(max) : new Intl.NumberFormat("en-IN").format(max)}
        </span>
      </div>
    </div>
  );
}

// ─── Pricing Calculator ───────────────────────────────────────────────────
function PricingCalculator({
  rates, onProceed, paying,
}: {
  rates: PricingRates;
  onProceed: (config: typeof SLIDER_DEFAULTS, total: number) => void;
  paying: boolean;
}) {
  const [deepOps,     setDeepOps]     = useState(SLIDER_DEFAULTS.deepOps);
  const [lightOps,    setLightOps]    = useState(SLIDER_DEFAULTS.lightOps);
  const [reports,     setReports]     = useState(SLIDER_DEFAULTS.reports);
  const [inputTokens, setInputTokens] = useState(SLIDER_DEFAULTS.inputTokens);
  const outputTokens = inputTokens;

  const deepCost   = deepOps     * rates.deep_op;
  const lightCost  = lightOps    * rates.light_op;
  const reportCost = reports     * rates.report;
  const inputCost  = inputTokens * rates.token_input;
  const outputCost = outputTokens * rates.token_output;
  const subtotal   = deepCost + lightCost + reportCost + inputCost + outputCost;
  const total      = Math.max(subtotal, rates.minimum_inr);

  const sliders = [
    {
      icon: Cpu,          label: "Deep Operations",    tag: "High-intensity tasks",
      color: "#818cf8",   value: deepOps,              min: SLIDER_MINS.deepOps,
      max: 1000,          step: 1,                     cost: deepCost,
      rateLabel: `₹${rates.deep_op} / op`,
      setter: setDeepOps,
    },
    {
      icon: Activity,     label: "Light Operations",   tag: "Continuous checks",
      color: "#38bdf8",   value: lightOps,             min: SLIDER_MINS.lightOps,
      max: 5000,          step: 5,                     cost: lightCost,
      rateLabel: `₹${rates.light_op} / op`,
      setter: setLightOps,
    },
    {
      icon: FileText,     label: "Report Generations", tag: "Executive insights",
      color: "#fb923c",   value: reports,              min: SLIDER_MINS.reports,
      max: 200,           step: 1,                     cost: reportCost,
      rateLabel: `₹${rates.report} / report`,
      setter: setReports,
    },
    {
      icon: BrainCircuit, label: "Input AI Tokens",    tag: "Security copilot usage",
      color: "#a78bfa",   value: inputTokens,          min: SLIDER_MINS.inputTokens,
      max: 10_000_000,    step: 100_000,               cost: inputCost,
      rateLabel: `₹${(rates.token_input * 1e6).toFixed(0)} / 1M`,
      setter: setInputTokens,
      fmtVal: fmtTok,
    },
  ];

  const breakdownRows = [
    { label: "Deep Operations",    cost: deepCost,   color: "#818cf8" },
    { label: "Light Operations",   cost: lightCost,  color: "#38bdf8" },
    { label: "Report Generations", cost: reportCost, color: "#fb923c" },
    { label: "Input Tokens",       cost: inputCost,  color: "#a78bfa" },
    { label: "Output Tokens",      cost: outputCost, color: "#c084fc" },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">

      {/* ── LEFT: slider card ──────────────────────────────────── */}
      <div className="rounded-2xl bg-[#0c0e18] border border-slate-800/50 divide-y divide-slate-800/50 overflow-hidden">
        {sliders.map((s, i) => (
          <PlanSlider
            key={s.label}
            icon={s.icon} label={s.label} tag={s.tag} color={s.color}
            value={s.value} min={s.min} max={s.max} step={s.step}
            cost={s.cost} rateLabel={s.rateLabel} fmtVal={s.fmtVal}
            onChange={s.setter} isFirst={i === 0}
          />
        ))}

        {/* Output tokens — read-only row */}
        <div className="py-4 px-5 bg-slate-900/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 opacity-50"
                style={{ background: "#c084fc12", border: "1px solid #c084fc25" }}>
                <Sparkles className="h-4 w-4" style={{ color: "#c084fc" }} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-400 flex items-center gap-2">
                  Output AI Tokens
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-bold tracking-widest">AUTO</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">Mirrors input · ₹{(rates.token_output * 1e6).toFixed(0)} / 1M</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[18px] font-black text-slate-400">{fmtTok(outputTokens)}</p>
              <p className="text-[13px] font-bold" style={{ color: "#c084fc99" }}>{fmtINR(outputCost)}</p>
            </div>
          </div>
          <div className="mt-3 ml-12 h-1.5 w-[calc(100%-3rem)] rounded-full bg-slate-800/60 overflow-hidden">
            <div className="h-full rounded-full opacity-40"
              style={{ width: `${((inputTokens - SLIDER_MINS.inputTokens) / (10_000_000 - SLIDER_MINS.inputTokens)) * 100}%`, background: "#c084fc" }} />
          </div>
        </div>

        {/* Base bundle notice */}
        <div className="px-5 py-3 bg-slate-900/30 flex items-center gap-2">
          <Lock className="h-3 w-3 text-slate-600 shrink-0" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Sliders start at the <strong className="text-slate-500">base bundle</strong> — the minimum ensures you always get full value for your ₹6,500 recharge.
          </p>
        </div>
      </div>

      {/* ── RIGHT: sticky summary ──────────────────────────────── */}
      <div className="lg:sticky lg:top-24 flex flex-col gap-3">

        {/* Summary card */}
        <div className="rounded-2xl bg-[#0c0e18] border border-slate-800/50 overflow-hidden">

          <div className="px-5 pt-5 pb-3 border-b border-slate-800/40">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Order Summary</p>
          </div>

          <div className="px-5 py-4 space-y-2">
            {breakdownRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="text-[13px] font-semibold text-slate-300">{fmtINR(row.cost)}</span>
              </div>
            ))}
          </div>

          <div className="px-5 pb-5 space-y-3 border-t border-slate-800/40 pt-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-300">{fmtINR(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0a0b14] border border-slate-800/60">
              <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                <Lock className="h-3 w-3 text-slate-600 shrink-0" />
                Minimum recharge
              </span>
              <span className="text-[12px] font-bold text-slate-400">{fmtINR(rates.minimum_inr)}</span>
            </div>

            {/* Grand total */}
            <div className="rounded-xl bg-gradient-to-br from-violet-600/14 to-violet-900/20 border border-violet-500/20 px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Due</p>
                <p className="text-[10px] text-violet-400/70 mt-0.5 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" /> Floor price applies
                </p>
              </div>
              <p className="text-[28px] font-black text-white tracking-tight leading-none">{fmtINR(total)}</p>
            </div>

            {/* CTA */}
            <button
              onClick={() => onProceed({ deepOps, lightOps, reports, inputTokens, outputTokens }, total)}
              disabled={paying}
              className={cn(
                "w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[15px] font-black text-white transition-all",
                "bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700",
                "shadow-[0_4px_20px_rgba(124,58,237,0.4)]",
                "hover:shadow-[0_6px_30px_rgba(124,58,237,0.6)] hover:-translate-y-px",
                "active:translate-y-0 active:shadow-[0_2px_12px_rgba(124,58,237,0.3)]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)]",
              )}
            >
              {paying ? (
                <><Loader2 className="h-5 w-5 animate-spin" />Processing Payment…</>
              ) : (
                <><CreditCard className="h-5 w-5" />Add {fmtINR(total)} to Wallet</>
              )}
            </button>

            <p className="text-center text-[10px] text-slate-600 leading-relaxed">
              Amount is server-verified before charging.<br />Funds consumed as operations execute.
            </p>
          </div>
        </div>

        {/* Payment methods card */}
        <div className="rounded-xl bg-[#0c0e18] border border-slate-800/40 px-4 py-3.5 space-y-3">
          <PaymentBadges />
          <div className="flex items-center gap-3 pt-1 border-t border-slate-800/40">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Lock className="h-3 w-3 text-emerald-600/70" />
              256-bit TLS
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Shield className="h-3 w-3 text-violet-500/70" />
              PCI-DSS
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Check className="h-3 w-3 text-blue-500/70" />
              HMAC verified
            </div>
          </div>
        </div>

        {/* Unit rates card */}
        <div className="rounded-xl bg-[#0c0e18] border border-slate-800/40 px-4 py-3.5">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Unit Rates</p>
          <div className="space-y-2">
            {[
              { label: "Deep Operation",  cost: `₹${rates.deep_op}`,                          color: "#818cf8" },
              { label: "Light Operation", cost: `₹${rates.light_op}`,                         color: "#38bdf8" },
              { label: "Report",          cost: `₹${rates.report}`,                           color: "#fb923c" },
              { label: "Input Token",     cost: `₹${(rates.token_input*1e6).toFixed(0)} / 1M`,  color: "#a78bfa" },
              { label: "Output Token",    cost: `₹${(rates.token_output*1e6).toFixed(0)} / 1M`, color: "#c084fc" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
                  {r.label}
                </span>
                <span className="text-[12px] font-semibold text-slate-400">{r.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────
function TxRow({ tx, onViewReceipt }: {
  tx: Transaction; onViewReceipt: (tx: Transaction) => void;
}) {
  const isCredit = tx.type === "credit";
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-800/40 last:border-0 group">
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
        isCredit ? "bg-emerald-500/10" : "bg-red-500/10")}>
        {isCredit
          ? <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          : <ArrowUpRight   className="h-4 w-4 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-200 truncate">{tx.description}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-[14px] font-bold", isCredit ? "text-emerald-400" : "text-red-400")}>
          {isCredit ? "+" : "−"}₹{parseFloat(String(tx.amount)).toFixed(2)}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">Bal: ₹{parseFloat(String(tx.balance_after)).toFixed(2)}</p>
      </div>
      {isCredit && (
        <button
          onClick={() => onViewReceipt(tx)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-700 hover:text-violet-400 hover:bg-violet-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="View receipt"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
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
        setWallet({ balance: bal, totalSpent: wData.totalSpent ?? 0, totalBought: wData.totalBought ?? 0, totalScans: wData.totalScans ?? 0, verifiedDomains: wData.verifiedDomains ?? 0 });
        if (!hasShownLowBal.current && (bal === 0 || bal < 50)) {
          hasShownLowBal.current = true; setShowLowBal(true);
        }
      }
      if (tData.success)  setTransactions(tData.transactions ?? []);
      if (uData.success)  setUser(uData.user ?? null);
      if (rData.rates)    setRates({ ...DEFAULT_RATES, ...rData.rates });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const h = () => fetchData(true);
    window.addEventListener("wallet-refresh", h);
    return () => window.removeEventListener("wallet-refresh", h);
  }, [fetchData]);

  const handleProceed = async (config: typeof SLIDER_DEFAULTS, totalINR: number) => {
    setPaying(true);
    try {
      const orderRes  = await fetch("/api/subscription/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

      const rzp = new (window as any).Razorpay({
        key: orderData.keyId, amount: orderData.amount, currency: "INR",
        name: "Pentellia", description: orderData.description, order_id: orderData.orderId,
        prefill: { name: user ? `${user.firstName} ${user.lastName}` : "", email: user?.email || "" },
        theme: { color: "#7c3aed" },
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
            toast.success(`${fmtINR(verifyData.amountAdded)} added to your wallet!`);
            window.dispatchEvent(new Event("wallet-refresh"));
            await fetchData(true);
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
    balance === 0    ? { label: "Empty",    color: "text-red-400",     bar: "#ef4444", glow: "rgba(239,68,68,0.2)"   }
    : balance < 50   ? { label: "Critical", color: "text-red-400",     bar: "#ef4444", glow: "rgba(239,68,68,0.2)"   }
    : balance < 200  ? { label: "Low",      color: "text-amber-400",   bar: "#f59e0b", glow: "rgba(245,158,11,0.18)" }
    : balance < 1000 ? { label: "Active",   color: "text-violet-400",  bar: "#8b5cf6", glow: "rgba(139,92,246,0.25)" }
    :                  { label: "Healthy",  color: "text-emerald-400", bar: "#10b981", glow: "rgba(16,185,129,0.2)"  };

  const refAmt = Math.max(wallet.totalBought, rates.minimum_inr);
  const pct    = wallet.totalBought > 0 ? Math.min(100, Math.round((balance / refAmt) * 100)) : 0;

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      {showLowBal && (
        <LowBalanceModal balance={balance} onClose={() => setShowLowBal(false)}
          onTopUp={() => { setActiveTab("calculator"); hasShownLowBal.current = false; }}
        />
      )}
      {receipt && <ReceiptModal transaction={receipt} user={user} onClose={() => setReceipt(null)} />}

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6 text-slate-200">

        {/* Page header */}
        <div>
          <h1 className="text-[20px] font-bold text-white">Wallet & Billing</h1>
          <p className="text-[14px] text-slate-500 mt-0.5">Manage your credit balance and payment history</p>
        </div>

        {/* Wallet hero */}
        <div className="relative rounded-2xl border border-slate-800/50 bg-[#0c0e18] overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 500px 200px at 5% 60%, ${walletStatus.glow}, transparent 65%)` }}
          />
          <div className="relative p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative h-[60px] w-[60px] shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <circle cx="30" cy="30" r="26" fill="none"
                    stroke={walletStatus.bar} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 5px ${walletStatus.bar})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="h-5 w-5" style={{ color: walletStatus.bar }} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Wallet Balance</p>
                {loading
                  ? <Skeleton className="h-9 w-32 mt-1" />
                  : <h2 className="text-[32px] font-black text-white tracking-tight leading-none mt-1">₹{balance.toFixed(2)}</h2>}
                <span className={cn("text-[13px] font-semibold mt-1 inline-block", walletStatus.color)}>{walletStatus.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              {[
                { label: "Added",  value: loading ? null : fmtINR(wallet.totalBought),         color: "text-emerald-400" },
                { label: "Spent",  value: loading ? null : fmtINR(wallet.totalSpent),           color: "text-red-400"     },
                { label: "Scans",  value: loading ? null : wallet.totalScans.toString(),        color: "text-violet-400"  },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">{s.label}</p>
                  {s.value === null
                    ? <Skeleton className="h-5 w-12 mt-1" />
                    : <p className={cn("text-[15px] font-bold mt-0.5", s.color)}>{s.value}</p>}
                </div>
              ))}
              <button
                onClick={() => fetchData(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Thin progress bar */}
          <div className="h-[3px] w-full bg-slate-800/60">
            <div className="h-full transition-all duration-700"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${walletStatus.bar}70, ${walletStatus.bar})` }} />
          </div>

          {!loading && balance < 200 && balance > 0 && (
            <div className="mx-5 my-3 flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-[13px] text-amber-300/80">Low balance — top up to avoid scan interruptions.</p>
            </div>
          )}
          {!loading && balance === 0 && (
            <div className="mx-5 my-3 flex items-center gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 animate-pulse" />
              <p className="text-[13px] text-red-300/80 font-semibold">⚠ Scanning paused — wallet empty. Top up to resume.</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/50 border border-slate-800/40 w-fit">
          {(["calculator", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold capitalize transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-violet-600 text-white shadow-[0_2px_10px_rgba(124,58,237,0.35)]"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50",
              )}
            >
              {tab === "calculator" ? "Pricing Calculator" : "Transaction History"}
            </button>
          ))}
        </div>

        {/* Calculator tab */}
        {activeTab === "calculator" && (
          <div className="space-y-4">
            {isNew && !loading && (
              <div className="rounded-xl bg-violet-950/30 border border-violet-500/15 p-4 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-bold text-white">Welcome to Pentellia</p>
                  <p className="text-[13px] text-slate-400 mt-0.5 leading-relaxed">
                    Configure your expected usage below. The minimum top-up is{" "}
                    <strong className="text-violet-300">₹6,500</strong> — sliders start at the base bundle
                    so you always get full value.
                  </p>
                </div>
              </div>
            )}
            <PricingCalculator rates={rates} onProceed={handleProceed} paying={paying} />
          </div>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-slate-800/50 bg-[#0c0e18] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-500" />
                <div>
                  <h3 className="text-[14px] font-bold text-white">Transaction History</h3>
                  <p className="text-[11px] text-slate-600">{transactions.length} recent transactions</p>
                </div>
              </div>
              <button onClick={() => fetchData(true)} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-white hover:bg-slate-800/50 transition-all">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-2">
              {loading ? (
                <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <Database className="h-7 w-7 text-slate-700 mx-auto mb-3" />
                  <p className="text-[14px] text-slate-500">No transactions yet</p>
                  <p className="text-[12px] text-slate-600 mt-1">Your payment history will appear here</p>
                </div>
              ) : (
                <div className="px-4">{transactions.map((tx) => <TxRow key={tx.id} tx={tx} onViewReceipt={setReceipt} />)}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}