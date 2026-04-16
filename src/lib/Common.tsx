"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  AlertTriangle, CheckCircle2, Info, Activity, Layers, FileText,
  Cpu, ChevronDown, ChevronUp, ChevronRight, ArrowUp, Shield,
  Globe, Server, Wifi, Tag, ExternalLink, Hash, Clock, Target,
  BarChart2, Eye, EyeOff, Zap, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────

const SEV = {
  critical: { dot: "bg-rose-500",    text: "text-rose-400",    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",    bar: "bg-rose-500",    ring: "ring-rose-500/30"  },
  high:     { dot: "bg-orange-500",  text: "text-orange-400",  badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", bar: "bg-orange-500", ring: "ring-orange-500/30" },
  medium:   { dot: "bg-amber-400",   text: "text-amber-400",   badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",   bar: "bg-amber-400",  ring: "ring-amber-400/30"  },
  low:      { dot: "bg-sky-400",     text: "text-sky-400",     badge: "bg-sky-400/10 text-sky-400 border-sky-400/20",         bar: "bg-sky-400",    ring: "ring-sky-400/30"    },
  info:     { dot: "bg-slate-400",   text: "text-slate-400",   badge: "bg-slate-400/10 text-slate-400 border-slate-500/20",   bar: "bg-slate-500",  ring: "ring-slate-500/20"  },
  unknown:  { dot: "bg-slate-600",   text: "text-slate-500",   badge: "bg-slate-600/10 text-slate-500 border-slate-600/20",   bar: "bg-slate-600",  ring: "ring-slate-600/20"  },
} as const;

type SevKey = keyof typeof SEV;
const sev = (s: string): SevKey => (SEV[s?.toLowerCase() as SevKey] ? s.toLowerCase() as SevKey : "unknown");

// ─────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────

export function CommonScanReport({ data }: { data: any }) {
  const meta      = data?.meta     || {};
  const summary   = data?.summary  || {};
  const findings  = data?.findings || [];
  const coverage  = data?.tool_coverage  || {};
  const owasp     = data?.owasp_compliance || {};
  const sans      = data?.sans_compliance  || {};
  const execSum   = data?.executive_summary;

  const riskScore = summary.risk_score  ?? 0;
  const riskLevel = (summary.risk_level || "Unknown").toUpperCase();

  // severity counts
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach((f: any) => {
      const k = (f.severity || "info").toLowerCase() as keyof typeof c;
      if (k in c) c[k]++;
    });
    return c;
  }, [findings]);

  // filter state
  const ALL_SEVS: SevKey[] = ["critical", "high", "medium", "low", "info"];
  const [filter, setFilter] = useState<SevKey | "all">("all");
  const filtered = useMemo(() =>
    filter === "all" ? findings : findings.filter((f: any) => sev(f.severity) === filter),
  [findings, filter]);

  // nav
  const [activeSection, setActiveSection] = useState("overview");
  const scrollingRef = useRef(false);

  const scrollTo = (id: string) => {
    scrollingRef.current = true;
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { scrollingRef.current = false; }, 1000);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (scrollingRef.current) return;
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { rootMargin: "-100px 0px -70% 0px" });
    ["overview", "findings", "compliance", "methodology"].forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  // back to top
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const riskColor =
    riskScore >= 80 ? "text-rose-400"
    : riskScore >= 50 ? "text-orange-400"
    : riskScore >= 20 ? "text-amber-400"
    : "text-emerald-400";

  const riskBorder =
    riskScore >= 80 ? "border-rose-500/40"
    : riskScore >= 50 ? "border-orange-500/40"
    : riskScore >= 20 ? "border-amber-400/40"
    : "border-emerald-500/40";

  const hasCompliance = (owasp.total_categories > 0) || (sans.total_categories > 0);

  return (
    <div className="relative min-h-screen bg-[#03040a] text-slate-200"
      style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>

      {/* ── Sticky nav ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#03040a]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 h-14 overflow-x-auto scrollbar-none">
            {[
              { id: "overview",     label: "Overview",    icon: <Activity className="w-3.5 h-3.5" /> },
              { id: "findings",     label: `Findings`,    icon: <AlertTriangle className="w-3.5 h-3.5" />, count: findings.length },
              ...(hasCompliance ? [{ id: "compliance", label: "Compliance", icon: <Shield className="w-3.5 h-3.5" /> }] : []),
              { id: "methodology",  label: "Methodology", icon: <Cpu className="w-3.5 h-3.5" /> },
            ].map(({ id, label, icon, count }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all whitespace-nowrap",
                  activeSection === id
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-500 hover:text-slate-300"
                )}>
                {icon}
                {label}
                {count !== undefined && (
                  <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    activeSection === id ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-slate-500")}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── SECTION 1: OVERVIEW ─────────────────────────────────────── */}
        <section id="overview" className="scroll-mt-20 space-y-6">

          {/* Top metrics strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Risk score - spans 2 on mobile, 1 on lg */}
            <div className={cn(
              "col-span-2 sm:col-span-1 lg:col-span-2 rounded-2xl border p-5 flex items-center gap-5",
              "bg-[#080b14]", riskBorder
            )}>
              {/* Arc gauge */}
              <div className="relative shrink-0 w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="32" fill="none"
                    stroke={riskScore >= 80 ? "#f43f5e" : riskScore >= 50 ? "#fb923c" : riskScore >= 20 ? "#fbbf24" : "#34d399"}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(riskScore / 100) * 201} 201`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-2xl font-black leading-none", riskColor)}>{riskScore}</span>
                  <span className="text-[8px] text-slate-600 uppercase tracking-widest mt-0.5">score</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Risk Level</p>
                <p className={cn("text-xl font-black tracking-tight leading-none", riskColor)}>{riskLevel}</p>
                <p className="text-xs text-slate-500 mt-2">{summary.total_findings ?? 0} findings · {summary.affected_assets ?? 0} assets</p>
              </div>
            </div>

            {/* Severity stat boxes */}
            {(["critical", "high", "medium", "low", "info"] as SevKey[]).map(k => (
              <button key={k} onClick={() => setFilter(filter === k ? "all" : k)}
                className={cn(
                  "rounded-2xl border p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]",
                  filter === k
                    ? cn("bg-[#080b14]", SEV[k].ring, "ring-1 border-transparent")
                    : "bg-[#080b14] border-white/[0.05] hover:border-white/10"
                )}>
                <p className={cn("text-3xl font-black tabular-nums", SEV[k].text)}>{counts[k]}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-semibold">{k}</p>
              </button>
            ))}
          </div>

          {/* Executive summary */}
          {execSum && (
            <div className="rounded-2xl bg-[#080b14] border border-white/[0.05] p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assessment Summary</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{execSum}</p>
            </div>
          )}

          {/* Top categories if present */}
          {summary.top_categories?.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest">Top categories:</span>
              {summary.top_categories.map((cat: string) => (
                <span key={cat} className="text-[11px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-mono uppercase tracking-wide">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION 2: DETAILED FINDINGS ────────────────────────────── */}
        <section id="findings" className="scroll-mt-20 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Detailed Findings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filter === "all" ? `${findings.length} total findings` : `${filtered.length} of ${findings.length} — filtered by ${filter}`}
              </p>
            </div>
            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <FilterPill label="All" count={findings.length} active={filter === "all"} onClick={() => setFilter("all")} />
              {(["critical","high","medium","low","info"] as SevKey[]).filter(k => counts[k] > 0).map(k => (
                <FilterPill key={k} label={k} count={counts[k]} active={filter === k}
                  onClick={() => setFilter(filter === k ? "all" : k)} sevKey={k} />
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-3" />
              <p className="text-white font-semibold">No findings</p>
              <p className="text-slate-500 text-sm mt-1">No results match the current filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((f: any, i: number) => (
                <FindingCard key={f.id || i} finding={f} />
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION 3: COMPLIANCE ───────────────────────────────────── */}
        {hasCompliance && (
          <section id="compliance" className="scroll-mt-20 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Compliance Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">OWASP Top 10 and SANS/CWE Top 25 assessment results</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {owasp.total_categories > 0 && (
                <ComplianceCard
                  title="OWASP Top 10 — 2025"
                  passed={owasp.passed}
                  failed={owasp.failed}
                  total={owasp.total_categories}
                  categories={owasp.categories}
                  accentColor="indigo"
                />
              )}
              {sans.total_categories > 0 && (
                <ComplianceCard
                  title="SANS / CWE Top 25"
                  passed={sans.passed}
                  failed={sans.failed}
                  total={sans.total_categories}
                  categories={sans.categories}
                  accentColor="violet"
                  collapsible
                />
              )}
            </div>
          </section>
        )}

        {/* ── SECTION 4: METHODOLOGY ──────────────────────────────────── */}
        <section id="methodology" className="scroll-mt-20 space-y-5">
          <h2 className="text-xl font-bold text-white tracking-tight">Scope & Methodology</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-[#080b14] border border-white/[0.05] p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" /> Configuration Profile
              </h3>
              {[
                { label: "Target",          value: meta.target },
                { label: "Tool",            value: meta.tool || meta.scan_type },
                { label: "Category",        value: meta.category },
                { label: "Scan Profile",    value: meta.parameters?.scan_level || "Standard" },
                { label: "Started",         value: meta.started_at ? new Date(meta.started_at).toLocaleString() : undefined },
                { label: "Completed",       value: meta.completed_at ? new Date(meta.completed_at).toLocaleString() : undefined },
              ].filter(r => r.value).map(({ label, value }) => (
                <MetaRow key={label} label={label} value={value} />
              ))}
              {/* Extra parameters */}
              {meta.parameters && Object.entries(meta.parameters)
                .filter(([k, v]) => !["scan_level"].includes(k) && v !== "" && v !== null && v !== undefined)
                .map(([k, v]) => (
                  <MetaRow key={k} label={k.replace(/_/g, " ")} value={String(v)} mono />
                ))
              }
            </div>

            <div className="rounded-2xl bg-[#080b14] border border-white/[0.05] p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Tool Coverage
              </h3>
              {coverage.tools_executed?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Executed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {coverage.tools_executed.map((t: string) => (
                      <span key={t} className="flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {coverage.tools_failed?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Failed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {coverage.tools_failed.map((t: string) => (
                      <span key={t} className="flex items-center gap-1 text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {coverage.tools_skipped?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Skipped</p>
                  <div className="flex flex-wrap gap-1.5">
                    {coverage.tools_skipped.map((t: string) => (
                      <span key={t} className="flex items-center gap-1 text-[11px] bg-slate-500/10 border border-slate-500/20 text-slate-400 px-2.5 py-1 rounded-full font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(!coverage.tools_executed?.length && !coverage.tools_failed?.length) && (
                <p className="text-sm text-slate-600">Single-engine scan — no multi-tool coverage data.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Back to top ─────────────────────────────────────────────── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-indigo-600/90 backdrop-blur-sm",
          "border border-indigo-500/50 shadow-lg shadow-indigo-500/20 flex items-center justify-center",
          "hover:bg-indigo-500 transition-all duration-300",
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-label="Back to top"
      >
        <ArrowUp className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FindingCard — expandable, shows ALL JSON data properly
// ─────────────────────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: any }) {
  const [open, setOpen] = useState(false);
  const sk = sev(finding.severity);
  const st = SEV[sk];
  const additional = finding.evidence?.additional || {};
  const nvd = additional.nvd_enrichment;
  const isStats = additional.statistics !== undefined;
  const hasHostInfo = additional.ip || additional.port || additional.service;
  const hasBanner = !!additional.banner_preview;

  return (
    <div className={cn(
      "rounded-2xl bg-[#080b14] border border-white/[0.05] overflow-hidden",
      "hover:border-white/10 transition-all duration-200",
      open && "border-white/10"
    )}>
      {/* Left severity bar */}
      <div className="flex">
        <div className={cn("w-1 shrink-0", st.bar)} />
        <div className="flex-1 min-w-0">

          {/* Header */}
          <button
            className="w-full text-left p-4 sm:p-5 flex items-start gap-4 cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {/* Severity dot + badge */}
            <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", st.dot)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={cn("text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md border", st.badge)}>
                  {sk}
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">{finding.category}</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white leading-snug pr-2">{finding.title}</h4>
              {!open && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-relaxed">{finding.description}</p>
              )}
              {/* Tags */}
              {finding.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {finding.tags.map((t: string) => (
                    <span key={t} className="text-[10px] font-mono bg-white/[0.03] border border-white/[0.07] text-slate-500 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right meta */}
            <div className="flex items-center gap-4 shrink-0">
              {finding.confidence !== undefined && (
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <span className="text-[9px] text-slate-600 uppercase tracking-wider">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/80 rounded-full"
                        style={{ width: `${Math.round((finding.confidence || 0) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{Math.round((finding.confidence || 0) * 100)}%</span>
                  </div>
                </div>
              )}
              {open
                ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              }
            </div>
          </button>

          {/* Expanded body */}
          {open && (
            <div className="border-t border-white/[0.05] p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* LEFT col (lg:col-span-2) */}
              <div className="lg:col-span-2 space-y-5">

                {/* Description */}
                <Block label="Description">
                  <p className="text-sm text-slate-300 leading-relaxed">{finding.description}</p>
                </Block>

                {/* Host intelligence (Shodan host findings) */}
                {hasHostInfo && !isStats && (
                  <Block label="Host Intelligence">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { k: "IP Address",    v: additional.ip,           mono: true  },
                        { k: "Port",          v: additional.port,          mono: true  },
                        { k: "Service",       v: additional.service,       mono: false },
                        { k: "Country",       v: additional.country,       mono: false },
                        { k: "Organization",  v: additional.organization,  mono: false, full: true },
                        { k: "Version",       v: additional.version || undefined, mono: true },
                      ].filter(r => r.v !== undefined && r.v !== "").map(({ k, v, mono, full }) => (
                        <div key={k} className={cn("bg-white/[0.02] border border-white/[0.05] rounded-xl p-3", full && "col-span-2 sm:col-span-3")}>
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{k}</p>
                          <p className={cn("text-sm text-white break-all leading-snug", mono && "font-mono")}>{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </Block>
                )}

                {/* Statistics summary (Shodan summary findings) */}
                {isStats && (
                  <Block label="Scan Statistics">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                      {Object.entries(additional.statistics || {}).map(([k, v]) => (
                        <div key={k} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
                          <p className="text-xl font-black text-white tabular-nums">{String(v)}</p>
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1 leading-tight">{k.replace(/_/g, " ")}</p>
                        </div>
                      ))}
                    </div>
                    {additional.query && (
                      <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider shrink-0">Query</span>
                        <span className="text-sm text-indigo-300 font-mono">{additional.query}</span>
                      </div>
                    )}
                    {additional.unique_ips !== undefined && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <DataPill label="Unique IPs" value={String(additional.unique_ips)} />
                        <DataPill label="Total Results" value={String(additional.total_results)} />
                      </div>
                    )}
                  </Block>
                )}

                {/* Breach intel additional data */}
                {additional.breaches !== undefined || additional.sources !== undefined ? (
                  <Block label="Breach Data">
                    {additional.breaches?.length > 0
                      ? <div className="space-y-2">
                          {additional.breaches.map((b: any, i: number) => (
                            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-sm text-slate-300">
                              {typeof b === "object" ? JSON.stringify(b, null, 2) : String(b)}
                            </div>
                          ))}
                        </div>
                      : <p className="text-sm text-slate-500">No breach records found for this target.</p>
                    }
                  </Block>
                ) : null}

                {/* Banner preview */}
                {hasBanner && (
                  <Block label="Service Banner">
                    <pre className="text-xs text-emerald-400/80 bg-black/40 border border-white/[0.05] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed font-mono">
                      {additional.banner_preview}
                    </pre>
                  </Block>
                )}

                {/* NVD / CVSS block */}
                {nvd && (
                  <Block label="NVD Vulnerability Intelligence">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {nvd.cvss_base_score !== null && nvd.cvss_base_score !== undefined && (
                          <StatTile label="CVSS Base" value={String(nvd.cvss_base_score)} accent="white" />
                        )}
                        {nvd.cvss_severity && (
                          <StatTile label="Severity" value={nvd.cvss_severity.toUpperCase()} accent="orange" />
                        )}
                        {nvd.exploitability_score !== undefined && (
                          <StatTile label="Exploitability" value={String(nvd.exploitability_score)} accent="rose" />
                        )}
                        {nvd.impact_score !== undefined && (
                          <StatTile label="Impact" value={String(nvd.impact_score)} accent="amber" />
                        )}
                      </div>
                      {nvd.cvss_v3?.vector_string && (
                        <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3">
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">CVSS v3 Vector</p>
                          <p className="font-mono text-[11px] text-indigo-300 break-all">{nvd.cvss_v3.vector_string}</p>
                        </div>
                      )}
                      {nvd.references?.length > 0 && (
                        <div>
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">References ({nvd.references.length})</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {nvd.references.map((r: any, i: number) => (
                              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-start gap-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                                <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="break-all">{r.url}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Block>
                )}

                {/* Generic evidence fallback for tools not specifically handled above */}
                {!hasHostInfo && !isStats && !nvd && !hasBanner
                  && additional && Object.keys(additional).length > 0
                  && !["breaches","sources","nvd_enrichment","cve_id"].every(k => k in additional)
                  && (
                  <Block label="Evidence">
                    <div className="bg-black/30 border border-white/[0.05] rounded-xl p-4 font-mono text-xs text-emerald-400/80 overflow-x-auto">
                      <RecursiveEvidence data={additional} />
                    </div>
                  </Block>
                )}
              </div>

              {/* RIGHT col */}
              <div className="space-y-4">
                {finding.affected_asset && (
                  <Block label="Affected Asset">
                    <p className="text-sm font-mono text-white bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 break-all">{finding.affected_asset}</p>
                  </Block>
                )}
                {finding.impact && (
                  <Block label="Impact" accentColor="orange">
                    <p className="text-sm text-slate-300 leading-relaxed">{finding.impact}</p>
                  </Block>
                )}
                {finding.recommendation && (
                  <Block label="Recommended Action" accentColor="emerald">
                    <p className="text-sm text-slate-300 leading-relaxed">{finding.recommendation}</p>
                  </Block>
                )}
                {/* Mobile confidence */}
                {finding.confidence !== undefined && (
                  <div className="sm:hidden">
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Confidence</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/80 rounded-full"
                          style={{ width: `${Math.round((finding.confidence || 0) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-400">{Math.round((finding.confidence || 0) * 100)}%</span>
                    </div>
                  </div>
                )}
                {(finding.owasp_category || finding.sans_category) && (
                  <Block label="Classification">
                    <div className="flex flex-wrap gap-1.5">
                      {finding.owasp_category && <ClassBadge label={finding.owasp_category} />}
                      {finding.sans_category && <ClassBadge label={finding.sans_category.split(":")[0]} />}
                    </div>
                  </Block>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {finding.source_tool && <DataPill label="Source" value={finding.source_tool} />}
                  {finding.id && <DataPill label="Finding ID" value={finding.id} mono />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// ComplianceCard
// ─────────────────────────────────────────────────────────────────────

function ComplianceCard({ title, passed, failed, total, categories, accentColor, collapsible }: any) {
  const [expanded, setExpanded] = useState(!collapsible);
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const catEntries = Object.entries(categories || {});

  return (
    <div className="rounded-2xl bg-[#080b14] border border-white/[0.05] overflow-hidden">
      <button className="w-full text-left p-5 flex items-center gap-4" onClick={() => collapsible && setExpanded(!expanded)}>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700",
                accentColor === "indigo" ? "bg-indigo-500" : "bg-violet-500")}
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-mono text-slate-400 shrink-0">{passed}/{total} pass</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {failed > 0
            ? <span className="text-sm font-bold text-rose-400">{failed} failed</span>
            : <span className="text-sm font-bold text-emerald-400">All clear</span>
          }
          {collapsible && (expanded ? <ChevronUp className="w-4 h-4 text-slate-500 ml-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 ml-auto mt-1" />)}
        </div>
      </button>

      {expanded && catEntries.length > 0 && (
        <div className="border-t border-white/[0.05] p-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {catEntries.map(([name, data]: [string, any]) => (
            <div key={name} className={cn(
              "flex items-start gap-2.5 p-2.5 rounded-xl text-xs",
              data.safe ? "bg-emerald-500/[0.04] border border-emerald-500/10" : "bg-rose-500/[0.06] border border-rose-500/15"
            )}>
              <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", data.safe ? "bg-emerald-500/70" : "bg-rose-500")} />
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium leading-snug truncate", data.safe ? "text-slate-400" : "text-rose-300")}>
                  {name.split(":")[0]}
                </p>
                {!data.safe && data.count > 0 && (
                  <p className="text-rose-400/70 text-[10px] mt-0.5">{data.count} finding{data.count !== 1 ? "s" : ""}</p>
                )}
              </div>
              <span className={cn("shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                data.safe ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                {data.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function FilterPill({ label, count, active, onClick, sevKey }: any) {
  const st = sevKey ? SEV[sevKey as SevKey] : null;
  return (
    <button onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
        active
          ? st ? cn("border-transparent", st.badge) : "bg-white text-black border-transparent"
          : "bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/15"
      )}>
      {sevKey && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEV[sevKey as SevKey].dot)} />}
      {label}
      <span className={cn("px-1 py-0.5 rounded text-[9px] font-black",
        active ? "bg-white/20" : "bg-white/5 text-slate-600")}>
        {count}
      </span>
    </button>
  );
}

function Block({ label, children, accentColor }: { label: string; children: React.ReactNode; accentColor?: string }) {
  const dotColor = accentColor === "emerald" ? "bg-emerald-500"
    : accentColor === "orange" ? "bg-orange-500"
    : "bg-indigo-500";
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</h5>
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-slate-500 capitalize shrink-0">{label}</span>
      <span className={cn("text-xs text-right break-all", mono ? "font-mono text-slate-300" : "text-slate-200")}>
        {value}
      </span>
    </div>
  );
}

function DataPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5">
      <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-xs text-slate-300 break-all", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  const textColor = accent === "rose" ? "text-rose-400" : accent === "orange" ? "text-orange-400"
    : accent === "amber" ? "text-amber-400" : "text-white";
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
      <p className={cn("text-2xl font-black tabular-nums", textColor)}>{value}</p>
      <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function ClassBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-1 rounded-lg uppercase">
      {label}
    </span>
  );
}

function RecursiveEvidence({ data }: { data: any }) {
  if (typeof data !== "object" || data === null) return <span>{String(data)}</span>;
  return (
    <ul className="pl-3 border-l border-white/10 space-y-1">
      {Object.entries(data).map(([key, value], i) => (
        <li key={i} className="flex flex-col sm:flex-row sm:gap-2">
          <span className="text-indigo-300/80 shrink-0">{key}:</span>
          <span className="text-slate-400 break-all">
            {typeof value === "object" ? <RecursiveEvidence data={value} /> : String(value)}
          </span>
        </li>
      ))}
    </ul>
  );
}