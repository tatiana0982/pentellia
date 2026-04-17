"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Shield,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  Server,
  Activity,
  Layers,
  FileText,
  Cpu,
  Sparkles,
  Terminal,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Filter,
  List,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// --- Types ---
type Severity = "critical" | "high" | "medium" | "low" | "info" | "unknown";

export function CommonScanReport({
  data,
  aiSummary,
}: {
  data: any;
  aiSummary?: string;
}) {
  // --- Data Parsing ---
  const meta = data?.meta || {};
  const summary = data?.summary || {};
  const allFindings = data?.findings || [];
  const coverage = data?.tool_coverage || {};
  const execSummary = data?.executive_summary;
  // ADDED: compliance and raw_reference
  const owaspCompliance = data?.owasp_compliance || null;
  const sansCompliance  = data?.sans_compliance  || null;
  const rawReference    = data?.raw_reference    || null;

  // Risk Calculations
  const riskScore = summary.risk_score || 0;
  const riskLevel = summary.risk_level || "Unknown";

  // --- Filter Logic ---
  const allSeverities: Severity[] = [
    "critical",
    "high",
    "medium",
    "low",
    "info",
  ];

  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(
    new Set(allSeverities),
  );

  // Calculate counts for the buttons
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    allFindings.forEach((f: any) => {
      const s = (f.severity || "info").toLowerCase() as keyof typeof c;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [allFindings]);

  // Check if "All" is currently active (all keys present in set)
  const isAllSelected = useMemo(() =>
    allSeverities.every((s) => severityFilter.has(s)),
    [severityFilter]
  );

  // ADDED: helper — treat "clean" info signals as primary findings
  // In cybersecurity, "No Breach Data Found" is a meaningful security posture signal,
  // not a low-value informational item. Promote them to primary.
  const isCleanSignal = (f: any): boolean =>
    !!f.title?.toLowerCase().includes("no breach") ||
    !!f.title?.toLowerCase().includes("no findings") ||
    !!f.title?.toLowerCase().includes("no exposure") ||
    !!f.title?.toLowerCase().includes("clean") ||
    !!f.tags?.includes("clean");

  // UPDATED: Split findings — clean signals go to primary regardless of info severity
  const { primaryFindings, secondaryFindings } = useMemo(() => {
    const primary: any[] = [];
    const secondary: any[] = [];

    allFindings.forEach((f: any) => {
      const sev = (f.severity || "unknown").toLowerCase() as Severity;

      if (severityFilter.has(sev)) {
        // UPDATED: promote clean signals to primary even if severity is info/low
        if ((sev === "low" || sev === "info") && !isCleanSignal(f)) {
          secondary.push(f);
        } else {
          primary.push(f);
        }
      }
    });

    return { primaryFindings: primary, secondaryFindings: secondary };
  }, [allFindings, severityFilter]);

  // ADDED: true when ALL findings are clean/info with no critical/high/medium/low threats
  const isAllCleanResult = useMemo(() =>
    allFindings.length > 0 &&
    counts.critical === 0 && counts.high === 0 && counts.medium === 0 && counts.low === 0 &&
    allFindings.every((f: any) => isCleanSignal(f) || (f.severity || "info").toLowerCase() === "info"),
  [allFindings, counts]);

  // Check if current filter only includes low/info to hide "No Issues Found" in primary section
  const isOnlyLowInfoSelected = useMemo(() => {
    if (isAllSelected || severityFilter.size === 0) return false;
    return Array.from(severityFilter).every(sev => sev === "low" || sev === "info");
  }, [severityFilter, isAllSelected]);

  // UPDATED TOGGLE LOGIC: Clicking a severity now selects ONLY that severity
  const toggleFilter = (sev: Severity) => {
    setSeverityFilter(new Set([sev]));
  };

  const selectAll = () => {
    setSeverityFilter(new Set(allSeverities));
  };

  // --- Navigation & Scroll ---
  const [activeSection, setActiveSection] = useState("executive");

  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  const isScrollingRef = useRef(false);

  // Scroll Spy
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-120px 0px -80% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      if (isScrollingRef.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    // UPDATED: added compliance to scroll spy
    ["executive", "findings", "methodology", "compliance"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#0B0C15] text-slate-200 selection:bg-indigo-500/30">
      {/* --- Sticky Navigation Header --- */}
      <div className="sticky top-0 z-40 w-full bg-[#0B0C15]/95 backdrop-blur-xl border-b border-white/10 shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 px-6 h-16 overflow-x-auto no-scrollbar max-w-7xl mx-auto w-full">
          <NavButton
            label="Executive Summary"
            active={activeSection === "executive"}
            onClick={() => scrollToSection("executive")}
            icon={<FileText className="w-4 h-4" />}
          />
          <NavButton
            label={`Findings (${primaryFindings.length + secondaryFindings.length})`}
            active={activeSection === "findings"}
            onClick={() => scrollToSection("findings")}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <NavButton
            label="Methodology"
            active={activeSection === "methodology"}
            onClick={() => scrollToSection("methodology")}
            icon={<Layers className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="flex flex-col gap-16 p-6 pb-40 max-w-7xl mx-auto w-full mt-4">
        {/* --- SECTION 1: EXECUTIVE SUMMARY --- */}
        <section id="executive" className="space-y-8 scroll-mt-28">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Executive Summary
            </h2>
            <p className="text-slate-400">
              High-level overview of the security posture.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-[#0B0C15] border border-white/10 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              <CardContent className="p-8 text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rotate-45" />
                  <div
                    className={cn(
                      "h-32 w-32 rounded-full border-8 flex items-center justify-center bg-[#0B0C15] relative z-10",
                      getRiskColorBorder(riskScore),
                    )}
                  >
                    <div className="text-center">
                      <span className="text-5xl font-bold text-white block">
                        {riskScore}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">
                        Risk Score
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-1">
                  {riskLevel} Risk
                </h3>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-[#0B0C15] border border-white/10">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-base text-slate-200 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" /> Assessment Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 text-sm text-slate-300 leading-relaxed font-light">
                  {execSummary ||
                    "The automated assessment has concluded. Review the findings below for specific vulnerabilities and remediation steps."}
                </div>
                {/* ADDED: zero-risk posture confirmation strip */}
                {riskScore <= 5 && allFindings.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-300/80">
                      <span className="font-semibold">Scan completed successfully</span> — no exposures detected.
                      {allFindings.length} finding{allFindings.length !== 1 ? "s" : ""} confirmed clean security posture.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatBox label="Critical" count={summary.critical || 0} color="red" />
                  <StatBox label="High" count={summary.high || 0} color="orange" />
                  <StatBox label="Medium" count={summary.medium || 0} color="yellow" />
                  <StatBox label="Low" count={summary.low || 0} color="blue" />
                  <StatBox label="Info" count={summary.info || 0} color="slate" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* --- SECTION 2: DETAILED FINDINGS --- */}
        <section id="findings" className="space-y-8 scroll-mt-28">
          <div className="flex flex-col gap-6">
            {/* ADDED: clean result posture banner — only shown when scan is all-clear */}
            {isAllCleanResult && (
              <div className="flex items-start gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-300">Scan Completed — No Exposures Detected</p>
                  <p className="text-xs text-emerald-400/60 mt-0.5">
                    This target was assessed and returned a clean security posture.
                    All findings below represent confirmed negative results — a positive security signal.
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Detailed Findings
                {allFindings.length > 0 && (
                  <span className="ml-3 text-sm font-normal text-slate-500">
                    {allFindings.length} result{allFindings.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>

              {/* FILTER BAR */}
              <div className="flex flex-wrap items-center gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-lg w-fit">
                <FilterButton
                  label="All Findings"
                  count={allFindings.length}
                  active={isAllSelected}
                  onClick={selectAll}
                  variant="all"
                />
                <div className="w-px h-6 bg-white/10 mx-1" />
                <FilterButton
                  label="Critical"
                  count={counts.critical}
                  active={!isAllSelected && severityFilter.has("critical")}
                  onClick={() => toggleFilter("critical")}
                  variant="critical"
                />
                <FilterButton
                  label="High"
                  count={counts.high}
                  active={!isAllSelected && severityFilter.has("high")}
                  onClick={() => toggleFilter("high")}
                  variant="high"
                />
                <FilterButton
                  label="Medium"
                  count={counts.medium}
                  active={!isAllSelected && severityFilter.has("medium")}
                  onClick={() => toggleFilter("medium")}
                  variant="medium"
                />
                <FilterButton
                  label="Low"
                  count={counts.low}
                  active={!isAllSelected && severityFilter.has("low")}
                  onClick={() => toggleFilter("low")}
                  variant="low"
                />
                <FilterButton
                  label="Info"
                  count={counts.info}
                  active={!isAllSelected && severityFilter.has("info")}
                  onClick={() => toggleFilter("info")}
                  variant="info"
                />
              </div>
            </div>

            {/* PRIMARY FINDINGS */}
            <div className="grid gap-4">
              {primaryFindings.length > 0 ? (
                primaryFindings.map((finding: any, idx: number) => (
                  <ExpandableFindingCard key={idx} finding={finding} />
                ))
              ) : (severityFilter.size > 0 && !isAllSelected && !isOnlyLowInfoSelected) ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <h3 className="text-base font-medium text-white">No Issues Found</h3>
                  <p className="text-slate-500 text-xs mt-1">No vulnerabilities match the current filter.</p>
                </div>
              ) : null}
            </div>

            {/* SECONDARY FINDINGS — expandable cards same as primary */}
            {secondaryFindings.length > 0 && (
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Info className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
                    Informational & Low Severity
                  </h3>
                </div>
                <div className="grid gap-4">
                  {secondaryFindings.map((finding: any, idx: number) => (
                    <ExpandableFindingCard key={idx} finding={finding} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* --- SECTION 3: METHODOLOGY --- */}
        <section id="methodology" className="space-y-8 scroll-mt-28">
          <h2 className="text-2xl font-bold text-white tracking-tight">Scope & Methodology</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#0B0C15] border border-white/10">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> Configuration Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ConfigRow label="Target Scope" value={meta.target} />
                  <ConfigRow label="Scan Profile" value={meta.parameters?.scan_level || "Standard"} />
                  <ConfigRow label="Started" value={meta.started_at ? new Date(meta.started_at.replace(" ","T")).toLocaleString() : undefined} />
                  {/* ADDED: completed_at, scan_id, all meta.parameters */}
                  <ConfigRow label="Completed" value={meta.completed_at ? new Date(meta.completed_at.replace(" ","T")).toLocaleString() : undefined} />
                  <ConfigRow label="Scan ID" value={meta.scan_id} mono />
                  {meta.parameters?.query && <ConfigRow label="Query" value={meta.parameters.query} mono />}
                  {meta.parameters?.limit !== undefined && <ConfigRow label="Limit" value={String(meta.parameters.limit)} mono />}
                  {meta.parameters?.resolve_domain !== undefined && <ConfigRow label="Resolve Domain" value={String(meta.parameters.resolve_domain)} mono />}
                  {meta.parameters?.scan_both !== undefined && <ConfigRow label="Scan Both" value={String(meta.parameters.scan_both)} mono />}
                  {meta.parameters?.facets && <ConfigRow label="Facets" value={meta.parameters.facets} mono />}
                  {meta.parameters?.country && <ConfigRow label="Country Filter" value={meta.parameters.country} mono />}
                  {meta.parameters?.city && <ConfigRow label="City Filter" value={meta.parameters.city} mono />}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#0B0C15] border border-white/10">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Execution Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Executed */}
                  {coverage.tools_executed?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {coverage.tools_executed.map((tool: string) => (
                        <div key={tool} className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-xs text-indigo-300 uppercase font-mono tracking-wide">
                          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                          {tool}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* ADDED: tools_failed */}
                  {coverage.tools_failed?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-wider mb-1.5">Failed</p>
                      <div className="flex flex-wrap gap-2">
                        {coverage.tools_failed.map((tool: string) => (
                          <div key={tool} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300 uppercase font-mono tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            {tool}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* ADDED: tools_skipped */}
                  {coverage.tools_skipped?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-yellow-500/60 uppercase tracking-wider mb-1.5">Skipped</p>
                      <div className="flex flex-wrap gap-2">
                        {coverage.tools_skipped.map((tool: string) => (
                          <div key={tool} className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-300 uppercase font-mono tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                            {tool}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Fallback if all empty */}
                  {!coverage.tools_executed?.length && !coverage.tools_failed?.length && !coverage.tools_skipped?.length && (
                    <p className="text-xs text-slate-600 italic">Single-engine scan — no multi-tool coverage data.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            ADDED: COMPLIANCE & FRAMEWORK MAPPING
        ═══════════════════════════════════════════════════════════ */}
        {(owaspCompliance || sansCompliance) && (
          <section id="compliance" className="space-y-6 scroll-mt-28">
            <h2 className="text-2xl font-bold text-white tracking-tight">Compliance & Framework Mapping</h2>
            <p className="text-slate-500 text-sm">Automated mapping against OWASP Top 10 (2025) and SANS/CWE Top 25</p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {owaspCompliance && (
                <ComplianceBlock
                  title="OWASP Top 10 — 2025"
                  passed={owaspCompliance.passed}
                  failed={owaspCompliance.failed}
                  total={owaspCompliance.total_categories}
                  categories={owaspCompliance.categories}
                  type="owasp"
                />
              )}
              {sansCompliance && (
                <ComplianceBlock
                  title="SANS / CWE Top 25"
                  passed={sansCompliance.passed}
                  failed={sansCompliance.failed}
                  total={sansCompliance.total_categories}
                  categories={sansCompliance.categories}
                  type="sans"
                />
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ADDED: TECHNICAL METADATA
        ═══════════════════════════════════════════════════════════ */}
        {(meta.scan_id || rawReference) && (
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Technical Metadata</h3>
            <Card className="bg-[#0B0C15] border border-white/10">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <ConfigRow label="Scan ID" value={meta.scan_id} mono />
                  {rawReference?.location && <ConfigRow label="Result Location" value={rawReference.location} mono />}
                  {rawReference?.stored !== undefined && (
                    <ConfigRow label="Raw Results Stored" value={rawReference.stored ? "Yes" : "No"} />
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function ExpandableFindingCard({ finding }: { finding: any }) {
  const [expanded, setExpanded] = useState(false);
  const severity = (finding.severity || "info").toLowerCase();

  // ADDED: detect clean signal for enhanced styling
  const isClean =
    !!finding.title?.toLowerCase().includes("no breach") ||
    !!finding.title?.toLowerCase().includes("no findings") ||
    !!finding.title?.toLowerCase().includes("no exposure") ||
    !!finding.title?.toLowerCase().includes("clean") ||
    !!finding.tags?.includes("clean");

  const sevStyles: any = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    info: "bg-slate-500/10 text-slate-400 border-white/10",
  };

  return (
    // UPDATED: clean findings get emerald border tint instead of default white/10
    <div className={cn(
      "group rounded-xl border bg-[#0B0C15] overflow-hidden transition-all",
      isClean
        ? "border-emerald-500/20 hover:border-emerald-500/35"
        : "border-white/10 hover:border-white/20"
    )}>
      <div className="p-6 cursor-pointer select-none flex flex-col md:flex-row gap-4 items-start" onClick={() => setExpanded(!expanded)}>
        {/* UPDATED: clean findings get a shield icon instead of severity icon */}
        {isClean
          ? <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          : <SeverityIcon severity={severity} />
        }
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* UPDATED: clean findings show "Secure" badge instead of plain info */}
            {isClean ? (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Secure
              </span>
            ) : (
              <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-2 py-0", sevStyles[severity])}>
                {severity}
              </Badge>
            )}
            {/* ADDED: category badge in header */}
            {finding.category && (
              <span className="text-[10px] font-mono text-slate-600 border border-white/5 bg-white/[0.02] px-2 py-0.5 rounded uppercase tracking-wide">
                {finding.category}
              </span>
            )}
            <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{finding.title}</h4>
          </div>
          {/* ADDED: clean label subtitle */}
          {isClean && (
            <p className="text-xs text-emerald-400/60 font-medium mb-1">Secure / No Exposure Detected</p>
          )}
          {/* ADDED: source_tool visible in collapsed state */}
          {!expanded && (
            <div className="flex items-center gap-3">
              {finding.description && <p className="text-sm text-slate-500 line-clamp-1 flex-1">{finding.description}</p>}
              {finding.source_tool && (
                <span className="text-[10px] font-mono text-slate-600 shrink-0">{finding.source_tool}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden md:block text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Confidence</div>
            <ConfidenceBar score={finding.confidence} />
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
        </div>
      </div>

      {expanded && (() => {
        const nvd = finding.evidence?.additional?.nvd_enrichment;
        const cveId = finding.evidence?.additional?.cve_id;
        const refs: Array<{ url: string; source?: string }> = nvd?.references || [];

        // CVSS severity color helper
        const cvssColor = (sev?: string) => {
          const s = (sev || "").toLowerCase();
          if (s === "critical") return "text-red-400 bg-red-500/10 border-red-500/30";
          if (s === "high") return "text-orange-400 bg-orange-500/10 border-orange-500/30";
          if (s === "medium") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
          if (s === "low") return "text-blue-400 bg-blue-500/10 border-blue-500/30";
          return "text-slate-400 bg-white/5 border-white/10";
        };

        return (
          <div className="p-6 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-2">
            {/* Left: Description + NVD + Evidence */}
            <div className="lg:col-span-2 space-y-6">

              {/* Description */}
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h5>
                <p className="text-sm text-slate-300 leading-relaxed">{finding.description}</p>
              </div>

              {/* NVD / CVSS Block — only shown if nvd_enrichment exists */}
              {nvd && (
                <div className="rounded-xl bg-[#07040f] border border-indigo-500/20 p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-400" />
                    <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      NVD Vulnerability Intelligence
                    </h5>
                    {cveId && (
                      <span className="ml-auto text-[10px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                        {cveId}
                      </span>
                    )}
                  </div>

                  {/* CVSS Score row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Base Score */}
                    {nvd.cvss_base_score !== undefined && nvd.cvss_base_score !== null && (
                      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-2xl font-bold text-white">{nvd.cvss_base_score}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">CVSS Base</span>
                      </div>
                    )}

                    {/* Severity Badge */}
                    {nvd.cvss_severity && (
                      <div className="flex flex-col items-center justify-center p-3 rounded-lg border">
                        <span className={`text-sm font-bold uppercase px-2 py-1 rounded border ${cvssColor(nvd.cvss_severity)}`}>
                          {nvd.cvss_severity}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">Severity</span>
                      </div>
                    )}

                    {/* Exploitability Score */}
                    {nvd.exploitability_score !== undefined && (
                      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-2xl font-bold text-orange-400">{nvd.exploitability_score}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">Exploitability</span>
                      </div>
                    )}

                    {/* Impact Score */}
                    {nvd.impact_score !== undefined && (
                      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-2xl font-bold text-red-400">{nvd.impact_score}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">Impact</span>
                      </div>
                    )}
                  </div>

                  {/* CVSS v3 Vector String */}
                  {nvd.cvss_v3?.vector_string && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CVSS v3 Vector</span>
                      <div className="mt-1 font-mono text-[11px] text-indigo-300 bg-indigo-500/5 border border-indigo-500/15 rounded px-3 py-2 break-all">
                        {nvd.cvss_v3.vector_string}
                      </div>
                    </div>
                  )}

                  {/* References */}
                  {refs.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                        References ({refs.length})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {refs.map((ref, i) => (
                          <a
                            key={i}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors group"
                          >
                            <svg className="w-3 h-3 mt-0.5 shrink-0 text-slate-600 group-hover:text-indigo-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            <span className="break-all leading-snug">{ref.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Smart Evidence Renderer — breach intel / CVE / shodan host / stats */}
              {(() => {
                const add = finding.evidence?.additional || {};
                const isCVE    = !!add.nvd_enrichment || !!add.cve_id;
                const isBreach = !isCVE && (finding.tags?.some((t: string) => ["breach","credentials"].includes(t)) || !!(add.source || add.fields_exposed));
                const isHost   = !isCVE && !isBreach && !!(add.ip || add.port || add.service) && !add.statistics;
                const isStats  = !isCVE && !isBreach && !!add.statistics;
                const hasBanner = !!add.banner_preview;
                const nvd      = add.nvd_enrichment;

                return (
                  <>
                    {/* ── CVE VULNERABILITY ── Full NVD enrichment display */}
                    {isCVE && (
                      <div className="space-y-4">
                        {/* Affected hosts */}
                        {add.affected_hosts?.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Affected Hosts ({add.affected_hosts.length})</h5>
                            <div className="space-y-2">
                              {add.affected_hosts.map((h: any, i: number) => (
                                <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg bg-[#05060A] border border-white/10 px-4 py-2.5">
                                  <span className="font-mono text-sm text-white">{h.ip}:{h.port}</span>
                                  <span className="text-xs text-slate-400">{h.service}</span>
                                  {h.version && <span className="text-xs font-mono text-slate-500">v{h.version}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {nvd && (
                          <>
                            {/* Affected products */}
                            {nvd.affected_products?.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Affected Products</h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {nvd.affected_products.slice(0, 8).map((p: string) => (
                                    <span key={p} className="text-[11px] font-mono px-2 py-0.5 rounded border text-slate-400 bg-white/[0.03] border-white/10">{p}</span>
                                  ))}
                                  {nvd.affected_products.length > 8 && (
                                    <span className="text-[11px] text-slate-600">+{nvd.affected_products.length - 8} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Weaknesses / CWE */}
                            {nvd.weaknesses?.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Weaknesses</h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {nvd.weaknesses.map((w: string) => (
                                    <span key={w} className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border text-orange-300 bg-orange-500/10 border-orange-500/20">{w}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* GitHub POCs */}
                            {nvd.github_pocs?.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-rose-500/70 uppercase mb-2">
                                  Public Exploit PoCs — GitHub ({nvd.github_pocs.length})
                                </h5>
                                <div className="space-y-2">
                                  {nvd.github_pocs.map((poc: any, i: number) => (
                                    <a key={i} href={poc.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-start justify-between gap-3 rounded-lg bg-rose-500/5 border border-rose-500/20 px-4 py-2.5 hover:bg-rose-500/10 transition-colors group">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-mono text-rose-300 group-hover:text-rose-200 truncate">{poc.name}</p>
                                        {poc.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{poc.description}</p>}
                                        {poc.language && <span className="text-[10px] text-slate-600">{poc.language}</span>}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[11px] text-yellow-400">★</span>
                                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">{poc.stars}</span>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Exploit references */}
                            {nvd.exploit_references?.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-orange-500/70 uppercase mb-2">Exploit References ({nvd.exploit_references.length})</h5>
                                <div className="space-y-1.5">
                                  {nvd.exploit_references.map((r: any, i: number) => (
                                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-start gap-2 text-[11px] text-orange-400 hover:text-orange-300 transition-colors">
                                      <svg className="w-3 h-3 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                      </svg>
                                      <span className="break-all leading-snug">{r.url}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Patch references */}
                            {nvd.patch_references?.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-emerald-500/70 uppercase mb-2">Patch References ({nvd.patch_references.length})</h5>
                                <div className="space-y-1.5">
                                  {nvd.patch_references.slice(0, 4).map((r: any, i: number) => (
                                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-start gap-2 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">
                                      <svg className="w-3 h-3 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                      </svg>
                                      <span className="break-all leading-snug">{r.url}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Published / modified dates */}
                            {(nvd.published_date || nvd.last_modified) && (
                              <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                                {nvd.published_date && <span>Published: <span className="text-slate-500 font-mono">{nvd.published_date?.split("T")[0]}</span></span>}
                                {nvd.last_modified && <span>Last modified: <span className="text-slate-500 font-mono">{nvd.last_modified?.split("T")[0]}</span></span>}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* ── BREACH INTEL ── structured credential exposure */}
                    {isBreach && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Breach Record Details</h5>
                        <div className="rounded-lg bg-[#05060A] border border-white/10 overflow-hidden">
                          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-white/5">
                            {add.source && (
                              <div className="p-3">
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Source</p>
                                <p className="text-sm font-semibold text-rose-300">{add.source}</p>
                              </div>
                            )}
                            {add.record_count !== undefined && (
                              <div className="p-3">
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Records</p>
                                <p className="text-2xl font-black text-white tabular-nums">{add.record_count}</p>
                              </div>
                            )}
                            {add.has_passwords !== undefined && (
                              <div className="p-3">
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Passwords</p>
                                <p className={`text-sm font-bold ${add.has_passwords ? "text-rose-400" : "text-slate-500"}`}>
                                  {add.has_passwords ? "Exposed" : "Not found"}
                                </p>
                              </div>
                            )}
                            {add.has_hashes !== undefined && (
                              <div className="p-3">
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Hashes</p>
                                <p className={`text-sm font-bold ${add.has_hashes ? "text-orange-400" : "text-slate-500"}`}>
                                  {add.has_hashes ? "Present" : "None"}
                                </p>
                              </div>
                            )}
                          </div>
                          {add.fields_exposed?.length > 0 && (
                            <div className="p-3 border-t border-white/5">
                              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Fields Exposed</p>
                              <div className="flex flex-wrap gap-1.5">
                                {add.fields_exposed.map((f: string) => (
                                  <span key={f} className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border text-rose-300 bg-rose-500/10 border-rose-500/20 uppercase">{f}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── BREACH INTEL SUMMARY ── overall stats */}
                    {!isBreach && !isCVE && !isHost && !isStats && add.records_returned !== undefined && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Breach Intelligence Summary</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { k: "Total Results",   v: add.total_results   },
                            { k: "Records Returned",v: add.records_returned },
                            { k: "Source Count",    v: add.source_count    },
                          ].filter(r => r.v !== undefined).map(({ k, v }) => (
                            <div key={k} className="rounded-lg bg-[#05060A] border border-white/10 p-3 text-center">
                              <p className="text-2xl font-black text-white tabular-nums">{String(v)}</p>
                              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1">{k}</p>
                            </div>
                          ))}
                        </div>
                        {add.has_passwords !== undefined && (
                          <div className="flex gap-4 mt-3 flex-wrap">
                            <span className={`text-xs font-semibold px-3 py-1 rounded border ${add.has_passwords ? "text-rose-300 bg-rose-500/10 border-rose-500/20" : "text-slate-500 bg-white/5 border-white/10"}`}>
                              Passwords {add.has_passwords ? "Exposed" : "Not Found"}
                            </span>
                            <span className={`text-xs font-semibold px-3 py-1 rounded border ${add.has_hashes ? "text-orange-300 bg-orange-500/10 border-orange-500/20" : "text-slate-500 bg-white/5 border-white/10"}`}>
                              Hashes {add.has_hashes ? "Present" : "Not Found"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── SHODAN HOST ── IP, port, service, banner */}
                    {isHost && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Host Intelligence</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { k:"IP Address",   v:add.ip,           mono:true  },
                            { k:"Port",         v:add.port,         mono:true  },
                            { k:"Service",      v:add.service               },
                            { k:"Country",      v:add.country               },
                            { k:"Organization", v:add.organization, full:true  },
                            { k:"Version",      v:add.version||null, mono:true },
                          ].filter(r => r.v != null && r.v !== "").map(({ k, v, mono, full }: any) => (
                            <div key={k} className={`rounded-lg bg-[#05060A] border border-white/10 p-3${full ? " col-span-2 sm:col-span-3" : ""}`}>
                              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{k}</p>
                              <p className={`text-sm text-white break-all leading-snug${mono ? " font-mono" : ""}`}>{String(v)}</p>
                            </div>
                          ))}
                        </div>
                        {hasBanner && (
                          <div className="mt-3">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Service Banner</p>
                            <pre className="text-xs font-mono text-emerald-400/80 bg-[#05060A] border border-white/10 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                              {add.banner_preview}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── SHODAN STATS SUMMARY ── */}
                    {isStats && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Scan Statistics</h5>
                        {add.query && (
                          <div className="flex items-center gap-3 rounded-lg bg-[#05060A] border border-white/10 px-4 py-2.5 mb-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Query</span>
                            <span className="text-sm font-mono text-indigo-300">{add.query}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                          {Object.entries(add.statistics).map(([k, v]) => (
                            <div key={k} className="rounded-lg bg-[#05060A] border border-white/10 p-3 text-center">
                              <p className="text-xl font-black text-white tabular-nums">{String(v)}</p>
                              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1.5 leading-tight">{k.replace(/_/g," ")}</p>
                            </div>
                          ))}
                        </div>
                        {add.unique_cves?.length > 0 && (
                          <div className="rounded-lg bg-[#05060A] border border-white/10 p-3">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">CVEs Found ({add.unique_cves.length})</p>
                            <div className="flex flex-wrap gap-1.5">
                              {add.unique_cves.map((cve: string) => (
                                <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noopener noreferrer"
                                  className="text-[11px] font-mono px-2 py-0.5 rounded border text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 transition-colors">
                                  {cve}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── GENERIC FALLBACK ── only if no specific renderer matched */}
                    {!isCVE && !isBreach && !isHost && !isStats && add.records_returned === undefined && finding.evidence && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Evidence</h5>
                        <div className="rounded-lg bg-[#05060A] border border-white/10 p-4 font-mono text-xs text-emerald-400/90 overflow-x-auto">
                          <RecursiveEvidence data={finding.evidence} />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Right: Meta + Asset + Impact + Recommendation + Classification + Tags */}
            <div className="space-y-6 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6">
              {finding.affected_asset && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Affected Asset</h5>
                  <div className="text-sm text-white bg-white/5 p-2 rounded border border-white/5 break-all font-mono">{finding.affected_asset}</div>
                </div>
              )}

              {finding.impact && (
                <div>
                  <h5 className="text-xs font-bold text-orange-500/80 uppercase mb-2">Impact</h5>
                  <div className="text-sm text-slate-300 bg-orange-500/5 border border-orange-500/15 rounded p-3 leading-relaxed">
                    {finding.impact}
                  </div>
                </div>
              )}

              {finding.recommendation && (
                <div>
                  <h5 className="text-xs font-bold text-emerald-500/80 uppercase mb-2">Recommended Action</h5>
                  <div className="text-sm text-slate-300 bg-emerald-500/5 border border-emerald-500/15 rounded p-3 leading-relaxed">
                    {finding.recommendation}
                  </div>
                </div>
              )}

              {(finding.owasp_category || finding.sans_category) && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Framework Mapping</h5>
                  <div className="space-y-2">
                    {finding.owasp_category && (
                      <div className="rounded border border-white/5 bg-white/[0.02] px-3 py-2">
                        <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">OWASP 2025</p>
                        <p className="text-xs text-purple-300 font-mono leading-snug">{finding.owasp_category}</p>
                      </div>
                    )}
                    {finding.sans_category && (
                      <div className="rounded border border-white/5 bg-white/[0.02] px-3 py-2">
                        <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">SANS / CWE</p>
                        <p className="text-xs text-purple-300 font-mono">{finding.sans_category}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {finding.tags?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Tags</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {finding.tags.map((t: string) => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border text-slate-400 bg-white/[0.03] border-white/10">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* ADDED: source_tool */}
              {finding.source_tool && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Source Tool</h5>
                  <p className="text-xs text-slate-400">{finding.source_tool}</p>
                </div>
              )}

              {/* ADDED: category (if not already in badge) */}
              {finding.category && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Category</h5>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border text-slate-400 bg-white/[0.03] border-white/10 uppercase">{finding.category}</span>
                </div>
              )}

              {finding.id && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Finding ID</h5>
                  <p className="text-[11px] font-mono text-slate-600">{finding.id}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function FilterButton({ label, count, active, onClick, variant }: any) {
  const styles: any = {
    all: "data-[active=true]:bg-white data-[active=true]:text-black hover:bg-white/10",
    critical: "data-[active=true]:bg-red-500/20 data-[active=true]:text-red-400 hover:text-red-400",
    high: "data-[active=true]:bg-orange-500/20 data-[active=true]:text-orange-400 hover:text-orange-400",
    medium: "data-[active=true]:bg-yellow-500/20 data-[active=true]:text-yellow-400 hover:text-yellow-400",
    low: "data-[active=true]:bg-blue-500/20 data-[active=true]:text-blue-400 hover:text-blue-400",
    info: "data-[active=true]:bg-slate-500/20 data-[active=true]:text-slate-300 hover:text-slate-300",
  };

  return (
    <button
      onClick={onClick}
      data-active={active}
      className={cn("px-3 py-1.5 rounded-md text-xs font-medium border border-transparent transition-all cursor-pointer text-slate-500", styles[variant])}
    >
      {label} <span className="text-[10px] opacity-70">({count})</span>
    </button>
  );
}

function NavButton({ label, onClick, active, icon }: any) {
  return (
    <button onClick={onClick} className={cn("flex items-center px-6 h-10 rounded-full text-sm font-medium transition-all gap-2 border", active ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-white/5 border-white/5 text-slate-400 hover:text-white")}>
      {icon} {label}
    </button>
  );
}

function StatBox({ label, count, color }: any) {
  const colors: any = {
    red: "text-red-400 border-red-500/20 bg-red-500/5",
    orange: "text-orange-400 border-orange-500/20 bg-orange-500/5",
    yellow: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    slate: "text-slate-400 border-white/10 bg-white/5",
  };
  return (
    <div className={cn("p-4 rounded-lg border flex flex-col items-center justify-center", colors[color])}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-[10px] uppercase opacity-80">{label}</span>
    </div>
  );
}

// UPDATED: added mono + undefined guard
function ConfigRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={cn("truncate max-w-[220px] text-right", mono ? "text-slate-300 font-mono text-xs" : "text-slate-200")}>{value}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical" || severity === "high" || severity === "medium")
    return <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10"><AlertTriangle className={cn("w-5 h-5", severity === "critical" ? "text-red-500" : severity === "high" ? "text-orange-500" : "text-yellow-500")} /></div>;
  return <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10"><Info className="w-5 h-5 text-blue-500" /></div>;
}

function getRiskColorBorder(score: number) {
  if (score >= 80) return "border-red-500";
  if (score >= 50) return "border-orange-500";
  if (score >= 20) return "border-yellow-500";
  return "border-blue-500";
}

function ConfidenceBar({ score }: { score: number }) {
  const percentage = Math.round((score || 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-slate-400 font-mono">{percentage}%</span>
    </div>
  );
}

// ADDED: ComplianceBlock sub-component
function ComplianceBlock({ title, passed, failed, total, categories, type }: any) {
  const [open, setOpen] = useState(true);
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const entries = Object.entries(categories || {}).sort(([a], [b]) => {
    const na = parseInt(a.match(/\d+/)?.[0] || "0");
    const nb = parseInt(b.match(/\d+/)?.[0] || "0");
    return na - nb;
  });

  const getCode = (key: string) => {
    if (type === "owasp") return key.match(/(A\d+)/)?.[1] || key.split("-")[0];
    return key.split(":")[0];
  };

  const getLabel = (key: string) => {
    if (type === "owasp") {
      const NAMES: Record<string, string> = {
        A01: "Broken Access Control", A02: "Security Misconfiguration",
        A03: "Software Supply Chain", A04: "Cryptographic Failures",
        A05: "Injection", A06: "Insecure Design", A07: "Authentication Failures",
        A08: "Data Integrity Failures", A09: "Logging & Alerting", A10: "SSRF",
      };
      return NAMES[getCode(key)] || key.split("-").slice(1).join(" ");
    }
    return key.split(":").slice(1).join(":").trim().slice(0, 60);
  };

  return (
    <Card className="bg-[#0B0C15] border border-white/10 overflow-hidden">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
            <div className="flex items-center gap-3">
              {failed > 0
                ? <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{failed} FAILED</span>
                : <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/5 text-slate-500 border border-white/10">{passed}/{total} PASS</span>
              }
              {open ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-2">
            <div className="h-full rounded-full bg-indigo-500/60" style={{ width: `${pct}%` }} />
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0 px-0 pb-0">
          <div className="divide-y divide-white/[0.04]">
            {entries.map(([name, data]: [string, any]) => (
              <div key={name} className="flex items-center gap-3 px-6 py-2.5 hover:bg-white/[0.02] transition-colors">
                <div className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                  {data.safe
                    ? <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    : <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  }
                </div>
                <span className="text-[10px] font-black font-mono shrink-0 min-w-[42px]" style={{ color: data.safe ? "#4b5563" : "#f87171" }}>
                  {getCode(name)}
                </span>
                <span className="text-[11px] flex-1 min-w-0 truncate" title={getLabel(name)}
                  style={{ color: data.safe ? "#6b7280" : "#e2e8f0" }}>
                  {getLabel(name)}
                </span>
                {data.count > 0 && (
                  <span className="text-[10px] font-bold shrink-0 text-red-400">×{data.count}</span>
                )}
                <span className={cn(
                  "text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0",
                  data.safe ? "bg-white/[0.04] text-slate-600" : "bg-red-500/10 text-red-400"
                )}>
                  {data.safe ? "PASS" : "FAIL"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function RecursiveEvidence({ data }: { data: any }) {
  if (typeof data !== "object" || data === null) return <span>{String(data)}</span>;
  return (
    <ul className="pl-2 border-l border-white/10 space-y-1">
      {Object.entries(data).map(([key, value], i) => (
        <li key={i} className="flex flex-col sm:flex-row sm:gap-2">
          <span className="text-indigo-300">{key}:</span>
          <span className="text-slate-400 break-all">{typeof value === "object" ? <RecursiveEvidence data={value} /> : String(value)}</span>
        </li>
      ))}
    </ul>
  );
}