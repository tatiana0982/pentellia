"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertTriangle, CheckCircle2, Info, Activity, Layers, FileText,
  Cpu, ChevronDown, ChevronUp, ArrowUp, Shield, ExternalLink,
  Clock, Target, Database, XCircle, Filter, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — Professional SIEM/SOC grade
// Reference: Splunk Enterprise Security, Microsoft Sentinel, Cortex XSIAM
// ─────────────────────────────────────────────────────────────────────

const T = {
  bg:       "#04050c",
  card:     "#08091a",
  cardHi:   "#0c0e1e",
  border:   "rgba(255,255,255,0.07)",
  borderLo: "rgba(255,255,255,0.04)",
  // Text — all pass WCAG AA on #04050c
  t1:  "#e8e8f4",  // primary — headings, values
  t2:  "#a0a0c0",  // secondary — body text, descriptions
  t3:  "#6a6a8a",  // muted — labels, captions
  t4:  "#3e3e58",  // faintest — dividers, placeholders
};

const SEV: Record<string, { label: string; hex: string; bg: string; text: string; border: string; dot: string; bar: string }> = {
  critical: { label:"CRITICAL", hex:"#e11d48", bg:"bg-rose-500/10",   text:"text-rose-400",   border:"border-rose-500/25",   dot:"bg-rose-500",   bar:"bg-rose-500"   },
  high:     { label:"HIGH",     hex:"#ea580c", bg:"bg-orange-500/10", text:"text-orange-400", border:"border-orange-500/25", dot:"bg-orange-500", bar:"bg-orange-500" },
  medium:   { label:"MEDIUM",   hex:"#ca8a04", bg:"bg-amber-500/10",  text:"text-amber-400",  border:"border-amber-500/25",  dot:"bg-amber-500",  bar:"bg-amber-500"  },
  low:      { label:"LOW",      hex:"#2563eb", bg:"bg-blue-500/10",   text:"text-blue-400",   border:"border-blue-500/25",   dot:"bg-blue-500",   bar:"bg-blue-500"   },
  info:     { label:"INFO",     hex:"#475569", bg:"bg-slate-600/10",  text:"text-slate-400",  border:"border-slate-500/20",  dot:"bg-slate-500",  bar:"bg-slate-500"  },
  unknown:  { label:"UNKNOWN",  hex:"#374151", bg:"bg-slate-700/10",  text:"text-slate-500",  border:"border-slate-700/20",  dot:"bg-slate-600",  bar:"bg-slate-600"  },
};

type SevKey = "critical" | "high" | "medium" | "low" | "info" | "unknown";
const ns = (s: string): SevKey => (SEV[s?.toLowerCase()] ? s.toLowerCase() as SevKey : "unknown");

// OWASP full names
const OWASP_MAP: Record<string, string> = {
  A01: "Broken Access Control",
  A02: "Security Misconfiguration",
  A03: "Software Supply Chain Failures",
  A04: "Cryptographic Failures",
  A05: "Injection",
  A06: "Insecure Design",
  A07: "Authentication Failures",
  A08: "Software & Data Integrity Failures",
  A09: "Security Logging & Alerting Failures",
  A10: "Server-Side Request Forgery (SSRF)",
};

const owaspCode = (k: string) => k.match(/(A\d+)/)?.[1] ?? k;
const owaspName = (k: string) => OWASP_MAP[owaspCode(k)] ?? k.split("-").slice(1).join("-").trim();
const sansCwe   = (k: string) => k.match(/(CWE-\d+)/)?.[1] ?? k.split(":")[0];
const sansName  = (k: string) => k.split(":").slice(1).join(":").trim();

function sortComp(entries: [string, any][]) {
  return [...entries].sort(([a], [b]) =>
    (parseInt(a.match(/\d+/)?.[0] ?? "0") - parseInt(b.match(/\d+/)?.[0] ?? "0"))
  );
}

// ─────────────────────────────────────────────────────────────────────
// SVG DONUT CHART — pure SVG, no deps
// ─────────────────────────────────────────────────────────────────────

