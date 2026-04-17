"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg:      "#06050f",
  card:    "#0d0b1a",
  cardHi:  "#120f22",
  border:  "rgba(120,80,255,0.15)",
  borderLo:"rgba(120,80,255,0.08)",
  // Text
  t1: "#f0eeff",
  t2: "#b0a8d8",
  t3: "#6b6390",
  t4: "#352f50",
  // Accents
  purple: "#8b5cf6",
  indigo: "#6366f1",
  glow:   "rgba(139,92,246,0.15)",
};

const SEV: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label:"CRITICAL", color:"#f87171", bg:"rgba(239,68,68,0.1)",  border:"rgba(239,68,68,0.3)"  },
  high:     { label:"HIGH",     color:"#fb923c", bg:"rgba(249,115,22,0.1)", border:"rgba(249,115,22,0.3)" },
  medium:   { label:"MEDIUM",   color:"#fbbf24", bg:"rgba(245,158,11,0.1)", border:"rgba(245,158,11,0.3)" },
  low:      { label:"LOW",      color:"#60a5fa", bg:"rgba(59,130,246,0.1)", border:"rgba(59,130,246,0.3)" },
  info:     { label:"INFO",     color:"#94a3b8", bg:"rgba(100,116,139,0.1)","border":"rgba(100,116,139,0.25)" },
  unknown:  { label:"UNKNOWN",  color:"#64748b", bg:"rgba(100,116,139,0.08)","border":"rgba(100,116,139,0.2)" },
};
const getSev = (s: string) => SEV[s?.toLowerCase()] ?? SEV.unknown;

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Severity = "critical"|"high"|"medium"|"low"|"info"|"unknown";

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  card: {
    background: `linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    boxShadow: `0 0 0 0 transparent, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(139,92,246,0.08)`,
  } as React.CSSProperties,
  cardHover: {
    border: `1px solid rgba(139,92,246,0.35)`,
    boxShadow: `0 0 20px rgba(139,92,246,0.12), 0 8px 32px rgba(0,0,0,0.5)`,
  } as React.CSSProperties,
  label: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase" as const, color: C.t3,
  },
  sectionTitle: {
    fontSize: 20, fontWeight: 600, color: C.t1, letterSpacing: "-0.02em",
  },
  badge: (color: string, bg: string, border: string) => ({
    display: "inline-flex", alignItems: "center",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    padding: "2px 8px", borderRadius: 4,
    color, background: bg, border: `1px solid ${border}`,
  }),
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function CommonScanReport({ data, aiSummary }: { data: any; aiSummary?: string }) {
  const meta           = data?.meta     || {};
  const summary        = data?.summary  || {};
  const allFindings    = data?.findings || [];
  const coverage       = data?.tool_coverage || {};
  const execSummary    = data?.executive_summary;
  const owaspCompliance= data?.owasp_compliance || null;
  const sansCompliance = data?.sans_compliance  || null;
  const rawReference   = data?.raw_reference    || null;

  const riskScore = summary.risk_score  || 0;
  const riskLevel = (summary.risk_level || "Unknown").toUpperCase();

  const allSeverities: Severity[] = ["critical","high","medium","low","info"];
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set(allSeverities));

  const counts = useMemo(() => {
    const c = { critical:0, high:0, medium:0, low:0, info:0 };
    allFindings.forEach((f: any) => {
      const s = (f.severity||"info").toLowerCase() as keyof typeof c;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [allFindings]);

  const isAllSelected = useMemo(() => allSeverities.every(s => severityFilter.has(s)), [severityFilter]);

  const isCleanSignal = (f: any): boolean =>
    !!f.title?.toLowerCase().includes("no breach") ||
    !!f.title?.toLowerCase().includes("no findings") ||
    !!f.title?.toLowerCase().includes("no exposure") ||
    !!f.title?.toLowerCase().includes("clean") ||
    !!f.tags?.includes("clean");

  const { primaryFindings, secondaryFindings } = useMemo(() => {
    const primary: any[] = [], secondary: any[] = [];
    allFindings.forEach((f: any) => {
      const sev = (f.severity||"unknown").toLowerCase() as Severity;
      if (severityFilter.has(sev)) {
        if ((sev==="low"||sev==="info") && !isCleanSignal(f)) secondary.push(f);
        else primary.push(f);
      }
    });
    return { primaryFindings: primary, secondaryFindings: secondary };
  }, [allFindings, severityFilter]);

  const isAllCleanResult = useMemo(() =>
    allFindings.length > 0 &&
    counts.critical===0 && counts.high===0 && counts.medium===0 && counts.low===0 &&
    allFindings.every((f: any) => isCleanSignal(f) || (f.severity||"info").toLowerCase()==="info"),
  [allFindings, counts]);

  const isOnlyLowInfoSelected = useMemo(() => {
    if (isAllSelected || severityFilter.size===0) return false;
    return Array.from(severityFilter).every(s => s==="low"||s==="info");
  }, [severityFilter, isAllSelected]);

  const toggleFilter = (sev: Severity) => setSeverityFilter(new Set([sev]));
  const selectAll = () => setSeverityFilter(new Set(allSeverities));

  const [activeSection, setActiveSection] = useState("executive");
  const isScrollingRef = useRef(false);
  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
    setTimeout(() => { isScrollingRef.current = false; }, 1000);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (isScrollingRef.current) return;
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { rootMargin:"-120px 0px -80% 0px" });
    ["executive","findings","methodology","compliance"].forEach(id => {
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

  // Risk color
  const riskColor = riskScore >= 80 ? "#f87171" : riskScore >= 50 ? "#fb923c" : riskScore >= 20 ? "#fbbf24" : "#60a5fa";

  const NAV_ITEMS = [
    { id:"executive",   label:"Executive Summary" },
    { id:"findings",    label:`Findings (${primaryFindings.length + secondaryFindings.length})` },
    { id:"methodology", label:"Methodology"        },
    ...(owaspCompliance||sansCompliance ? [{ id:"compliance", label:"Compliance" }] : []),
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.t1, fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif" }}>

      {/* ── STICKY NAV ─────────────────────────────────────────────────────── */}
      <div style={{
        position:"sticky", top:0, zIndex:50, backdropFilter:"blur(20px)",
        background:`${C.bg}f0`, borderBottom:`1px solid ${C.borderLo}`,
        boxShadow:"0 1px 0 rgba(139,92,246,0.08)",
      }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", gap:8, height:56, overflowX:"auto" }}>
          {NAV_ITEMS.map(({ id, label }) => (
            <button key={id} onClick={() => scrollToSection(id)}
              style={{
                padding:"6px 18px", borderRadius:999, border:"1px solid",
                fontSize:13, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap",
                transition:"all 0.15s",
                background: activeSection===id ? "rgba(139,92,246,0.2)" : "transparent",
                borderColor: activeSection===id ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.12)",
                color: activeSection===id ? C.t1 : C.t3,
                boxShadow: activeSection===id ? "0 0 16px rgba(139,92,246,0.25)" : "none",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px 120px", display:"flex", flexDirection:"column", gap:64 }}>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1: EXECUTIVE SUMMARY
        ══════════════════════════════════════════════════════════════════ */}
        <section id="executive" style={{ scrollMarginTop:80 }}>
          <div style={{ marginBottom:24 }}>
            <h2 style={{ ...S.sectionTitle, marginBottom:4 }}>Executive Summary</h2>
            <p style={{ color:C.t3, fontSize:13 }}>High-level overview of the security posture.</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16 }}>
            {/* Risk score card */}
            <div style={{ ...S.card, padding:32, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)`, pointerEvents:"none" }} />
              <div style={{ position:"relative", marginBottom:16 }}>
                {/* Spinning ring */}
                <div style={{
                  position:"absolute", inset:-8, borderRadius:"50%",
                  border:`2px solid ${C.borderLo}`,
                  animation:"spin 12s linear infinite",
                }} />
                <div style={{
                  width:128, height:128, borderRadius:"50%", background:C.bg,
                  border:`6px solid ${riskColor}`,
                  boxShadow:`0 0 24px ${riskColor}40, inset 0 0 24px rgba(0,0,0,0.5)`,
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                }}>
                  <span style={{ fontSize:42, fontWeight:800, color:riskColor, lineHeight:1 }}>{riskScore}</span>
                  <span style={{ fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:C.t3, marginTop:2 }}>Risk Score</span>
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:riskColor, letterSpacing:"0.1em" }}>{riskLevel} RISK</div>
            </div>

            {/* Assessment overview */}
            <div style={{ ...S.card, overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.borderLo}`, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.t2 }}>Assessment Overview</span>
              </div>
              <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
                <p style={{ fontSize:13, color:C.t2, lineHeight:1.6, background:"rgba(139,92,246,0.05)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:"12px 14px", margin:0 }}>
                  {execSummary || "The automated assessment has concluded. Review the findings below for specific vulnerabilities and remediation steps."}
                </p>

                {riskScore <= 5 && allFindings.length > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:8 }}>
                    <span style={{ fontSize:16 }}>✓</span>
                    <p style={{ margin:0, fontSize:12, color:"rgba(110,231,183,0.9)" }}>
                      <strong style={{ color:"#6ee7b7" }}>Scan completed successfully</strong> — no exposures detected.{" "}
                      {allFindings.length} finding{allFindings.length!==1?"s":""} confirmed clean security posture.
                    </p>
                  </div>
                )}

                {/* Stat grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:8 }}>
                  {[
                    { label:"Critical", count:summary.critical||0, color:"#f87171", bg:"rgba(239,68,68,0.08)" },
                    { label:"High",     count:summary.high||0,     color:"#fb923c", bg:"rgba(249,115,22,0.08)" },
                    { label:"Medium",   count:summary.medium||0,   color:"#fbbf24", bg:"rgba(245,158,11,0.08)" },
                    { label:"Low",      count:summary.low||0,      color:"#60a5fa", bg:"rgba(59,130,246,0.08)" },
                    { label:"Info",     count:summary.info||0,     color:C.t3,      bg:"rgba(139,92,246,0.06)" },
                    { label:"Total",    count:summary.total_findings||allFindings.length, color:C.t2, bg:"rgba(139,92,246,0.06)" },
                    { label:"Assets",   count:summary.affected_assets||0, color:C.t2, bg:"rgba(139,92,246,0.06)" },
                  ].map(({ label, count, color, bg }) => (
                    <div key={label} style={{ background:bg, border:`1px solid rgba(139,92,246,0.1)`, borderRadius:8, padding:"10px 6px", textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1 }}>{count}</div>
                      <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.08em", color:C.t3, marginTop:3 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {(summary.affected_assets !== undefined || summary.top_categories?.length > 0) && (
                  <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:12, color:C.t3 }}>
                      {summary.affected_assets||0} asset(s) · {summary.total_findings||allFindings.length} finding(s)
                    </span>
                    {summary.top_categories?.length > 0 && (
                      <span style={{ fontSize:10, fontFamily:"monospace", fontWeight:600, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:"0.08em", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", color:"#a5b4fc" }}>
                        Top: {summary.top_categories[0]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2: DETAILED FINDINGS
        ══════════════════════════════════════════════════════════════════ */}
        <section id="findings" style={{ scrollMarginTop:80 }}>

          {/* Intelligence summary elevation */}
          {allFindings.some((f: any) => f.category==="summary") && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(139,92,246,0.8)", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:10 }}>Intelligence Summary</div>
              {allFindings.filter((f: any) => f.category==="summary").map((f: any) => (
                <ExpandableFindingCard key={f.id||f.title} finding={f} />
              ))}
            </div>
          )}

          {/* All-clean banner */}
          {isAllCleanResult && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"16px 20px", background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:12, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:18 }}>✓</div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#6ee7b7" }}>Scan Completed — No Exposures Detected</p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:"rgba(110,231,183,0.55)", lineHeight:1.5 }}>
                  This target was assessed and returned a clean security posture. All findings below represent confirmed negative results — a positive security signal.
                </p>
              </div>
            </div>
          )}

          {/* Header + filters */}
          <div style={{ marginBottom:20 }}>
            <h2 style={{ ...S.sectionTitle, fontSize:18, marginBottom:14 }}>
              Detailed Findings
              {allFindings.length > 0 && <span style={{ marginLeft:10, fontSize:13, fontWeight:400, color:C.t3 }}>{allFindings.length} result{allFindings.length!==1?"s":""}</span>}
            </h2>

            {/* Filter pills */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"6px 8px", background:"rgba(139,92,246,0.05)", border:`1px solid ${C.borderLo}`, borderRadius:10, width:"fit-content" }}>
              {[
                { label:"All Findings", count:allFindings.length, key:"all" as const },
                { label:"Critical",     count:counts.critical,    key:"critical" as Severity },
                { label:"High",         count:counts.high,        key:"high"     as Severity },
                { label:"Medium",       count:counts.medium,      key:"medium"   as Severity },
                { label:"Low",          count:counts.low,         key:"low"      as Severity },
                { label:"Info",         count:counts.info,        key:"info"     as Severity },
              ].map(({ label, count, key }, i) => {
                const isAll = key==="all";
                const active = isAll ? isAllSelected : (!isAllSelected && severityFilter.has(key as Severity));
                const sev = isAll ? null : getSev(key as string);
                return (
                  <React.Fragment key={key}>
                    {i===1 && <div style={{ width:1, background:"rgba(139,92,246,0.15)", margin:"0 2px" }} />}
                    <button
                      onClick={() => isAll ? selectAll() : toggleFilter(key as Severity)}
                      style={{
                        padding:"5px 12px", borderRadius:6, border:"1px solid transparent",
                        fontSize:11, fontWeight:500, cursor:"pointer", transition:"all 0.12s",
                        background: active ? (sev ? sev.bg : "rgba(255,255,255,0.12)") : "transparent",
                        borderColor: active ? (sev ? sev.border : "rgba(255,255,255,0.3)") : "transparent",
                        color: active ? (sev ? sev.color : C.t1) : C.t3,
                      }}>
                      {label} <span style={{ opacity:0.6, fontSize:10 }}>({count})</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Grouped host view */}
          {(() => {
            const hostFindings = allFindings.filter((f: any) => f.evidence?.additional?.ip && f.evidence?.additional?.port && !f.evidence?.additional?.statistics);
            if (hostFindings.length < 2) return null;
            const groups: Record<string, any[]> = {};
            hostFindings.forEach((f: any) => { const ip = f.evidence.additional.ip; if (!groups[ip]) groups[ip]=[]; groups[ip].push(f); });
            const multiIp = Object.entries(groups).filter(([,arr]) => arr.length > 1);
            if (multiIp.length===0) return null;
            return (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(139,92,246,0.7)", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:10 }}>
                  Grouped Host View <span style={{ color:C.t4, fontSize:9 }}>({multiIp.length} host{multiIp.length!==1?"s":""})</span>
                </div>
                {multiIp.map(([ip, findings]) => (
                  <div key={ip} style={{ ...S.card, marginBottom:8, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderBottom:`1px solid ${C.borderLo}`, background:"rgba(139,92,246,0.05)" }}>
                      <span style={{ fontSize:10, color:C.t3, textTransform:"uppercase", letterSpacing:"0.1em" }}>Host</span>
                      <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:C.t1 }}>{ip}</span>
                      <span style={{ marginLeft:"auto", fontSize:10, color:C.t4 }}>{findings.length} port{findings.length!==1?"s":""}</span>
                    </div>
                    {findings.map((f: any, i: number) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"8px 16px", borderBottom: i<findings.length-1 ? `1px solid ${C.borderLo}` : "none" }}>
                        <span style={{ fontFamily:"monospace", fontSize:13, color:"#a78bfa", minWidth:50 }}>{f.evidence.additional.port}</span>
                        <span style={{ fontSize:12, color:C.t2 }}>{f.evidence.additional.service||"—"}</span>
                        {f.evidence.additional.country && <span style={{ marginLeft:"auto", fontSize:11, color:C.t4 }}>{f.evidence.additional.country}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Primary findings */}
          {(() => {
            const _hostIPs = new Set(allFindings.filter((f: any) => f.evidence?.additional?.ip && f.evidence?.additional?.port && !f.evidence?.additional?.statistics).map((f: any) => f.evidence.additional.ip));
            const _grouped = allFindings.filter((f: any) => { const ip = f.evidence?.additional?.ip; return ip && _hostIPs.has(ip) && !f.evidence?.additional?.statistics; });
            const _groupMap: Record<string, number> = {};
            _grouped.forEach((f: any) => { const ip = f.evidence.additional.ip; _groupMap[ip] = (_groupMap[ip]||0)+1; });
            const _hasMulti = Object.values(_groupMap).some(c => c > 1);
            const filtered = _hasMulti ? primaryFindings.filter((f: any) => { const ip = f.evidence?.additional?.ip; return !ip || !_groupMap[ip] || _groupMap[ip] < 2; }) : primaryFindings;
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filtered.length > 0 ? (
                  filtered.map((f: any, i: number) => <ExpandableFindingCard key={i} finding={f} />)
                ) : (severityFilter.size>0 && !isAllSelected && !isOnlyLowInfoSelected) ? (
                  <div style={{ padding:40, textAlign:"center", border:`1px dashed rgba(139,92,246,0.15)`, borderRadius:12, background:"rgba(139,92,246,0.02)" }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>✓</div>
                    <p style={{ margin:0, fontSize:14, fontWeight:500, color:C.t1 }}>No Issues Found</p>
                    <p style={{ margin:"6px 0 0", fontSize:12, color:C.t3 }}>No vulnerabilities match the current filter.</p>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {/* Secondary findings */}
          {secondaryFindings.length > 0 && (
            <div style={{ marginTop:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:600, color:C.t3, textTransform:"uppercase", letterSpacing:"0.1em" }}>Informational & Low Severity</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {secondaryFindings.map((f: any, i: number) => <ExpandableFindingCard key={i} finding={f} />)}
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3: METHODOLOGY
        ══════════════════════════════════════════════════════════════════ */}
        <section id="methodology" style={{ scrollMarginTop:80 }}>
          <h2 style={{ ...S.sectionTitle, fontSize:18, marginBottom:20 }}>Scope &amp; Methodology</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {/* Config profile */}
            <SCard title="Configuration Profile">
              <MRow label="Target Scope"  val={meta.target} />
              <MRow label="Scan Profile"  val={meta.parameters?.scan_level||"Standard"} />
              <MRow label="Started"       val={meta.started_at   ? new Date(meta.started_at.replace(" ","T")).toLocaleString()   : undefined} />
              <MRow label="Completed"     val={meta.completed_at ? new Date(meta.completed_at.replace(" ","T")).toLocaleString() : undefined} />
              <MRow label="Scan ID"       val={meta.scan_id}       mono />
              <MRow label="Scan Category" val={meta.category} />
              <MRow label="Scan Type"     val={meta.scan_type} />
              {Object.entries(meta.parameters||{}).filter(([k]) => k!=="scan_level").map(([k,v]) => (
                <MRow key={k} label={k.replace(/_/g," ").replace(/\b\w/g, (c:string)=>c.toUpperCase())} val={String(v)} mono />
              ))}
            </SCard>
            {/* Execution chain */}
            <SCard title="Execution Chain">
              {coverage.tools_executed?.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                  {coverage.tools_executed.map((t: string) => (
                    <div key={t} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:6, fontSize:11, fontFamily:"monospace", color:"#a5b4fc" }}>
                      ✓ {t}
                    </div>
                  ))}
                </div>
              )}
              {coverage.tools_failed?.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"rgba(248,113,113,0.6)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>Failed</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {coverage.tools_failed.map((t: string) => (
                      <div key={t} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:6, fontSize:11, fontFamily:"monospace", color:"#fca5a5" }}>
                        ✕ {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {coverage.tools_skipped?.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"rgba(251,191,36,0.6)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>Skipped</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {coverage.tools_skipped.map((t: string) => (
                      <div key={t} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:6, fontSize:11, fontFamily:"monospace", color:"#fde68a" }}>
                        ⊘ {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ borderTop:`1px solid ${C.borderLo}`, paddingTop:10, display:"flex", flexDirection:"column", gap:4 }}>
                <MRow label="Tools Executed" val={String(coverage.tools_executed?.length||0)} mono />
                <MRow label="Tools Failed"   val={String(coverage.tools_failed?.length||0)}   mono />
                <MRow label="Tools Skipped"  val={String(coverage.tools_skipped?.length||0)}  mono />
              </div>
            </SCard>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4: COMPLIANCE
        ══════════════════════════════════════════════════════════════════ */}
        {(owaspCompliance || sansCompliance) && (
          <section id="compliance" style={{ scrollMarginTop:80 }}>
            <h2 style={{ ...S.sectionTitle, fontSize:18, marginBottom:6 }}>Compliance &amp; Framework Mapping</h2>
            <p style={{ color:C.t3, fontSize:13, marginBottom:20 }}>Automated mapping against OWASP Top 10 (2025) and SANS/CWE Top 25</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {owaspCompliance && <ComplianceBlock title="OWASP Top 10 — 2025" passed={owaspCompliance.passed} failed={owaspCompliance.failed} total={owaspCompliance.total_categories} categories={owaspCompliance.categories} type="owasp" />}
              {sansCompliance  && <ComplianceBlock title="SANS / CWE Top 25"   passed={sansCompliance.passed}  failed={sansCompliance.failed}  total={sansCompliance.total_categories}  categories={sansCompliance.categories}  type="sans"  />}
            </div>
          </section>
        )}

        {/* Technical metadata */}
        {(meta.scan_id || rawReference) && (
          <section>
            <div style={{ fontSize:10, fontWeight:700, color:C.t4, textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:12 }}>Technical Metadata</div>
            <SCard>
              <MRow label="Scan ID"               val={meta.scan_id}         mono />
              <MRow label="Scan Category"          val={meta.category} />
              <MRow label="Scan Type"              val={meta.scan_type} />
              <MRow label="Raw Reference Location" val={rawReference?.location} mono />
              {rawReference?.stored !== undefined && <MRow label="Raw Results Stored" val={rawReference.stored ? "Yes" : "No"} />}
            </SCard>
          </section>
        )}
      </div>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}
        aria-label="Back to top"
        style={{
          position:"fixed", bottom:24, right:24, zIndex:50,
          width:44, height:44, borderRadius:"50%", border:"1px solid rgba(139,92,246,0.5)",
          background:"rgba(139,92,246,0.25)", backdropFilter:"blur(12px)",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          color:C.t1, fontSize:18, transition:"all 0.25s",
          boxShadow:"0 0 20px rgba(139,92,246,0.4)",
          opacity: showTop ? 1 : 0,
          transform: showTop ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
          pointerEvents: showTop ? "auto" : "none",
        }}>
        ↑
      </button>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── FINDING CARD ─────────────────────────────────────────────────────────────
function ExpandableFindingCard({ finding }: { finding: any }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const severity = (finding.severity||"info").toLowerCase();
  const sev = getSev(severity);

  const isClean =
    !!finding.title?.toLowerCase().includes("no breach") ||
    !!finding.title?.toLowerCase().includes("no findings") ||
    !!finding.title?.toLowerCase().includes("no exposure") ||
    !!finding.title?.toLowerCase().includes("clean") ||
    !!finding.tags?.includes("clean");

  const isSummary = finding.category === "summary";

  const borderColor = isClean ? "rgba(52,211,153,0.25)"
    : isSummary ? "rgba(139,92,246,0.3)"
    : hovered   ? "rgba(139,92,246,0.25)"
    : "rgba(139,92,246,0.12)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:`linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`,
        border:`1px solid ${borderColor}`,
        borderRadius:12, overflow:"hidden",
        boxShadow: hovered ? "0 0 20px rgba(139,92,246,0.1), 0 4px 20px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.3)",
        transition:"all 0.18s",
      }}>
      {/* Collapsed header */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:14 }}>
        {/* Icon */}
        <div style={{
          width:38, height:38, borderRadius:9, flexShrink:0, marginTop:1,
          background: isClean ? "rgba(52,211,153,0.1)" : sev.bg,
          border:`1px solid ${isClean ? "rgba(52,211,153,0.25)" : sev.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:16,
        }}>
          {isClean ? "✓" : severity==="critical"||severity==="high" ? "⚠" : "ℹ"}
        </div>
        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:6, marginBottom:4 }}>
            {isClean ? (
              <span style={{ ...S.badge("rgba(110,231,183,0.9)", "rgba(52,211,153,0.1)", "rgba(52,211,153,0.3)") }}>Secure</span>
            ) : (
              <span style={{ ...S.badge(sev.color, sev.bg, sev.border) }}>{sev.label}</span>
            )}
            {finding.category && (
              <span style={{ ...S.badge(
                isSummary ? "#a78bfa" : C.t3,
                isSummary ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)",
                isSummary ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.08)"
              )}}>{isSummary ? "Summary" : finding.category}</span>
            )}
            <span style={{ fontSize:14, fontWeight:600, color:C.t1 }}>{finding.title}</span>
          </div>
          {isClean && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:11, color:"rgba(110,231,183,0.55)" }}>Secure / No Exposure Detected</span>
              <span style={{ ...S.badge("rgba(110,231,183,0.8)", "rgba(52,211,153,0.08)", "rgba(52,211,153,0.2)"), fontSize:9 }}>Clean Result</span>
            </div>
          )}
          {finding.source_tool && (
            <span style={{ ...S.badge("#c4b5fd", "rgba(139,92,246,0.1)", "rgba(139,92,246,0.25)"), marginBottom:4, display:"inline-flex" }}>
              {finding.source_tool}
            </span>
          )}
          {!expanded && finding.description && (
            <p style={{ margin:0, fontSize:12, color:C.t3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>
              {finding.description}
            </p>
          )}
        </div>
        {/* Confidence */}
        <div title="Confidence: likelihood accuracy of this finding" style={{ flexShrink:0, textAlign:"right", marginRight:8 }}>
          <div style={{ fontSize:10, color:C.t4, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Confidence</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:60, height:5, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"#6ee7b7", width:`${Math.round((finding.confidence||0)*100)}%`, borderRadius:99 }} />
            </div>
            <span style={{ fontSize:11, fontFamily:"monospace", color:C.t2 }}>{Math.round((finding.confidence||0)*100)}%</span>
          </div>
        </div>
        <span style={{ color:C.t4, fontSize:16, flexShrink:0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded body */}
      {expanded && (() => {
        const nvd   = finding.evidence?.additional?.nvd_enrichment;
        const cveId = finding.evidence?.additional?.cve_id;
        const refs: Array<{ url: string }> = nvd?.references || [];
        const add   = finding.evidence?.additional || {};
        const isCVE    = !!add.nvd_enrichment || !!add.cve_id;
        const isBreach = !isCVE && (finding.tags?.some((t: string) => ["breach","credentials"].includes(t)) || !!(add.source||add.fields_exposed));
        const isHost   = !isCVE && !isBreach && !!(add.ip||add.port||add.service) && !add.statistics;
        const isStats  = !isCVE && !isBreach && !!add.statistics;

        return (
          <div style={{ borderTop:`1px solid ${C.borderLo}`, padding:"18px 18px 18px 18px", display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
            {/* Left */}
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <EBlock title="Description">
                <p style={{ margin:0, fontSize:13, color:C.t2, lineHeight:1.6 }}>{finding.description}</p>
              </EBlock>

              {/* NVD CVSS block */}
              {nvd && (
                <EBlock title="NVD Vulnerability Intelligence" accent="indigo">
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#818cf8" }} />
                    <span style={{ fontSize:10, fontWeight:700, color:"#a5b4fc", textTransform:"uppercase", letterSpacing:"0.12em" }}>NVD Intelligence</span>
                    {cveId && <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:10, fontWeight:700, color:"#f87171", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", padding:"2px 8px", borderRadius:4 }}>{cveId}</span>}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
                    {nvd.cvss_base_score != null && <ScoreTile value={String(nvd.cvss_base_score)} label="CVSS Base" color={C.t1} />}
                    {nvd.cvss_severity    && <ScoreTile value={nvd.cvss_severity.toUpperCase()}    label="Severity"  color={getSev(nvd.cvss_severity).color} />}
                    {nvd.exploitability_score != null && <ScoreTile value={String(nvd.exploitability_score)} label="Exploitability" color="#fb923c" />}
                    {nvd.impact_score     != null && <ScoreTile value={String(nvd.impact_score)}    label="Impact"   color="#f87171" />}
                  </div>
                  {nvd.cvss_v3?.vector_string && (
                    <div style={{ background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.15)", borderRadius:6, padding:"8px 12px", fontFamily:"monospace", fontSize:11, color:"#a5b4fc", wordBreak:"break-all", marginBottom:10 }}>
                      {nvd.cvss_v3.vector_string}
                    </div>
                  )}
                  {/* Affected hosts */}
                  {add.affected_hosts?.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <ELabel>Affected Hosts ({add.affected_hosts.length})</ELabel>
                      {add.affected_hosts.map((h: any, i: number) => (
                        <div key={i} style={{ display:"flex", gap:10, alignItems:"center", background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:6, padding:"6px 10px", marginBottom:4 }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, color:"#a5b4fc" }}>{h.ip}:{h.port}</span>
                          <span style={{ fontSize:11, color:C.t2 }}>{h.service}</span>
                          {h.version && <span style={{ fontFamily:"monospace", fontSize:10, color:C.t3 }}>v{h.version}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Products */}
                  {nvd.affected_products?.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <ELabel>Affected Products</ELabel>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {nvd.affected_products.slice(0,8).map((p: string) => <Chip key={p}>{p}</Chip>)}
                        {nvd.affected_products.length > 8 && <span style={{ fontSize:11, color:C.t4 }}>+{nvd.affected_products.length-8} more</span>}
                      </div>
                    </div>
                  )}
                  {nvd.weaknesses?.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <ELabel>Weaknesses</ELabel>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {nvd.weaknesses.map((w: string) => <span key={w} style={{ fontFamily:"monospace", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4, color:"#fcd34d", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)" }}>{w}</span>)}
                      </div>
                    </div>
                  )}
                  {nvd.github_pocs?.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <ELabel style={{ color:"rgba(248,113,113,0.7)" }}>Public Exploit PoCs — GitHub ({nvd.github_pocs.length})</ELabel>
                      {nvd.github_pocs.map((poc: any, i: number) => (
                        <a key={i} href={poc.url} target="_blank" rel="noopener noreferrer"
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.18)", borderRadius:6, marginBottom:4, textDecoration:"none", gap:10 }}>
                          <div style={{ minWidth:0 }}>
                            <p style={{ margin:0, fontFamily:"monospace", fontSize:12, color:"#fca5a5", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{poc.name}</p>
                            {poc.description && <p style={{ margin:"2px 0 0", fontSize:11, color:C.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{poc.description}</p>}
                          </div>
                          <span style={{ flexShrink:0, fontSize:11, color:"#fde68a" }}>★ {poc.stars}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {nvd.exploit_references?.length > 0 && (
                    <div style={{ marginBottom:10 }}>
                      <ELabel style={{ color:"rgba(251,146,60,0.7)" }}>Exploit References ({nvd.exploit_references.length})</ELabel>
                      {nvd.exploit_references.map((r: any, i: number) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", fontSize:11, color:"#fb923c", textDecoration:"none", marginBottom:3, wordBreak:"break-all" }}>{r.url}</a>
                      ))}
                    </div>
                  )}
                  {nvd.patch_references?.slice(0,4).map((r: any, i: number) => null)}
                  {nvd.patch_references?.length > 0 && (
                    <div style={{ marginBottom:10 }}>
                      <ELabel style={{ color:"rgba(110,231,183,0.6)" }}>Patch References ({nvd.patch_references.length})</ELabel>
                      {nvd.patch_references.slice(0,4).map((r: any, i: number) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", fontSize:11, color:"#6ee7b7", textDecoration:"none", marginBottom:3, wordBreak:"break-all" }}>{r.url}</a>
                      ))}
                    </div>
                  )}
                  {(nvd.published_date||nvd.last_modified) && (
                    <div style={{ display:"flex", gap:16, fontSize:11, color:C.t4 }}>
                      {nvd.published_date && <span>Published: <span style={{ fontFamily:"monospace" }}>{nvd.published_date.split("T")[0]}</span></span>}
                      {nvd.last_modified  && <span>Modified: <span style={{ fontFamily:"monospace" }}>{nvd.last_modified.split("T")[0]}</span></span>}
                    </div>
                  )}
                  {refs.length > 0 && (
                    <div style={{ marginTop:10 }}>
                      <ELabel>References ({refs.length})</ELabel>
                      <div style={{ maxHeight:120, overflowY:"auto" }}>
                        {refs.map((r,i) => (
                          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", fontSize:11, color:"#818cf8", marginBottom:3, textDecoration:"none", wordBreak:"break-all" }}>{r.url}</a>
                        ))}
                      </div>
                    </div>
                  )}
                </EBlock>
              )}

              {/* Breach intel */}
              {isBreach && (
                <EBlock title="Breach Record Details">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, background:"rgba(0,0,0,0.25)", border:`1px solid ${C.borderLo}`, borderRadius:8, overflow:"hidden" }}>
                    {add.source        && <BCell label="Source"    val={add.source}     color="#fca5a5" />}
                    {add.record_count  != null && <BCell label="Records"   val={String(add.record_count)} large />}
                    {add.has_passwords != null && <BCell label="Passwords" val={add.has_passwords ? "Exposed" : "Not found"} color={add.has_passwords ? "#f87171" : C.t3} />}
                    {add.has_hashes    != null && <BCell label="Hashes"    val={add.has_hashes ? "Present" : "None"} color={add.has_hashes ? "#fb923c" : C.t3} />}
                  </div>
                  {add.fields_exposed?.length > 0 && (
                    <div style={{ marginTop:10 }}>
                      <ELabel>Fields Exposed</ELabel>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {add.fields_exposed.map((f: string) => (
                          <span key={f} style={{ fontFamily:"monospace", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", color:"#fca5a5", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)" }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </EBlock>
              )}

              {/* Breach summary */}
              {!isBreach && !isCVE && !isHost && !isStats && add.records_returned !== undefined && (
                <EBlock title="Breach Intelligence Summary">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                    {[
                      { k:"Total Results",    v:add.total_results    },
                      { k:"Records Returned", v:add.records_returned },
                      { k:"Source Count",     v:add.source_count     },
                    ].filter(r => r.v !== undefined).map(({ k, v }) => (
                      <div key={k} style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:12, textAlign:"center" }}>
                        <div style={{ fontSize:22, fontWeight:800, color:C.t1 }}>{String(v)}</div>
                        <div style={{ fontSize:9, color:C.t3, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:3 }}>{k}</div>
                      </div>
                    ))}
                  </div>
                  {add.has_passwords !== undefined && (
                    <div style={{ display:"flex", gap:8 }}>
                      <span style={{ fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:6, border:"1px solid", color:add.has_passwords?"#fca5a5":C.t3, borderColor:add.has_passwords?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.1)", background:add.has_passwords?"rgba(239,68,68,0.08)":"rgba(255,255,255,0.03)" }}>
                        Passwords {add.has_passwords?"Exposed":"Not Found"}
                      </span>
                      <span style={{ fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:6, border:"1px solid", color:add.has_hashes?"#fcd34d":C.t3, borderColor:add.has_hashes?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.1)", background:add.has_hashes?"rgba(245,158,11,0.08)":"rgba(255,255,255,0.03)" }}>
                        Hashes {add.has_hashes?"Present":"Not Found"}
                      </span>
                    </div>
                  )}
                </EBlock>
              )}

              {/* Shodan host */}
              {isHost && (
                <EBlock title="Host Intelligence">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {[
                      { k:"IP Address",   v:add.ip,           mono:true, full:false },
                      { k:"Port",         v:add.port,         mono:true, full:false },
                      { k:"Service",      v:add.service,      mono:false, full:false },
                      { k:"Country",      v:add.country,      mono:false, full:false },
                      { k:"Organization", v:add.organization, mono:false, full:true  },
                      { k:"Version",      v:add.version||null, mono:true, full:false },
                    ].filter(r => r.v != null && r.v !== "").map(({ k, v, mono, full }) => (
                      <div key={k} style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:10, gridColumn: full?"1 / -1":"auto" }}>
                        <div style={{ ...S.label, marginBottom:4 }}>{k}</div>
                        <div style={{ fontSize:13, color:C.t1, wordBreak:"break-all", fontFamily: mono ? "monospace" : undefined }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                  {add.banner_preview && (
                    <div style={{ marginTop:12 }}>
                      <ELabel>Service Banner</ELabel>
                      <pre style={{ margin:0, fontFamily:"monospace", fontSize:11, color:"#6ee7b7", background:"rgba(0,0,0,0.4)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:12, overflowX:"auto", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
                        {add.banner_preview}
                      </pre>
                    </div>
                  )}
                </EBlock>
              )}

              {/* Shodan stats */}
              {isStats && (
                <EBlock title="Scan Statistics">
                  {add.query && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:"8px 12px", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ ...S.label }}>Query</span>
                        <span style={{ fontFamily:"monospace", fontSize:13, color:"#a5b4fc" }}>{add.query}</span>
                      </div>
                      {add.statistics && (
                        <span style={{ fontSize:12, color:"#818cf8", flexShrink:0 }}>
                          {add.statistics.unique_ips ?? 0} host(s) · {add.statistics.unique_ports ?? 0} port(s)
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                    {Object.entries(add.statistics).map(([k, v]) => (
                      <div key={k} style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:10, textAlign:"center" }}>
                        <div style={{ fontSize:20, fontWeight:800, color:C.t1 }}>{String(v)}</div>
                        <div style={{ fontSize:9, color:C.t3, textTransform:"uppercase", letterSpacing:"0.08em", marginTop:3 }}>
                          {k.replace(/_/g," ").replace(/\b\w/g, (ch: string) => ch.toUpperCase())}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:10, marginBottom:8 }}>
                    <div style={{ ...S.label, marginBottom:6 }}>{add.unique_cves?.length > 0 ? `CVEs Found (${add.unique_cves.length})` : "CVEs Detected"}</div>
                    {add.unique_cves?.length > 0 ? (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {add.unique_cves.map((cve: string) => (
                          <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily:"monospace", fontSize:11, padding:"2px 8px", borderRadius:4, color:"#f87171", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", textDecoration:"none" }}>
                            {cve}
                          </a>
                        ))}
                      </div>
                    ) : <span style={{ fontSize:12, color:C.t3 }}>0 CVEs detected</span>}
                  </div>
                  {add.exposed_services !== undefined && (
                    <div style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:10, marginBottom:8 }}>
                      <div style={{ ...S.label, marginBottom:6 }}>Exposed Services {add.exposed_services?.length > 0 ? `(${add.exposed_services.length})` : ""}</div>
                      {add.exposed_services?.length > 0
                        ? <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{add.exposed_services.map((s: string, i: number) => <Chip key={i}>{s}</Chip>)}</div>
                        : <span style={{ fontSize:12, color:C.t3 }}>None detected</span>
                      }
                    </div>
                  )}
                  {add.vulnerable_host_count !== undefined && (
                    <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, padding:"8px 12px" }}>
                      <span style={{ ...S.label }}>Vulnerable Hosts</span>
                      <span style={{ fontSize:14, fontWeight:800, color: add.vulnerable_host_count > 0 ? "#f87171" : C.t2 }}>{add.vulnerable_host_count}</span>
                      {add.vulnerable_host_count === 0 && <span style={{ fontSize:11, color:C.t4 }}>— none affected</span>}
                    </div>
                  )}
                </EBlock>
              )}

              {/* Generic fallback */}
              {!isCVE && !isBreach && !isHost && !isStats && add.records_returned === undefined && finding.evidence && (
                <EBlock title="Evidence">
                  {(() => {
                    const knownKeys = ["ip","port","service","statistics","cve_id","nvd_enrichment","banner_preview","country","organization","version","protocol","source","fields_exposed","has_passwords","has_hashes","record_count","records_returned","source_count","total_results","unique_sources"];
                    const allKeys = Object.keys(add);
                    const hasUnknown = allKeys.some(k => !knownKeys.includes(k));
                    const displayData = hasUnknown ? add : finding.evidence;
                    const entries = Object.entries(displayData||{}).filter(([k]) => k!=="tool");
                    if (!entries.length) return null;
                    return (
                      <div style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${C.borderLo}`, borderRadius:8, overflow:"hidden" }}>
                        {entries.map(([k, v]) => (
                          <div key={k} style={{ display:"flex", gap:12, padding:"8px 12px", borderBottom:`1px solid ${C.borderLo}` }}>
                            <span style={{ ...S.label, minWidth:140, paddingTop:1 }}>{k.replace(/_/g," ")}</span>
                            <span style={{ fontFamily:"monospace", fontSize:11, color:C.t2, wordBreak:"break-all" }}>
                              {typeof v==="object" ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </EBlock>
              )}
            </div>

            {/* Right panel */}
            <div style={{ display:"flex", flexDirection:"column", gap:14, borderLeft:`1px solid ${C.borderLo}`, paddingLeft:20 }}>
              {finding.affected_asset && (
                <div>
                  <ELabel>Affected Asset</ELabel>
                  <div style={{ fontFamily:"monospace", fontSize:12, color:"#c4b5fd", background:"rgba(139,92,246,0.07)", border:"1px solid rgba(139,92,246,0.18)", borderRadius:6, padding:"6px 10px", wordBreak:"break-all" }}>{finding.affected_asset}</div>
                </div>
              )}
              {finding.impact && (
                <div>
                  <ELabel style={{ color:"rgba(251,146,60,0.7)" }}>Impact</ELabel>
                  <div style={{ fontSize:12, color:C.t2, background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:6, padding:"8px 10px", lineHeight:1.5 }}>{finding.impact}</div>
                </div>
              )}
              {finding.recommendation && (
                <div>
                  <ELabel style={{ color:"rgba(110,231,183,0.6)" }}>Recommended Action</ELabel>
                  <div style={{ fontSize:12, color:C.t2, background:"rgba(52,211,153,0.05)", border:"1px solid rgba(52,211,153,0.15)", borderRadius:6, padding:"8px 10px", lineHeight:1.5 }}>{finding.recommendation}</div>
                </div>
              )}
              {(finding.owasp_category||finding.sans_category) && (
                <div>
                  <ELabel>Framework Mapping</ELabel>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {finding.owasp_category && (
                      <div style={{ background:"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.15)", borderRadius:6, padding:"6px 10px" }}>
                        <div style={{ fontSize:9, color:C.t4, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>OWASP 2025</div>
                        <div style={{ fontFamily:"monospace", fontSize:11, color:"#c4b5fd" }}>{finding.owasp_category}</div>
                      </div>
                    )}
                    {finding.sans_category && (
                      <div style={{ background:"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.15)", borderRadius:6, padding:"6px 10px" }}>
                        <div style={{ fontSize:9, color:C.t4, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>SANS / CWE</div>
                        <div style={{ fontFamily:"monospace", fontSize:11, color:"#c4b5fd" }}>{finding.sans_category}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {finding.tags?.length > 0 && (
                <div>
                  <ELabel>Tags</ELabel>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {finding.tags.map((t: string) => (
                      <span key={t} style={{ fontFamily:"monospace", fontSize:10, padding:"2px 8px", borderRadius:4, color:C.t2, background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {finding.source_tool && (
                <div>
                  <ELabel>Source Tool</ELabel>
                  <span style={{ fontSize:12, color:C.t2 }}>{finding.source_tool}</span>
                </div>
              )}
              {finding.category && (
                <div>
                  <ELabel>Category</ELabel>
                  <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", color:C.t2, background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)" }}>{finding.category}</span>
                </div>
              )}
              {finding.id && (
                <div>
                  <ELabel>Finding ID</ELabel>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:C.t4 }}>{finding.id}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── COMPLIANCE BLOCK ─────────────────────────────────────────────────────────
function ComplianceBlock({ title, passed, failed, total, categories, type }: any) {
  const [open, setOpen] = useState(true);
  const pct = total > 0 ? Math.round((passed/total)*100) : 0;
  const entries = Object.entries(categories||{}).sort(([a],[b]) => {
    const na = parseInt(a.match(/\d+/)?.[0]||"0");
    const nb = parseInt(b.match(/\d+/)?.[0]||"0");
    return na - nb;
  });

  const getCode = (key: string) => {
    if (type==="owasp") return key.match(/(A\d+)/)?.[1] || key.split("-")[0];
    return key.split(":")[0];
  };

  const OWASP_NAMES: Record<string,string> = {
    A01:"Broken Access Control", A02:"Security Misconfiguration", A03:"Software Supply Chain",
    A04:"Cryptographic Failures", A05:"Injection", A06:"Insecure Design",
    A07:"Authentication Failures", A08:"Data Integrity Failures", A09:"Logging & Alerting", A10:"SSRF",
  };

  const getLabel = (key: string) => {
    if (type==="owasp") return OWASP_NAMES[getCode(key)] || key.split("-").slice(1).join(" ");
    return key.split(":").slice(1).join(":").trim().slice(0,60);
  };

  return (
    <div style={{ ...S.card, overflow:"hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ cursor:"pointer", padding:"14px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:600, color:C.t1 }}>{title}</span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {failed > 0
              ? <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:4, color:"#f87171", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)" }}>{failed} FAILED</span>
              : <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:4, color:C.t3, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.borderLo}` }}>{passed}/{total} PASS</span>
            }
            <span style={{ color:C.t4, fontSize:14 }}>{open ? "▲" : "▼"}</span>
          </div>
        </div>
        <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:99, background:"linear-gradient(90deg, #6366f1, #8b5cf6)", width:`${pct}%`, transition:"width 0.5s" }} />
        </div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${C.borderLo}` }}>
          {entries.map(([name, d]: [string, any]) => (
            <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 18px", borderBottom:`1px solid ${C.borderLo}` }}>
              <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background: d.safe ? "rgba(255,255,255,0.12)" : "#ef4444" }} />
              <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, minWidth:40, color: d.safe ? "rgba(255,255,255,0.2)" : "#f87171" }}>{getCode(name)}</span>
              <span style={{ fontSize:11, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color: d.safe ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)" }} title={getLabel(name)}>{getLabel(name)}</span>
              {d.count > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#f87171" }}>×{d.count}</span>}
              <span style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", padding:"2px 6px", borderRadius:3, flexShrink:0, background: d.safe ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.1)", color: d.safe ? "rgba(255,255,255,0.2)" : "#f87171" }}>
                {d.safe ? "PASS" : "FAIL"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SMALL ATOMS ─────────────────────────────────────────────────────────────
function SCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background:`linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`, border:`1px solid rgba(139,92,246,0.15)`, borderRadius:12, overflow:"hidden" }}>
      {title && (
        <div style={{ padding:"12px 18px", borderBottom:`1px solid rgba(139,92,246,0.08)` }}>
          <span style={{ fontSize:13, fontWeight:600, color:C.t2 }}>{title}</span>
        </div>
      )}
      <div style={{ padding:"12px 18px" }}>{children}</div>
    </div>
  );
}

function MRow({ label, val, mono }: { label: string; val?: string; mono?: boolean }) {
  if (!val) return null;
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid rgba(139,92,246,0.06)` }}>
      <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{label}</span>
      <span style={{ fontSize:12, color:C.t1, fontFamily: mono ? "monospace" : undefined, textAlign:"right", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</span>
    </div>
  );
}

function EBlock({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div>
      <div style={{ ...S.label, marginBottom:8, color: accent==="indigo" ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.3)" }}>{title}</div>
      {children}
    </div>
  );
}

function ELabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(255,255,255,0.25)", marginBottom:5, ...style }}>{children}</div>;
}

function ScoreTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8 }}>
      <span style={{ fontSize:20, fontWeight:700, color }}>{value}</span>
      <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.25)", marginTop:3 }}>{label}</span>
    </div>
  );
}

function BCell({ label, val, color, large }: { label: string; val: string; color?: string; large?: boolean }) {
  return (
    <div style={{ padding:10, borderRight:"1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.2)", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize: large ? 22 : 13, fontWeight: large ? 800 : 600, color: color||C.t1 }}>{val}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily:"monospace", fontSize:11, padding:"2px 8px", borderRadius:4, color:C.t2, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>{children}</span>
  );
}