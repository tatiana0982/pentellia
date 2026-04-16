"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertTriangle, CheckCircle2, Info, Activity, Layers, FileText,
  Cpu, ChevronDown, ChevronUp, ArrowUp, Shield, Server,
  ExternalLink, Clock, Target, BarChart2, Database, Hash,
  XCircle, CheckCircle, Minus, Globe, Radio, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM — SIEM / SOC PLATFORM GRADE
// Reference: Splunk, Microsoft Sentinel, Cortex XSIAM, QRadar
// ─────────────────────────────────────────────────────────────────────

const C = {
  bg:         "#04050c",
  surface:    "#070810",
  surfaceHi:  "#0b0d18",
  border:     "rgba(255,255,255,0.06)",
  borderSub:  "rgba(255,255,255,0.03)",
};

const SEV_CONFIG = {
  critical: { label: "CRITICAL", bg: "bg-rose-500/10",   text: "text-rose-400",   border: "border-rose-500/25",   bar: "bg-rose-500",   dot: "bg-rose-500"   },
  high:     { label: "HIGH",     bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/25", bar: "bg-orange-500", dot: "bg-orange-500" },
  medium:   { label: "MEDIUM",   bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/25",  bar: "bg-amber-500",  dot: "bg-amber-500"  },
  low:      { label: "LOW",      bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/25",   bar: "bg-blue-500",   dot: "bg-blue-500"   },
  info:     { label: "INFO",     bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/20",  bar: "bg-slate-500",  dot: "bg-slate-500"  },
  unknown:  { label: "UNKNOWN",  bg: "bg-slate-700/10",  text: "text-slate-500",  border: "border-slate-700/20",  bar: "bg-slate-600",  dot: "bg-slate-600"  },
} as const;

type SevKey = keyof typeof SEV_CONFIG;
const normSev = (s: string): SevKey =>
  (SEV_CONFIG[s?.toLowerCase() as SevKey] ? s.toLowerCase() as SevKey : "unknown");

// OWASP full names — sorted A01→A09
const OWASP_NAMES: Record<string, string> = {
  "A01": "Broken Access Control",
  "A02": "Security Misconfiguration",
  "A03": "Software Supply Chain Failures",
  "A04": "Cryptographic Failures",
  "A05": "Injection",
  "A06": "Insecure Design",
  "A07": "Authentication Failures",
  "A08": "Software and Data Integrity Failures",
  "A09": "Security Logging and Alerting Failures",
  "A10": "Server-Side Request Forgery (SSRF)",
};

function owaspCode(key: string) {
  const m = key.match(/(A\d+)/);
  return m ? m[1] : key;
}

function owaspName(key: string) {
  const code = owaspCode(key);
  return OWASP_NAMES[code] || key.split("-").slice(1).join("-").trim();
}

// Sort compliance entries: A01, A02 … or CWE-22, CWE-77 …
function sortCompliance(entries: [string, any][]) {
  return entries.sort(([a], [b]) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || "0");
    const numB = parseInt(b.match(/\d+/)?.[0] || "0");
    return numA - numB;
  });
}

// ─────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────

export function CommonScanReport({ data }: { data: any }) {
  const meta    = data?.meta     || {};
  const summary = data?.summary  || {};
  const findings = data?.findings || [];
  const coverage = data?.tool_coverage || {};
  const owaspComp = data?.owasp_compliance || {};
  const sansComp  = data?.sans_compliance  || {};
  const execSum   = data?.executive_summary;

  const riskScore = summary.risk_score  ?? 0;
  const riskLevel = (summary.risk_level || "Unknown").toUpperCase();

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach((f: any) => {
      const k = normSev(f.severity) as keyof typeof c;
      if (k in c) c[k]++;
    });
    return c;
  }, [findings]);

  const ALL_SEVS: SevKey[] = ["critical", "high", "medium", "low", "info"];
  const [activeFilter, setActiveFilter] = useState<SevKey | "all">("all");

  const displayed = useMemo(() =>
    activeFilter === "all" ? findings : findings.filter((f: any) => normSev(f.severity) === activeFilter),
  [findings, activeFilter]);

  const [activeSection, setActiveSection] = useState("overview");
  const scrollRef = useRef(false);

  const navTo = (id: string) => {
    scrollRef.current = true;
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { scrollRef.current = false; }, 1000);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (scrollRef.current) return;
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { rootMargin: "-80px 0px -65% 0px" });
    ["overview", "findings", "compliance", "methodology"].forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const fn = () => setShowTop(window.scrollY > 500);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const hasCompliance = (owaspComp.total_categories > 0) || (sansComp.total_categories > 0);

  const riskTextColor = riskScore >= 80 ? "text-rose-400" : riskScore >= 50 ? "text-orange-400" : riskScore >= 20 ? "text-amber-400" : "text-slate-300";
  const riskBarColor  = riskScore >= 80 ? "bg-rose-500"   : riskScore >= 50 ? "bg-orange-500"   : riskScore >= 20 ? "bg-amber-500"   : "bg-slate-600";

  const NAV_ITEMS = [
    { id: "overview",    label: "Overview",    count: null },
    { id: "findings",    label: "Findings",    count: findings.length },
    ...(hasCompliance ? [{ id: "compliance",  label: "Compliance",  count: null }] : []),
    { id: "methodology", label: "Methodology", count: null },
  ];

  return (
    <div className="relative min-h-screen text-slate-200" style={{ backgroundColor: C.bg, fontFamily: "'DM Sans','Inter',system-ui,sans-serif" }}>

      {/* ─── Sticky Navigation ──────────────────────────────────────── */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{ backgroundColor: `${C.bg}e8`, borderColor: C.border }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-0.5 h-12 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {NAV_ITEMS.map(({ id, label, count }) => (
              <button key={id} onClick={() => navTo(id)}
                className={cn(
                  "flex items-center gap-2 px-4 h-8 text-xs font-semibold tracking-wide rounded transition-all whitespace-nowrap",
                  activeSection === id
                    ? "bg-indigo-500/12 text-indigo-300 border border-indigo-500/25"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                )}>
                {label}
                {count !== null && (
                  <span className={cn("min-w-[18px] h-[18px] px-1 rounded text-[10px] font-black tabular-nums text-center",
                    activeSection === id ? "bg-indigo-500/20 text-indigo-300" : "bg-white/[0.06] text-slate-500")}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-14">

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1 — OVERVIEW
        ═══════════════════════════════════════════════════════════ */}
        <section id="overview" className="scroll-mt-16 space-y-8">

          {/* ── Risk headline + severity grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

            {/* Risk card */}
            <div className="lg:col-span-1 rounded-lg border p-6 flex flex-col justify-between"
              style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <div>
                <p className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase mb-4">Risk Assessment</p>
                <div className="flex items-end gap-3 mb-3">
                  <span className={cn("text-6xl font-black tabular-nums leading-none", riskTextColor)}>{riskScore}</span>
                  <span className="text-slate-600 text-sm mb-1 font-mono">/100</span>
                </div>
                <p className={cn("text-lg font-bold tracking-wide", riskTextColor)}>{riskLevel}</p>
              </div>
              {/* Risk bar */}
              <div className="mt-6">
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", riskBarColor)}
                    style={{ width: `${riskScore}%` }} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-600">0</span>
                  <span className="text-[10px] text-slate-600">100</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: C.border }}>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Findings</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{summary.total_findings ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Assets</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{summary.affected_assets ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Severity breakdown */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {(["critical","high","medium","low","info"] as SevKey[]).map(k => {
                const cfg = SEV_CONFIG[k];
                const active = activeFilter === k;
                return (
                  <button key={k} onClick={() => setActiveFilter(active ? "all" : k)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-all hover:border-white/10 cursor-pointer",
                      active ? cn(cfg.bg, cfg.border) : "border-white/[0.05]"
                    )}
                    style={{ backgroundColor: active ? undefined : C.surface }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                      <span className={cn("text-[10px] font-bold tracking-widest uppercase", active ? cfg.text : "text-slate-500")}>{k}</span>
                    </div>
                    <p className={cn("text-3xl font-black tabular-nums", active ? cfg.text : "text-slate-200")}>{counts[k]}</p>
                    {counts[k] > 0 && (
                      <div className="mt-2 h-0.5 rounded-full bg-white/5 overflow-hidden">
                        <div className={cn("h-full", cfg.bar)}
                          style={{ width: `${Math.round((counts[k] / findings.length) * 100)}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Executive summary ── */}
          {execSum && (
            <div className="rounded-lg border p-5" style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <SectionLabel icon={<Activity className="w-3 h-3" />} label="Assessment Summary" />
              <p className="text-sm text-slate-300 leading-relaxed mt-3">{execSum}</p>
            </div>
          )}

          {/* ── Top categories ── */}
          {summary.top_categories?.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mr-1">Top Categories</span>
              {summary.top_categories.map((cat: string) => (
                <span key={cat} className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded border uppercase tracking-wide text-indigo-300"
                  style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)" }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2 — DETAILED FINDINGS
        ═══════════════════════════════════════════════════════════ */}
        <section id="findings" className="scroll-mt-16 space-y-6">

          {/* Section header + filter */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Detailed Findings</h2>
              <p className="text-xs text-slate-500 mt-1">
                {activeFilter === "all"
                  ? `${findings.length} total · ${counts.critical} critical · ${counts.high} high · ${counts.medium} medium`
                  : `Showing ${displayed.length} of ${findings.length} — filtered: ${activeFilter.toUpperCase()}`
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <FilterBtn label="All" count={findings.length} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
              {(["critical","high","medium","low","info"] as SevKey[]).filter(k => counts[k] > 0).map(k => (
                <FilterBtn key={k} label={k.toUpperCase()} count={counts[k]} active={activeFilter === k}
                  onClick={() => setActiveFilter(activeFilter === k ? "all" : k)} sevKey={k} />
              ))}
            </div>
          </div>

          {displayed.length === 0 ? (
            <div className="rounded-lg border border-dashed p-16 text-center" style={{ borderColor: C.border }}>
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No findings match this filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((f: any, i: number) => (
                <FindingCard key={f.id || i} finding={f} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3 — COMPLIANCE OVERVIEW
        ═══════════════════════════════════════════════════════════ */}
        {hasCompliance && (
          <section id="compliance" className="scroll-mt-16 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Compliance Assessment</h2>
              <p className="text-xs text-slate-500 mt-1">Automated mapping against industry security frameworks</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {owaspComp.total_categories > 0 && (
                <CompliancePanel
                  title="OWASP Top 10"
                  subtitle="2025 Edition — Web Application Security Risks"
                  passed={owaspComp.passed}
                  failed={owaspComp.failed}
                  total={owaspComp.total_categories}
                  categories={owaspComp.categories}
                  type="owasp"
                  defaultOpen
                />
              )}
              {sansComp.total_categories > 0 && (
                <CompliancePanel
                  title="SANS / CWE Top 25"
                  subtitle="Most Dangerous Software Weaknesses"
                  passed={sansComp.passed}
                  failed={sansComp.failed}
                  total={sansComp.total_categories}
                  categories={sansComp.categories}
                  type="sans"
                  defaultOpen={false}
                />
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4 — SCOPE & METHODOLOGY
        ═══════════════════════════════════════════════════════════ */}
        <section id="methodology" className="scroll-mt-16 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Scope & Methodology</h2>
            <p className="text-xs text-slate-500 mt-1">Scan configuration, execution parameters, and tool coverage</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Scan target & identity */}
            <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <SectionLabel icon={<Target className="w-3 h-3" />} label="Scan Target" />
              <div className="space-y-3 pt-1">
                <MetaField label="Target" value={meta.target} mono />
                <MetaField label="Tool" value={meta.tool || meta.scan_type} />
                <MetaField label="Category" value={meta.category} />
                <MetaField label="Scan ID" value={meta.scan_id} mono truncate />
              </div>
            </div>

            {/* Execution timeline */}
            <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <SectionLabel icon={<Clock className="w-3 h-3" />} label="Execution Timeline" />
              <div className="space-y-3 pt-1">
                <MetaField label="Profile" value={meta.parameters?.scan_level || "Standard"} />
                <MetaField label="Started" value={meta.started_at ? formatTs(meta.started_at) : undefined} mono />
                <MetaField label="Completed" value={meta.completed_at ? formatTs(meta.completed_at) : undefined} mono />
                {meta.started_at && meta.completed_at && (
                  <MetaField label="Duration"
                    value={calcDuration(meta.started_at, meta.completed_at)} mono />
                )}
                {data?.scan_duration && (
                  <MetaField label="Engine Time" value={`${data.scan_duration}s`} mono />
                )}
              </div>
            </div>

            {/* Scan parameters */}
            <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <SectionLabel icon={<Cpu className="w-3 h-3" />} label="Scan Parameters" />
              <div className="space-y-3 pt-1">
                {meta.parameters && Object.entries(meta.parameters)
                  .filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false)
                  .map(([k, v]) => (
                    <MetaField key={k} label={k.replace(/_/g, " ")} value={String(v)} mono />
                  ))
                }
                {(!meta.parameters || Object.keys(meta.parameters).length === 0) && (
                  <p className="text-xs text-slate-600">Default parameters applied.</p>
                )}
              </div>
            </div>

            {/* Tool coverage */}
            <div className="lg:col-span-3 rounded-lg border p-5" style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <SectionLabel icon={<Layers className="w-3 h-3" />} label="Tool Coverage & Engine Execution" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: "Executed", tools: coverage.tools_executed, color: "text-slate-400", dot: "bg-slate-400" },
                  { label: "Failed", tools: coverage.tools_failed, color: "text-rose-400", dot: "bg-rose-500" },
                  { label: "Skipped", tools: coverage.tools_skipped, color: "text-amber-400", dot: "bg-amber-500" },
                ].map(({ label, tools, color, dot }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">{label}</p>
                    {tools?.length > 0
                      ? <div className="space-y-1.5">{tools.map((t: string) => (
                          <div key={t} className="flex items-center gap-2 text-xs">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                            <span className={cn("font-mono", color)}>{t}</span>
                          </div>
                        ))}</div>
                      : <p className="text-xs text-slate-600 italic">
                          {label === "Executed" ? "Single-engine assessment" : "None"}
                        </p>
                    }
                  </div>
                ))}
              </div>

              {/* Result storage */}
              {data?.raw_reference?.stored && (
                <div className="mt-5 pt-5 border-t flex items-center gap-3" style={{ borderColor: C.border }}>
                  <Database className="w-3 h-3 text-slate-600 shrink-0" />
                  <p className="text-xs text-slate-600">
                    Raw results stored at <span className="font-mono text-slate-500">{data.raw_reference.location}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ─── Back to top ───────────────────────────────────────────── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={cn(
          "fixed bottom-6 right-6 z-50 w-9 h-9 rounded flex items-center justify-center",
          "border border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
          "hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300",
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        )}>
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FINDING CARD — Full data display, SIEM grade
// ─────────────────────────────────────────────────────────────────────

function FindingCard({ finding, index }: { finding: any; index: number }) {
  const [open, setOpen] = useState(false);
  const sk = normSev(finding.severity);
  const cfg = SEV_CONFIG[sk];
  const add = finding.evidence?.additional || {};
  const nvd = add.nvd_enrichment;
  const isStats   = add.statistics !== undefined;
  const isHost    = !isStats && (add.ip || add.port || add.service);
  const hasBanner = !!add.banner_preview;
  const pct = Math.round((finding.confidence ?? 0) * 100);

  return (
    <div className="rounded-lg border overflow-hidden transition-all"
      style={{ backgroundColor: C.surface, borderColor: open ? "rgba(255,255,255,0.09)" : C.border }}>

      {/* Left severity stripe */}
      <div className="flex">
        <div className={cn("w-[3px] shrink-0 self-stretch", cfg.bar)} />

        <div className="flex-1 min-w-0">
          {/* ── Collapsed header ── */}
          <button className="w-full text-left px-5 py-4 flex items-start gap-4 group"
            onClick={() => setOpen(!open)}>
            <div className="flex flex-col gap-2 shrink-0 items-center pt-0.5">
              <span className={cn("text-[9px] font-black tracking-[0.15em] px-2 py-0.5 rounded-sm border", cfg.bg, cfg.text, cfg.border)}>
                {cfg.label}
              </span>
              <span className="text-[9px] font-mono text-slate-600 uppercase">{finding.category}</span>
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-semibold text-slate-100 leading-snug group-hover:text-white transition-colors">
                {finding.title}
              </p>
              {!open && finding.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-relaxed">{finding.description}</p>
              )}
              {finding.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {finding.tags.map((t: string) => (
                    <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm border text-slate-600"
                      style={{ borderColor: C.border, backgroundColor: C.surfaceHi }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-5 shrink-0">
              {pct > 0 && (
                <div className="hidden sm:flex flex-col items-end gap-1.5">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-indigo-500/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{pct}%</span>
                  </div>
                </div>
              )}
              <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </button>

          {/* ── Expanded body ── */}
          {open && (
            <div className="border-t" style={{ borderColor: C.border }}>
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT: primary data */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Description */}
                  <ExpandSection label="Description">
                    <p className="text-sm text-slate-300 leading-relaxed">{finding.description}</p>
                  </ExpandSection>

                  {/* Host intelligence (Shodan host findings) */}
                  {isHost && (
                    <ExpandSection label="Host Intelligence">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { k: "IP Address",   v: add.ip,           mono: true  },
                          { k: "Port",         v: add.port,         mono: true  },
                          { k: "Service",      v: add.service               },
                          { k: "Country",      v: add.country               },
                          { k: "Protocol",     v: add.protocol              },
                          { k: "Version",      v: add.version || null, mono: true },
                          { k: "Organization", v: add.organization, full: true  },
                        ].filter(r => r.v != null && r.v !== "").map(({ k, v, mono, full }) => (
                          <div key={k} className={cn(
                            "rounded-sm border p-3",
                            full ? "col-span-2 sm:col-span-3" : ""
                          )} style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">{k}</p>
                            <p className={cn("text-sm text-slate-200 leading-snug break-all", mono && "font-mono")}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                    </ExpandSection>
                  )}

                  {/* Statistics summary */}
                  {isStats && (
                    <ExpandSection label="Scan Statistics">
                      {add.query && (
                        <div className="mb-4 flex items-center gap-3 rounded-sm border px-4 py-2.5"
                          style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Query</span>
                          <span className="text-sm font-mono text-indigo-300">{add.query}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {Object.entries(add.statistics || {}).map(([k, v]) => (
                          <div key={k} className="rounded-sm border p-3 text-center"
                            style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                            <p className="text-2xl font-black text-slate-200 tabular-nums">{String(v)}</p>
                            <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1.5 leading-tight">
                              {k.replace(/_/g, " ")}
                            </p>
                          </div>
                        ))}
                      </div>
                      {(add.unique_cves?.length > 0) && (
                        <div className="mt-3 rounded-sm border p-3" style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CVEs Found</p>
                          <div className="flex flex-wrap gap-1.5">
                            {add.unique_cves.map((cve: string) => (
                              <span key={cve} className="text-[11px] font-mono text-rose-400 bg-rose-500/8 border border-rose-500/20 px-2 py-0.5 rounded-sm">{cve}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </ExpandSection>
                  )}

                  {/* Banner preview */}
                  {hasBanner && (
                    <ExpandSection label="Service Banner">
                      <pre className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all rounded-sm border p-4"
                        style={{ backgroundColor: "rgba(0,0,0,0.4)", borderColor: C.border, color: "#a3e4c7" }}>
                        {add.banner_preview}
                      </pre>
                    </ExpandSection>
                  )}

                  {/* NVD / CVSS */}
                  {nvd && (
                    <ExpandSection label="NVD — Vulnerability Intelligence">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { k: "CVSS Base",      v: nvd.cvss_base_score,       color: "text-slate-100" },
                            { k: "Severity",       v: nvd.cvss_severity?.toUpperCase(), color: "text-orange-400" },
                            { k: "Exploitability", v: nvd.exploitability_score,  color: "text-rose-400" },
                            { k: "Impact",         v: nvd.impact_score,          color: "text-amber-400" },
                          ].filter(r => r.v != null).map(({ k, v, color }) => (
                            <div key={k} className="rounded-sm border p-3 text-center"
                              style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                              <p className={cn("text-xl font-black tabular-nums", color)}>{String(v)}</p>
                              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1.5">{k}</p>
                            </div>
                          ))}
                        </div>
                        {nvd.cvss_v3?.vector_string && (
                          <div className="rounded-sm border px-4 py-3"
                            style={{ backgroundColor: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.15)" }}>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">CVSS v3 Vector</p>
                            <p className="font-mono text-[11px] text-indigo-300 break-all">{nvd.cvss_v3.vector_string}</p>
                          </div>
                        )}
                        {nvd.references?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                              External References ({nvd.references.length})
                            </p>
                            <div className="space-y-1.5 max-h-28 overflow-y-auto">
                              {nvd.references.map((r: any, i: number) => (
                                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-start gap-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                  <span className="break-all leading-snug">{r.url}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ExpandSection>
                  )}

                  {/* Generic evidence fallback */}
                  {!isHost && !isStats && !nvd && !hasBanner && add && Object.keys(add).length > 0 && (
                    <ExpandSection label="Evidence Data">
                      <div className="rounded-sm border p-4 font-mono text-xs overflow-x-auto"
                        style={{ backgroundColor: "rgba(0,0,0,0.3)", borderColor: C.border, color: "#94a3b8" }}>
                        <RecursiveEvidence data={add} />
                      </div>
                    </ExpandSection>
                  )}

                  {/* Mobile confidence */}
                  {pct > 0 && (
                    <div className="sm:hidden">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2">Confidence</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500/70 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{pct}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: meta panel */}
                <div className="space-y-5">
                  {finding.affected_asset && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Affected Asset</p>
                      <div className="rounded-sm border px-3 py-2.5 font-mono text-sm text-slate-200 break-all"
                        style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                        {finding.affected_asset}
                      </div>
                    </div>
                  )}

                  {finding.impact && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-orange-500/70">Impact</p>
                      <div className="rounded-sm border-l-2 border-orange-500/40 pl-3 py-1">
                        <p className="text-xs text-slate-300 leading-relaxed">{finding.impact}</p>
                      </div>
                    </div>
                  )}

                  {finding.recommendation && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-indigo-400/70">Recommended Action</p>
                      <div className="rounded-sm border-l-2 border-indigo-500/40 pl-3 py-1">
                        <p className="text-xs text-slate-300 leading-relaxed">{finding.recommendation}</p>
                      </div>
                    </div>
                  )}

                  {(finding.owasp_category || finding.sans_category) && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Framework Mapping</p>
                      <div className="space-y-1.5">
                        {finding.owasp_category && (
                          <div className="rounded-sm border px-2.5 py-2"
                            style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                            <p className="text-[9px] text-slate-600 uppercase mb-0.5">OWASP</p>
                            <p className="text-xs text-slate-300 font-mono">{finding.owasp_category}</p>
                          </div>
                        )}
                        {finding.sans_category && (
                          <div className="rounded-sm border px-2.5 py-2"
                            style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                            <p className="text-[9px] text-slate-600 uppercase mb-0.5">SANS / CWE</p>
                            <p className="text-xs text-slate-300 font-mono">{finding.sans_category.split(":")[0]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5">
                    {finding.source_tool && (
                      <div className="rounded-sm border px-3 py-2"
                        style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                        <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Source Tool</p>
                        <p className="text-xs text-slate-300">{finding.source_tool}</p>
                      </div>
                    )}
                    {finding.id && (
                      <div className="rounded-sm border px-3 py-2"
                        style={{ backgroundColor: C.surfaceHi, borderColor: C.border }}>
                        <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Finding ID</p>
                        <p className="text-[11px] font-mono text-slate-400">{finding.id}</p>
                      </div>
                    )}
                  </div>
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
// COMPLIANCE PANEL
// ─────────────────────────────────────────────────────────────────────

function CompliancePanel({ title, subtitle, passed, failed, total, categories, type, defaultOpen }: any) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const entries = sortCompliance(Object.entries(categories || {}));

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: C.surface, borderColor: C.border }}>

      {/* Header — always visible, clickable to collapse */}
      <button className="w-full text-left p-5 flex items-start gap-4" onClick={() => setOpen(!open)}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-bold text-slate-200">{title}</h3>
            {failed === 0
              ? <span className="text-[10px] font-black text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm uppercase tracking-wide">All Pass</span>
              : <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-sm uppercase tracking-wide">{failed} Failed</span>
            }
          </div>
          <p className="text-[10px] text-slate-600 mb-3">{subtitle}</p>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500/60 transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono text-slate-500 shrink-0 tabular-nums">{passed}/{total} pass</span>
          </div>
        </div>
        <div className="text-slate-600 mt-1 shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Category list */}
      {open && (
        <div className="border-t" style={{ borderColor: C.border }}>
          <div className="divide-y" style={{ divideColor: C.borderSub }}>
            {entries.map(([name, data]: [string, any]) => {
              const code = type === "owasp" ? owaspCode(name) : name.split(":")[0];
              const fullName = type === "owasp" ? owaspName(name) : name.split(":").slice(1).join(":").trim();
              return (
                <div key={name}
                  className="flex items-start gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  style={{ borderColor: C.borderSub }}>
                  {/* Status indicator */}
                  <div className="shrink-0 mt-0.5">
                    {data.safe
                      ? <div className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        </div>
                      : <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-rose-500/12 border border-rose-500/20">
                          <XCircle className="w-3 h-3 text-rose-500" />
                        </div>
                    }
                  </div>
                  {/* Code */}
                  <div className="shrink-0 w-10">
                    <span className="text-[10px] font-black font-mono text-slate-500">{code}</span>
                  </div>
                  {/* Full name */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-snug", data.safe ? "text-slate-500" : "text-slate-300 font-medium")}>
                      {fullName || name}
                    </p>
                    {!data.safe && data.count > 0 && (
                      <p className="text-[10px] text-rose-400/70 mt-0.5">{data.count} finding{data.count !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  {/* Pass/fail tag */}
                  <div className="shrink-0">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm",
                      data.safe ? "text-slate-600 bg-white/[0.03]" : "text-rose-400 bg-rose-500/10"
                    )}>
                      {data.status?.toUpperCase() || (data.safe ? "PASS" : "FAIL")}
                    </span>
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

// ─────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────

function FilterBtn({ label, count, active, onClick, sevKey }: any) {
  const cfg = sevKey ? SEV_CONFIG[sevKey as SevKey] : null;
  return (
    <button onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 h-7 rounded text-[11px] font-semibold transition-all border",
        active
          ? cfg
            ? cn(cfg.bg, cfg.text, cfg.border)
            : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
          : "text-slate-500 border-white/[0.07] hover:text-slate-300 hover:border-white/[0.12]"
      )}
      style={{ backgroundColor: active ? undefined : C.surfaceHi }}>
      {sevKey && <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEV_CONFIG[sevKey as SevKey].dot)} />}
      {label}
      <span className={cn("text-[9px] font-black tabular-nums",
        active ? "opacity-80" : "text-slate-600")}>
        {count}
      </span>
    </button>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">{label}</span>
    </div>
  );
}

function ExpandSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-1 rounded-full bg-indigo-500/60" />
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">{label}</p>
      </div>
      {children}
    </div>
  );
}

function MetaField({ label, value, mono, truncate }: { label: string; value?: string; mono?: boolean; truncate?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: C.borderSub }}>
      <span className="text-xs text-slate-500 capitalize shrink-0 leading-snug">{label}</span>
      <span className={cn(
        "text-xs text-right leading-snug",
        mono ? "font-mono text-slate-300" : "text-slate-200",
        truncate ? "truncate max-w-[160px]" : "break-all"
      )}>
        {value}
      </span>
    </div>
  );
}

function RecursiveEvidence({ data }: { data: any }) {
  if (typeof data !== "object" || data === null) return <span>{String(data)}</span>;
  return (
    <ul className="pl-3 border-l border-white/[0.06] space-y-1">
      {Object.entries(data).map(([k, v], i) => (
        <li key={i} className="flex flex-col sm:flex-row sm:gap-2">
          <span className="text-indigo-400/70 shrink-0">{k}:</span>
          <span className="text-slate-400 break-all">
            {typeof v === "object" ? <RecursiveEvidence data={v} /> : String(v)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatTs(ts: string) {
  try { return new Date(ts.replace(" ", "T")).toLocaleString(); } catch { return ts; }
}

function calcDuration(start: string, end: string) {
  try {
    const ms = new Date(end.replace(" ", "T")).getTime() - new Date(start.replace(" ", "T")).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  } catch { return "—"; }
}