function SeverityDonut({ counts, total }: { counts: Record<string, number>; total: number }) {
  const segs = (["critical","high","medium","low","info"] as SevKey[])
    .map(k => ({ k, count: counts[k] ?? 0, color: SEV[k].hex }))
    .filter(s => s.count > 0);

  if (total === 0 || segs.length === 0) return (
    <div className="w-28 h-28 rounded-full flex items-center justify-center"
      style={{ border: "2px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: T.t3, fontSize: 11 }}>No data</span>
    </div>
  );

  const r = 44, ir = 30, cx = 60, cy = 60;
  let angle = -Math.PI / 2;

  const paths = segs.map(s => {
    const sweep = (s.count / total) * 2 * Math.PI;
    const ea = angle + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const cos1 = Math.cos(angle), sin1 = Math.sin(angle);
    const cos2 = Math.cos(ea),    sin2 = Math.sin(ea);
    const path = sweep >= 2 * Math.PI - 0.001
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z M ${cx} ${cy - ir} A ${ir} ${ir} 0 1 0 ${cx - 0.01} ${cy - ir} Z`
      : `M ${cx+r*cos1} ${cy+r*sin1} A ${r} ${r} 0 ${large} 1 ${cx+r*cos2} ${cy+r*sin2} L ${cx+ir*cos2} ${cy+ir*sin2} A ${ir} ${ir} 0 ${large} 0 ${cx+ir*cos1} ${cy+ir*sin1} Z`;
    angle = ea;
    return { ...s, path };
  });

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {paths.map(p => (
        <path key={p.k} d={p.path} fill={p.color} fillOpacity={0.8} />
      ))}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="800" fill={T.t1}>{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fontWeight="600" fill={T.t3} letterSpacing="1">TOTAL</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// COMPLIANCE HEATMAP — grid of colored squares
// ─────────────────────────────────────────────────────────────────────

function ComplianceHeatmap({ entries, type, cols = 5 }: { entries: [string, any][]; type: string; cols?: number }) {
  const sorted = sortComp(entries);
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {sorted.map(([name, data]) => {
        const code  = type === "owasp" ? owaspCode(name) : sansCwe(name);
        const label = type === "owasp" ? owaspName(name) : sansName(name);
        const short = code.replace("A0","A").replace("CWE-","");
        return (
          <div key={name} title={`${code}: ${label}`}
            className="relative rounded-sm flex flex-col items-center justify-center cursor-default select-none"
            style={{
              backgroundColor: data.safe ? "rgba(255,255,255,0.03)" : "rgba(225,29,72,0.15)",
              border: `1px solid ${data.safe ? "rgba(255,255,255,0.05)" : "rgba(225,29,72,0.3)"}`,
              padding: "8px 4px",
              minHeight: 44,
            }}>
            <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: data.safe ? T.t3 : "#f87171", letterSpacing: "0.05em" }}>
              {short}
            </span>
            {!data.safe && (
              <div className="w-1 h-1 rounded-full bg-rose-500 mt-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RISK GAUGE — semi-circle SVG
// ─────────────────────────────────────────────────────────────────────

function RiskGauge({ score, level }: { score: number; level: string }) {
  const riskColor = score >= 80 ? "#e11d48" : score >= 50 ? "#ea580c" : score >= 20 ? "#ca8a04" : "#94a3b8";
  const r = 52, cx = 70, cy = 72;
  const startAngle = Math.PI;
  const sweepAngle = (score / 100) * Math.PI;
  const endAngle   = Math.PI + sweepAngle;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = sweepAngle > Math.PI ? 1 : 0;

  return (
    <svg width="140" height="86" viewBox="0 0 140 86">
      {/* Track */}
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
      {/* Fill */}
      {score > 0 && (
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none" stroke={riskColor} strokeWidth="8" strokeLinecap="round" />
      )}
      {/* Score */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="28" fontWeight="900" fill={riskColor}>{score}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fontWeight="700" fill={T.t3} letterSpacing="1.5">RISK SCORE</text>
      {/* Level */}
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="11" fontWeight="800" fill={riskColor} letterSpacing="0.5">{level}</text>
      {/* Scale markers */}
      <text x={cx - r - 4} y={cy + 14} textAnchor="middle" fontSize="8" fill={T.t4}>0</text>
      <text x={cx + r + 4} y={cy + 14} textAnchor="middle" fontSize="8" fill={T.t4}>100</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MINI BAR CHART — for port distribution, etc.
// ─────────────────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="font-mono text-[11px] shrink-0 w-24 truncate" style={{ color: T.t2 }}>{d.label}</span>
          <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
            <div className="h-full rounded-sm transition-all duration-500"
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, backgroundColor: d.color || "#6366f1" }} />
          </div>
          <span className="font-mono text-[11px] shrink-0 tabular-nums" style={{ color: T.t3 }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────

export function CommonScanReport({ data }: { data: any }) {
  const meta      = data?.meta     ?? {};
  const summary   = data?.summary  ?? {};
  const findings  = data?.findings ?? [];
  const coverage  = data?.tool_coverage  ?? {};
  const owaspComp = data?.owasp_compliance ?? {};
  const sansComp  = data?.sans_compliance  ?? {};
  const execSum   = data?.executive_summary;

  const riskScore = summary.risk_score  ?? 0;
  const riskLevel = (summary.risk_level || "Unknown").toUpperCase();

  const counts = useMemo(() => {
    const c = { critical:0, high:0, medium:0, low:0, info:0 };
    findings.forEach((f: any) => {
      const k = ns(f.severity) as keyof typeof c;
      if (k in c) c[k]++;
    });
    return c;
  }, [findings]);

  const [activeFilter, setActiveFilter] = useState<SevKey | "all">("all");
  const displayed = useMemo(() =>
    activeFilter === "all" ? findings : findings.filter((f: any) => ns(f.severity) === activeFilter),
  [findings, activeFilter]);

  const [activeSection, setActiveSection] = useState("overview");
  const scrollRef = useRef(false);

  const navTo = (id: string) => {
    scrollRef.current = true;
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
    setTimeout(() => { scrollRef.current = false; }, 1000);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (scrollRef.current) return;
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { rootMargin:"-80px 0px -60% 0px" });
    ["overview","findings","compliance","methodology"].forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const fn = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const hasCompliance = (owaspComp.total_categories > 0) || (sansComp.total_categories > 0);
  const isFiltered    = activeFilter !== "all";

  const NAV = [
    { id:"overview",    label:"Overview"    },
    { id:"findings",    label:"Findings",   badge: findings.length },
    ...(hasCompliance ? [{ id:"compliance", label:"Compliance" }] : []),
    { id:"methodology", label:"Methodology" },
  ];

  return (
    <div className="relative min-h-screen" style={{ backgroundColor:T.bg, color:T.t1, fontFamily:"'IBM Plex Sans','DM Sans','Inter',system-ui,sans-serif" }}>

      {/* ── STICKY NAV ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 backdrop-blur-xl" style={{ backgroundColor:`${T.bg}ec`, borderBottom:`1px solid ${T.border}` }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <nav className="flex items-end gap-0 h-11 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
            {NAV.map(({ id, label, badge }) => (
              <button key={id} onClick={() => navTo(id)}
                className="flex items-center gap-2 px-4 h-full text-xs font-semibold tracking-wide transition-all whitespace-nowrap border-b-2 relative"
                style={{
                  color: activeSection === id ? T.t1 : T.t3,
                  borderBottomColor: activeSection === id ? "#6366f1" : "transparent",
                }}>
                {label}
                {badge !== undefined && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded text-[9px] font-black tabular-nums text-center"
                    style={{ background: activeSection === id ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)", color: activeSection === id ? "#a5b4fc" : T.t3 }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 space-y-16">

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 — OVERVIEW
        ══════════════════════════════════════════════════════════════ */}
        <section id="overview" className="scroll-mt-14 space-y-8">

          {/* Top row: gauge + severity donut + severity breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* Risk Gauge */}
            <div className="rounded-sm border flex flex-col items-center justify-center py-5 px-4"
              style={{ backgroundColor:T.card, borderColor:T.border }}>
              <RiskGauge score={riskScore} level={riskLevel} />
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 w-full px-4">
                <div style={{ borderTop:`1px solid ${T.borderLo}`, paddingTop:8 }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:T.t3 }}>Findings</p>
                  <p className="text-base font-bold mt-0.5" style={{ color:T.t1 }}>{summary.total_findings ?? 0}</p>
                </div>
                <div style={{ borderTop:`1px solid ${T.borderLo}`, paddingTop:8 }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:T.t3 }}>Assets</p>
                  <p className="text-base font-bold mt-0.5" style={{ color:T.t1 }}>{summary.affected_assets ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Donut + legend */}
            <div className="rounded-sm border flex flex-col justify-center px-5 py-5"
              style={{ backgroundColor:T.card, borderColor:T.border }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color:T.t3 }}>Severity Distribution</p>
              <div className="flex items-center gap-5">
                <SeverityDonut counts={counts} total={findings.length} />
                <div className="space-y-2 flex-1">
                  {(["critical","high","medium","low","info"] as SevKey[]).map(k => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:SEV[k].hex }} />
                        <span className="text-[11px] font-semibold capitalize" style={{ color:T.t2 }}>{k}</span>
                      </div>
                      <span className="text-[11px] font-black tabular-nums font-mono"
                        style={{ color: counts[k] > 0 ? T.t1 : T.t4 }}>{counts[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Severity cards — clickable filters */}
            <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 xl:gap-2.5">
              {(["critical","high","medium","low","info"] as SevKey[]).map(k => {
                const cfg = SEV[k];
                const active = activeFilter === k;
                return (
                  <button key={k} onClick={() => setActiveFilter(active ? "all" : k)}
                    className="rounded-sm border text-left p-4 transition-all cursor-pointer hover:border-opacity-40"
                    style={{
                      backgroundColor: active ? `${cfg.hex}18` : T.card,
                      borderColor: active ? cfg.hex + "60" : T.border,
                    }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor:cfg.hex }} />
                      <span className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: active ? cfg.hex : T.t3 }}>{k}</span>
                    </div>
                    <p className="text-3xl font-black tabular-nums" style={{ color: counts[k] > 0 ? T.t1 : T.t4 }}>
                      {counts[k]}
                    </p>
                    {findings.length > 0 && (
                      <div className="mt-2.5 h-0.5 rounded-full" style={{ backgroundColor:"rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full"
                          style={{ backgroundColor:cfg.hex, opacity:0.7, width:`${Math.max((counts[k]/findings.length)*100,counts[k]>0?3:0)}%`, minWidth: counts[k]>0 ? 3 : 0 }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Executive summary */}
          {execSum && (
            <div className="rounded-sm border p-5" style={{ backgroundColor:T.card, borderColor:T.border }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:T.t3 }}>
                Assessment Summary
              </p>
              <p className="text-sm leading-relaxed" style={{ color:T.t2 }}>{execSum}</p>
            </div>
          )}

          {/* Top categories */}
          {summary.top_categories?.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:T.t4 }}>Top Categories</span>
              {summary.top_categories.map((cat: string) => (
                <span key={cat} className="text-[11px] font-semibold font-mono px-2.5 py-1 rounded-sm uppercase tracking-wide"
                  style={{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", color:"#a5b4fc" }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 — DETAILED FINDINGS
        ══════════════════════════════════════════════════════════════ */}
        <section id="findings" className="scroll-mt-14 space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color:T.t1 }}>Detailed Findings</h2>
              <p className="text-xs mt-1" style={{ color:T.t3 }}>
                {isFiltered
                  ? `${displayed.length} of ${findings.length} — filter: ${activeFilter.toUpperCase()}`
                  : `${findings.length} total · ${counts.critical} critical · ${counts.high} high · ${counts.medium} medium`
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterBtn label="All" count={findings.length} active={!isFiltered} onClick={() => setActiveFilter("all")} />
              {(["critical","high","medium","low","info"] as SevKey[]).filter(k => counts[k] > 0).map(k => (
                <FilterBtn key={k} label={k.toUpperCase()} count={counts[k]} active={activeFilter===k}
                  onClick={() => setActiveFilter(activeFilter===k ? "all" : k)} sevKey={k} />
              ))}
            </div>
          </div>

          {/* Active filter banner */}
          {isFiltered && (
            <div className="flex items-center justify-between rounded-sm px-4 py-2.5"
              style={{ background:`${SEV[activeFilter]?.hex}12`, border:`1px solid ${SEV[activeFilter]?.hex}30` }}>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" style={{ color: SEV[activeFilter]?.hex }} />
                <span className="text-xs font-semibold" style={{ color: SEV[activeFilter]?.hex }}>
                  Filtered: {activeFilter.toUpperCase()} — {displayed.length} finding{displayed.length !== 1 ? "s" : ""} visible
                </span>
              </div>
              <button className="text-[11px] font-bold px-2 py-0.5 rounded-sm transition-colors"
                style={{ color:T.t3, background:"rgba(255,255,255,0.06)" }}
                onClick={() => setActiveFilter("all")}>
                Clear
              </button>
            </div>
          )}

          {displayed.length === 0 ? (
            <div className="rounded-sm border border-dashed p-16 text-center" style={{ borderColor:T.border }}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3" style={{ color:T.t4 }} />
              <p className="font-medium" style={{ color:T.t3 }}>No findings match this filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((f: any, i: number) => (
                <FindingCard key={f.id || i} finding={f} index={i + 1} totalFindings={findings.length} />
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 — COMPLIANCE ASSESSMENT
        ══════════════════════════════════════════════════════════════ */}
        {hasCompliance && (
          <section id="compliance" className="scroll-mt-14 space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color:T.t1 }}>Compliance Assessment</h2>
              <p className="text-xs mt-1" style={{ color:T.t3 }}>
                Automated mapping against OWASP Top 10 (2025) and SANS/CWE Top 25
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {owaspComp.total_categories > 0 && (
                <CompliancePanel
                  title="OWASP Top 10"
                  subtitle="2025 Edition — Web Application Security Risks"
                  passed={owaspComp.passed} failed={owaspComp.failed} total={owaspComp.total_categories}
                  categories={owaspComp.categories} type="owasp" defaultOpen heatmapCols={5}
                />
              )}
              {sansComp.total_categories > 0 && (
                <CompliancePanel
                  title="SANS / CWE Top 25"
                  subtitle="Most Dangerous Software Weaknesses"
                  passed={sansComp.passed} failed={sansComp.failed} total={sansComp.total_categories}
                  categories={sansComp.categories} type="sans" defaultOpen={false} heatmapCols={5}
                />
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 4 — SCOPE & METHODOLOGY
        ══════════════════════════════════════════════════════════════ */}
        <section id="methodology" className="scroll-mt-14 space-y-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color:T.t1 }}>Scope & Methodology</h2>
            <p className="text-xs mt-1" style={{ color:T.t3 }}>
              Complete scan configuration, execution timeline, and engine coverage
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Scan Identity */}
            <div className="rounded-sm border p-5 space-y-4" style={{ backgroundColor:T.card, borderColor:T.border }}>
              <Label icon={<Target className="w-3.5 h-3.5" />} text="Scan Target" />
              <div className="space-y-0 divide-y" style={{ '--divide-color': T.borderLo } as any}>
                <MRow label="Target"   value={meta.target}           mono />
                <MRow label="Tool"     value={meta.tool || meta.scan_type} />
                <MRow label="Category" value={meta.category} />
                <MRow label="Scan ID"  value={meta.scan_id}          mono truncate />
                <MRow label="Profile"  value={meta.parameters?.scan_level || "Standard"} />
              </div>
            </div>

            {/* Execution Timeline */}
            <div className="rounded-sm border p-5 space-y-4" style={{ backgroundColor:T.card, borderColor:T.border }}>
              <Label icon={<Clock className="w-3.5 h-3.5" />} text="Execution Timeline" />
              <div className="space-y-0 divide-y">
                <MRow label="Started"    value={meta.started_at   ? fmtTs(meta.started_at)  : undefined} mono />
                <MRow label="Completed"  value={meta.completed_at ? fmtTs(meta.completed_at): undefined} mono />
                <MRow label="Duration"   value={meta.started_at && meta.completed_at ? calcDur(meta.started_at, meta.completed_at) : undefined} mono />
                {data?.scan_duration && <MRow label="Engine"   value={`${data.scan_duration}s`} mono />}
              </div>
              {/* Timeline visual */}
              {meta.started_at && meta.completed_at && (
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="flex-1 h-0.5" style={{ backgroundColor:T.borderLo }}>
                      <div className="h-full bg-indigo-500/50" style={{ width:"100%" }} />
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor:"#94a3b8" }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-mono" style={{ color:T.t4 }}>START</span>
                    <span className="text-[9px] font-mono" style={{ color:T.t4 }}>END</span>
                  </div>
                </div>
              )}
            </div>

            {/* Parameters */}
            <div className="rounded-sm border p-5 space-y-4" style={{ backgroundColor:T.card, borderColor:T.border }}>
              <Label icon={<Cpu className="w-3.5 h-3.5" />} text="Scan Parameters" />
              <div className="space-y-0 divide-y">
                {meta.parameters && Object.entries(meta.parameters)
                  .filter(([,v]) => v !== "" && v !== null && v !== undefined && v !== false)
                  .map(([k, v]) => <MRow key={k} label={k.replace(/_/g," ")} value={String(v)} mono />)
                }
                {(!meta.parameters || !Object.entries(meta.parameters).filter(([,v]) => v !== "" && v != null).length) && (
                  <p className="text-xs italic" style={{ color:T.t4 }}>Default parameters applied</p>
                )}
              </div>
            </div>
          </div>

          {/* Tool Coverage — full width */}
          <div className="rounded-sm border p-5" style={{ backgroundColor:T.card, borderColor:T.border }}>
            <Label icon={<Layers className="w-3.5 h-3.5" />} text="Tool Coverage & Engine Execution" />
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label:"Executed", tools:coverage.tools_executed, color:"#94a3b8",    dot:"#94a3b8"  },
                { label:"Failed",   tools:coverage.tools_failed,   color:"#f87171",    dot:"#e11d48"  },
                { label:"Skipped",  tools:coverage.tools_skipped,  color:"#fbbf24",    dot:"#ca8a04"  },
              ].map(({ label, tools, color, dot }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:T.t4 }}>{label}</p>
                  {tools?.length > 0
                    ? <div className="space-y-2">
                        {tools.map((t: string) => (
                          <div key={t} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor:dot }} />
                            <span className="font-mono" style={{ color }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    : <p className="text-xs italic" style={{ color:T.t4 }}>
                        {label === "Executed" ? "Single-engine assessment" : "None"}
                      </p>
                  }
                </div>
              ))}
            </div>
            {data?.raw_reference?.stored && (
              <div className="mt-5 pt-5 flex items-center gap-3" style={{ borderTop:`1px solid ${T.borderLo}` }}>
                <Database className="w-3 h-3 shrink-0" style={{ color:T.t4 }} />
                <p className="text-[11px]" style={{ color:T.t4 }}>
                  Raw results stored at <span className="font-mono" style={{ color:T.t3 }}>{data.raw_reference.location}</span>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── BACK TO TOP ─────────────────────────────────────────────── */}
      <button onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}
        aria-label="Back to top"
        className={cn("fixed z-50 transition-all duration-300", showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none")}
        style={{ bottom:24, right:24, width:36, height:36, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center",
          backgroundColor:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.3)", color:"#a5b4fc" }}>
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FINDING CARD — complete data display with index numbers
// ─────────────────────────────────────────────────────────────────────

function FindingCard({ finding, index, totalFindings }: { finding: any; index: number; totalFindings: number }) {
  const [open, setOpen] = useState(false);
  const sk  = ns(finding.severity);
  const cfg = SEV[sk];
  const add = finding.evidence?.additional ?? {};
  const nvd = add.nvd_enrichment;

  const isStats  = add.statistics !== undefined;
  const isHost   = !isStats && !!(add.ip || add.port || add.service);
  const hasBanner = !!add.banner_preview;
  const pct = Math.round((finding.confidence ?? 0) * 100);

  // Build port distribution for mini bar chart (stats findings)
  const portBars = useMemo(() => {
    if (!isStats || !add.statistics) return null;
    return null; // fallback — port data is in parent result, not per-finding
  }, [isStats, add]);

  const pad = String(index).padStart(2, "0");

  return (
    <div className="rounded-sm border overflow-hidden transition-colors"
      style={{ backgroundColor:T.card, borderColor: open ? "rgba(255,255,255,0.1)" : T.border }}>
      <div className="flex">
        {/* Severity stripe */}
        <div className="w-[3px] shrink-0" style={{ backgroundColor:cfg.hex }} />

        <div className="flex-1 min-w-0">
          {/* ── Collapsed header ── */}
          <button className="w-full text-left px-5 py-4 flex items-start gap-4 group"
            onClick={() => setOpen(!open)}>

            {/* Index number */}
            <span className="text-[11px] font-black font-mono shrink-0 mt-0.5 tabular-nums"
              style={{ color:T.t4, minWidth:22 }}>{pad}</span>

            {/* Severity badge + category */}
            <div className="flex flex-col gap-1.5 shrink-0 items-start pt-0.5">
              <span className={cn("text-[9px] font-black tracking-[0.12em] px-2 py-0.5 rounded-sm border", cfg.bg, cfg.text, cfg.border)}>
                {cfg.label}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color:T.t4 }}>{finding.category}</span>
            </div>

            {/* Title + description + asset (collapsed) + tags */}
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-semibold leading-snug transition-colors" style={{ color:T.t1 }}>
                {finding.title}
              </p>
              {/* Affected asset visible in collapsed state */}
              {finding.affected_asset && (
                <p className="text-[11px] font-mono mt-1" style={{ color:T.t3 }}>
                  {finding.affected_asset}
                </p>
              )}
              {!open && finding.description && (
                <p className="text-xs mt-1 line-clamp-1 leading-relaxed" style={{ color:T.t3 }}>{finding.description}</p>
              )}
              {finding.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {finding.tags.map((t: string) => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
                      style={{ backgroundColor:"rgba(255,255,255,0.04)", border:`1px solid ${T.borderLo}`, color:T.t3 }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Confidence + toggle */}
            <div className="flex items-center gap-5 shrink-0">
              {pct > 0 && (
                <div className="hidden sm:flex flex-col items-end gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color:T.t3 }}>Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor:"rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, backgroundColor:"#818cf8" }} />
                    </div>
                    <span className="text-[10px] font-mono tabular-nums" style={{ color:T.t2 }}>{pct}%</span>
                  </div>
                </div>
              )}
              <span className="transition-colors" style={{ color:T.t4 }}>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </div>
          </button>

          {/* ── Expanded body ── */}
          {open && (
            <div style={{ borderTop:`1px solid ${T.borderLo}`, backgroundColor:"#030409" }}>
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT: primary data col-span-2 */}
                <div className="lg:col-span-2 space-y-6">

                  <ESection label="Description">
                    <p className="text-sm leading-relaxed" style={{ color:T.t2 }}>{finding.description}</p>
                  </ESection>

                  {/* Mobile confidence */}
                  {pct > 0 && (
                    <div className="sm:hidden">
                      <ESection label="Confidence">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor:"rgba(255,255,255,0.06)" }}>
                            <div className="h-full" style={{ width:`${pct}%`, backgroundColor:"#818cf8" }} />
                          </div>
                          <span className="text-xs font-mono tabular-nums" style={{ color:T.t2 }}>{pct}%</span>
                        </div>
                      </ESection>
                    </div>
                  )}

                  {/* Shodan host intelligence */}
                  {isHost && (
                    <ESection label="Host Intelligence">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { k:"IP Address",   v:add.ip,           mono:true  },
                          { k:"Port",         v:add.port,         mono:true  },
                          { k:"Service",      v:add.service               },
                          { k:"Country",      v:add.country               },
                          { k:"Protocol",     v:add.protocol              },
                          { k:"Version",      v:add.version||null, mono:true },
                          { k:"Organization", v:add.organization, full:true  },
                        ].filter(r => r.v != null && r.v !== "").map(({ k, v, mono, full }) => (
                          <div key={k} className={cn("rounded-sm border p-3", full ? "col-span-2 sm:col-span-3":"")}
                            style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color:T.t4 }}>{k}</p>
                            <p className={cn("text-sm leading-snug break-all", mono?"font-mono":"")} style={{ color:T.t1 }}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                    </ESection>
                  )}

                  {/* Statistics summary (Shodan summary findings) */}
                  {isStats && (
                    <ESection label="Scan Statistics">
                      {add.query && (
                        <div className="mb-3 flex items-center gap-3 rounded-sm border px-4 py-2.5"
                          style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color:T.t3 }}>Query</span>
                          <span className="text-sm font-mono" style={{ color:"#a5b4fc" }}>{add.query}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                        {Object.entries(add.statistics || {}).map(([k, v]) => (
                          <div key={k} className="rounded-sm border p-3 text-center"
                            style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                            <p className="text-2xl font-black tabular-nums" style={{ color:T.t1 }}>{String(v)}</p>
                            <p className="text-[9px] uppercase tracking-wider mt-1.5 leading-tight" style={{ color:T.t3 }}>
                              {k.replace(/_/g," ")}
                            </p>
                          </div>
                        ))}
                      </div>
                      {/* Port distribution bar chart if available */}
                      {add.ports_data && (
                        <ESection label="Port Distribution">
                          <MiniBarChart data={Object.entries(add.ports_data || {}).map(([k,v]: any) => ({
                            label:`Port ${k}`, value:v, color:"#6366f1"
                          }))} />
                        </ESection>
                      )}
                      {add.unique_cves?.length > 0 && (
                        <div className="mt-3 rounded-sm border p-3" style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color:T.t3 }}>CVEs Found</p>
                          <div className="flex flex-wrap gap-1.5">
                            {add.unique_cves.map((cve: string) => (
                              <span key={cve} className="text-[11px] font-mono px-2 py-0.5 rounded-sm"
                                style={{ color:"#f87171", background:"rgba(225,29,72,0.1)", border:"1px solid rgba(225,29,72,0.25)" }}>{cve}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </ESection>
                  )}

                  {/* Service banner */}
                  {hasBanner && (
                    <ESection label="Service Banner">
                      <pre className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all rounded-sm border p-4"
                        style={{ backgroundColor:"rgba(0,0,0,0.5)", borderColor:T.borderLo, color:"#86efac" }}>
                        {add.banner_preview}
                      </pre>
                    </ESection>
                  )}

                  {/* NVD / CVSS block */}
                  {nvd && (
                    <ESection label="NVD — Vulnerability Intelligence">
                      <div className="space-y-4">
                        {/* CVSS score badge — prominent */}
                        {nvd.cvss_base_score != null && nvd.cvss_severity && (
                          <div className="flex items-center gap-3 p-3 rounded-sm border"
                            style={{ backgroundColor:"rgba(234,88,12,0.08)", borderColor:"rgba(234,88,12,0.2)" }}>
                            <span className="text-3xl font-black" style={{ color:"#fb923c" }}>{nvd.cvss_base_score}</span>
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider" style={{ color:"#fb923c" }}>{nvd.cvss_severity}</p>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color:T.t3 }}>CVSS Base Score</p>
                            </div>
                            {add.cve_id && (
                              <span className="ml-auto text-[11px] font-black font-mono px-2 py-1 rounded-sm"
                                style={{ color:"#f87171", background:"rgba(225,29,72,0.12)", border:"1px solid rgba(225,29,72,0.2)" }}>
                                {add.cve_id}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { k:"Exploitability", v:nvd.exploitability_score, c:"#fb923c" },
                            { k:"Impact",         v:nvd.impact_score,         c:"#f87171" },
                          ].filter(r => r.v != null).map(({ k, v, c }) => (
                            <div key={k} className="rounded-sm border p-3 text-center"
                              style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                              <p className="text-xl font-black tabular-nums" style={{ color:c }}>{String(v)}</p>
                              <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color:T.t3 }}>{k}</p>
                            </div>
                          ))}
                        </div>
                        {nvd.cvss_v3?.vector_string && (
                          <div className="rounded-sm border px-4 py-3"
                            style={{ backgroundColor:"rgba(99,102,241,0.05)", borderColor:"rgba(99,102,241,0.15)" }}>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color:T.t3 }}>CVSS v3 Vector</p>
                            <p className="font-mono text-[11px] break-all" style={{ color:"#a5b4fc" }}>{nvd.cvss_v3.vector_string}</p>
                          </div>
                        )}
                        {nvd.references?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color:T.t3 }}>
                              References ({nvd.references.length})
                            </p>
                            <div className="space-y-1.5 max-h-28 overflow-y-auto">
                              {nvd.references.map((r: any, i: number) => (
                                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-start gap-2 text-[11px] transition-colors"
                                  style={{ color:"#818cf8" }}>
                                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                  <span className="break-all leading-snug hover:underline">{r.url}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ESection>
                  )}

                  {/* Generic evidence fallback */}
                  {!isHost && !isStats && !nvd && !hasBanner && add && Object.keys(add).length > 0 && (
                    <ESection label="Evidence">
                      <div className="rounded-sm border p-4 font-mono text-xs overflow-x-auto"
                        style={{ backgroundColor:"rgba(0,0,0,0.35)", borderColor:T.borderLo, color:T.t2 }}>
                        <RecEvidence data={add} />
                      </div>
                    </ESection>
                  )}
                </div>

                {/* RIGHT: meta panel */}
                <div className="space-y-5">
                  {finding.affected_asset && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color:T.t3 }}>Affected Asset</p>
                      <div className="rounded-sm border px-3 py-2.5 font-mono text-sm break-all"
                        style={{ backgroundColor:T.cardHi, borderColor:T.borderLo, color:T.t1 }}>
                        {finding.affected_asset}
                      </div>
                    </div>
                  )}

                  {finding.impact && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2"
                        style={{ color:"rgba(234,88,12,0.7)" }}>Impact</p>
                      <div className="pl-3 py-1" style={{ borderLeft:"2px solid rgba(234,88,12,0.35)" }}>
                        <p className="text-xs leading-relaxed" style={{ color:T.t2 }}>{finding.impact}</p>
                      </div>
                    </div>
                  )}

                  {finding.recommendation && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2"
                        style={{ color:"rgba(99,102,241,0.7)" }}>Recommended Action</p>
                      <div className="pl-3 py-1" style={{ borderLeft:"2px solid rgba(99,102,241,0.35)" }}>
                        <p className="text-xs leading-relaxed" style={{ color:T.t2 }}>{finding.recommendation}</p>
                      </div>
                    </div>
                  )}

                  {(finding.owasp_category || finding.sans_category) && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color:T.t3 }}>Framework Mapping</p>
                      <div className="space-y-1.5">
                        {finding.owasp_category && (
                          <div className="rounded-sm border px-2.5 py-2"
                            style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                            <p className="text-[9px] uppercase mb-0.5" style={{ color:T.t4 }}>OWASP</p>
                            <p className="text-xs font-mono" style={{ color:T.t2 }}>{finding.owasp_category}</p>
                          </div>
                        )}
                        {finding.sans_category && (
                          <div className="rounded-sm border px-2.5 py-2"
                            style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                            <p className="text-[9px] uppercase mb-0.5" style={{ color:T.t4 }}>SANS/CWE</p>
                            <p className="text-xs font-mono" style={{ color:T.t2 }}>{finding.sans_category.split(":")[0]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    {finding.source_tool && (
                      <div className="rounded-sm border px-3 py-2"
                        style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                        <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color:T.t4 }}>Source</p>
                        <p className="text-xs" style={{ color:T.t2 }}>{finding.source_tool}</p>
                      </div>
                    )}
                    {finding.id && (
                      <div className="rounded-sm border px-3 py-2"
                        style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                        <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color:T.t4 }}>Finding ID</p>
                        <p className="text-[11px] font-mono" style={{ color:T.t3 }}>{finding.id}</p>
                      </div>
                    )}
                    {/* Finding position indicator */}
                    <div className="rounded-sm border px-3 py-2"
                      style={{ backgroundColor:T.cardHi, borderColor:T.borderLo }}>
                      <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color:T.t4 }}>Position</p>
                      <p className="text-xs font-mono" style={{ color:T.t3 }}>
                        {String(index).padStart(2,"0")} of {String(totalFindings).padStart(2,"0")}
                      </p>
                    </div>
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
// COMPLIANCE PANEL — heatmap + sortable detail list
// ─────────────────────────────────────────────────────────────────────

function CompliancePanel({ title, subtitle, passed, failed, total, categories, type, defaultOpen, heatmapCols }: any) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const [showList, setShowList] = useState(false);
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const entries = sortComp(Object.entries(categories || {}));
  const failedEntries = entries.filter(([,d]) => !d.safe);

  return (
    <div className="rounded-sm border overflow-hidden" style={{ backgroundColor:T.card, borderColor:T.border }}>

      {/* Header */}
      <button className="w-full text-left p-5 flex items-start gap-4" onClick={() => setOpen(!open)}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-sm font-bold" style={{ color:T.t1 }}>{title}</h3>
            {failed === 0
              ? <span className="text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide"
                  style={{ background:"rgba(255,255,255,0.05)", color:T.t3, border:`1px solid ${T.border}` }}>
                  {passed}/{total} Pass
                </span>
              : <span className="text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide"
                  style={{ background:"rgba(225,29,72,0.12)", color:"#f87171", border:"1px solid rgba(225,29,72,0.25)" }}>
                  {failed} Failed
                </span>
            }
          </div>
          <p className="text-[10px] mb-3" style={{ color:T.t4 }}>{subtitle}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor:"rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${pct}%`, backgroundColor: failed > 0 ? "#6366f1" : "#6366f1" }} />
            </div>
            <span className="text-[10px] font-mono shrink-0 tabular-nums" style={{ color:T.t3 }}>{pct}%</span>
          </div>
        </div>
        <span style={{ color:T.t4 }}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div style={{ borderTop:`1px solid ${T.borderLo}` }}>
          {/* Heatmap grid */}
          <div className="p-4">
            <ComplianceHeatmap entries={entries} type={type} cols={heatmapCols} />
            <p className="text-[9px] mt-2 text-center" style={{ color:T.t4 }}>
              Hover over a square to see the category name · Red = failed assessment
            </p>
          </div>

          {/* Failed entries — always show if any */}
          {failedEntries.length > 0 && (
            <div style={{ borderTop:`1px solid ${T.borderLo}` }}>
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"rgba(248,113,113,0.7)" }}>
                  Failed Categories ({failedEntries.length})
                </p>
              </div>
              <div>
                {failedEntries.map(([name, data]) => {
                  const code = type === "owasp" ? owaspCode(name) : sansCwe(name);
                  const full = type === "owasp" ? owaspName(name) : sansName(name);
                  return (
                    <div key={name} className="flex items-start gap-4 px-4 py-3"
                      style={{ borderTop:`1px solid ${T.borderLo}` }}>
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color:"#e11d48" }} />
                      <span className="text-[10px] font-black font-mono shrink-0 mt-0.5" style={{ color:"#f87171", minWidth:52 }}>{code}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color:T.t1 }}>{full}</p>
                        {data.count > 0 && (
                          <p className="text-[10px] mt-0.5" style={{ color:"rgba(248,113,113,0.6)" }}>
                            {data.count} finding{data.count !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full list toggle */}
          <button className="w-full px-4 py-3 text-xs font-semibold text-left transition-colors"
            style={{ borderTop:`1px solid ${T.borderLo}`, color:T.t3 }}
            onClick={() => setShowList(!showList)}>
            {showList ? "▲ Hide full list" : `▼ View all ${total} categories`}
          </button>

          {showList && (
            <div style={{ borderTop:`1px solid ${T.borderLo}` }}>
              {entries.map(([name, data]) => {
                const code = type === "owasp" ? owaspCode(name) : sansCwe(name);
                const full = type === "owasp" ? owaspName(name) : sansName(name);
                const truncFull = full.length > 48 ? full.slice(0,48)+"…" : full;
                return (
                  <div key={name} className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{ borderTop:`1px solid ${T.borderLo}` }}>
                    <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                      {data.safe
                        ? <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor:T.t4 }} />
                        : <XCircle className="w-3.5 h-3.5" style={{ color:"#e11d48" }} />
                      }
                    </div>
                    <span className="text-[10px] font-black font-mono shrink-0" style={{ color: data.safe ? T.t4 : "#f87171", minWidth:52 }}>{code}</span>
                    <span className="text-[11px] flex-1 min-w-0 truncate" title={full}
                      style={{ color: data.safe ? T.t3 : T.t1 }}>{truncFull}</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm shrink-0"
                      style={{
                        backgroundColor: data.safe ? "rgba(255,255,255,0.04)" : "rgba(225,29,72,0.1)",
                        color: data.safe ? T.t4 : "#f87171",
                      }}>
                      {data.safe ? "PASS" : "FAIL"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────

function FilterBtn({ label, count, active, onClick, sevKey }: any) {
  const cfg = sevKey ? SEV[sevKey] : null;
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 h-7 rounded-sm text-[11px] font-semibold transition-all border"
      style={{
        backgroundColor: active ? (cfg ? `${cfg.hex}18` : "rgba(99,102,241,0.12)") : T.cardHi,
        borderColor: active ? (cfg ? `${cfg.hex}55` : "rgba(99,102,241,0.3)") : T.border,
        color: active ? (cfg ? cfg.hex : "#a5b4fc") : T.t3,
      }}>
      {sevKey && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor:SEV[sevKey].hex }} />}
      {label}
      <span className="text-[9px] font-black tabular-nums" style={{ color: active ? "inherit" : T.t4 }}>{count}</span>
    </button>
  );
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color:T.t3 }}>{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color:T.t3 }}>{text}</span>
    </div>
  );
}

function ESection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor:"#6366f1" }} />
        <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color:T.t3 }}>{label}</p>
      </div>
      {children}
    </div>
  );
}

function MRow({ label, value, mono, truncate }: { label:string; value?:string; mono?:boolean; truncate?:boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderColor:T.borderLo }}>
      <span className="text-xs capitalize shrink-0 leading-snug" style={{ color:T.t3 }}>{label}</span>
      <span className={cn("text-xs text-right leading-snug", mono?"font-mono":"", truncate?"truncate max-w-[140px]":"break-all")}
        style={{ color: T.t1 }}>
        {value}
      </span>
    </div>
  );
}

function RecEvidence({ data }: { data: any }) {
  if (typeof data !== "object" || data === null) return <span>{String(data)}</span>;
  return (
    <ul className="pl-3 space-y-1" style={{ borderLeft:`1px solid ${T.borderLo}` }}>
      {Object.entries(data).map(([k, v], i) => (
        <li key={i} className="flex flex-col sm:flex-row sm:gap-2">
          <span style={{ color:"#818cf8", opacity:0.8 }}>{k}:</span>
          <span className="break-all" style={{ color:T.t2 }}>
            {typeof v === "object" ? <RecEvidence data={v} /> : String(v)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function fmtTs(ts: string) {
  try { return new Date(ts.replace(" ","T")).toLocaleString(); } catch { return ts; }
}

function calcDur(s: string, e: string) {
  try {
    const ms = new Date(e.replace(" ","T")).getTime() - new Date(s.replace(" ","T")).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
    return `${Math.floor(ms/60000)}m ${Math.round((ms%60000)/1000)}s`;
  } catch { return "—"; }
}