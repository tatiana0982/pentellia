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
  const isAllSelected = allSeverities.every((s) => severityFilter.has(s));

  // Split findings into Primary (Cards) and Secondary (Table) based on active filters
  const { primaryFindings, secondaryFindings } = useMemo(() => {
    const primary: any[] = [];
    const secondary: any[] = [];

    allFindings.forEach((f: any) => {
      const sev = (f.severity || "unknown").toLowerCase() as Severity;

      // Only process if passed the active filter
      if (severityFilter.has(sev)) {
        if (sev === "low" || sev === "info") {
          secondary.push(f);
        } else {
          primary.push(f);
        }
      }
    });

    return { primaryFindings: primary, secondaryFindings: secondary };
  }, [allFindings, severityFilter]);

  const toggleFilter = (sev: Severity) => {
    const next = new Set(severityFilter);
    if (next.has(sev)) next.delete(sev);
    else next.add(sev);
    setSeverityFilter(next);
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

    ["executive", "findings", "methodology", "ai"].forEach((id) => {
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
          <NavButton
            label="AI Intelligence"
            active={activeSection === "ai"}
            onClick={() => scrollToSection("ai")}
            icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
          />
        </div>
      </div>

      <div className="flex flex-col gap-16 p-6 pb-40 max-w-7xl mx-auto w-full mt-4">
        {/* --- SECTION 1: EXECUTIVE SUMMARY (Unchanged) --- */}
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
                  <Activity className="h-4 w-4 text-indigo-400" /> Assessment
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 text-sm text-slate-300 leading-relaxed font-light">
                  {execSummary ||
                    "The automated assessment has concluded. Review the findings below for specific vulnerabilities and remediation steps."}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatBox
                    label="Critical"
                    count={summary.critical || 0}
                    color="red"
                  />
                  <StatBox
                    label="High"
                    count={summary.high || 0}
                    color="orange"
                  />
                  <StatBox
                    label="Medium"
                    count={summary.medium || 0}
                    color="yellow"
                  />
                  <StatBox label="Low" count={summary.low || 0} color="blue" />
                  <StatBox
                    label="Info"
                    count={summary.info || 0}
                    color="slate"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* --- SECTION 2: DETAILED FINDINGS (Improved Filtering) --- */}
        <section id="findings" className="space-y-8 scroll-mt-28">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Detailed Findings
              </h2>

              {/* NEW FILTER BAR */}
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
                  active={severityFilter.has("critical")}
                  onClick={() => toggleFilter("critical")}
                  variant="critical"
                />
                <FilterButton
                  label="High"
                  count={counts.high}
                  active={severityFilter.has("high")}
                  onClick={() => toggleFilter("high")}
                  variant="high"
                />
                <FilterButton
                  label="Medium"
                  count={counts.medium}
                  active={severityFilter.has("medium")}
                  onClick={() => toggleFilter("medium")}
                  variant="medium"
                />
                <FilterButton
                  label="Low"
                  count={counts.low}
                  active={severityFilter.has("low")}
                  onClick={() => toggleFilter("low")}
                  variant="low"
                />
                <FilterButton
                  label="Info"
                  count={counts.info}
                  active={severityFilter.has("info")}
                  onClick={() => toggleFilter("info")}
                  variant="info"
                />
              </div>
            </div>

            {/* PRIMARY FINDINGS (Critical/High/Medium) */}
            <div className="grid gap-4">
              {primaryFindings.length > 0 ? (
                primaryFindings.map((finding: any, idx: number) => (
                  <ExpandableFindingCard key={idx} finding={finding} />
                ))
              ) : severityFilter.has("critical") ||
                severityFilter.has("high") ||
                severityFilter.has("medium") ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <h3 className="text-base font-medium text-white">
                    No Critical, High, or Medium Issues
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Your target appears secure against major threats based on
                    current filters.
                  </p>
                </div>
              ) : null}
            </div>

            {/* SECONDARY FINDINGS (Low/Info) */}
            {secondaryFindings.length > 0 && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Info className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
                    Informational & Low Severity
                  </h3>
                </div>
                <Card className="bg-[#0B0C15] border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                          <th className="px-6 py-3 w-[100px]">Severity</th>
                          <th className="px-6 py-3">Title</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3 text-right">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {secondaryFindings.map((finding: any, i: number) => (
                          <tr
                            key={i}
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            <td className="px-6 py-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] uppercase w-full justify-center border-0",
                                  finding.severity === "low"
                                    ? "text-blue-400 bg-blue-500/10"
                                    : "text-slate-400 bg-slate-500/10",
                                )}
                              >
                                {finding.severity}
                              </Badge>
                            </td>
                            <td className="px-6 py-3 font-medium text-white group-hover:text-indigo-300 transition-colors">
                              {finding.title}
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-500 uppercase tracking-wide">
                              {finding.category}
                            </td>
                            <td className="px-6 py-3 font-mono text-xs text-slate-500 text-right">
                              {finding.source_tool || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </section>

        {/* --- SECTION 3: METHODOLOGY (Unchanged) --- */}
        <section id="methodology" className="space-y-8 scroll-mt-28">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Scope & Methodology
          </h2>
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
                  <ConfigRow
                    label="Scan Profile"
                    value={meta.parameters?.scan_level || "Standard"}
                  />
                  <ConfigRow
                    label="Execution Time"
                    value={new Date(meta.started_at).toLocaleString()}
                  />
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
                <div className="flex flex-wrap gap-2">
                  {coverage.tools_executed?.map((tool: string) => (
                    <div
                      key={tool}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-xs text-indigo-300 uppercase font-mono tracking-wide"
                    >
                      <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                      {tool}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* --- SECTION 4: AI ANALYSIS (Unchanged) --- */}
        <section id="ai" className="space-y-8 scroll-mt-28">
          <Card className="bg-[#0B0C15] border-indigo-500/30 shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-40 bg-indigo-600/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
            <CardHeader className="border-b border-white/5 bg-indigo-500/5 py-6 px-8 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-indigo-300 text-lg font-medium">
                <Sparkles className="h-5 w-5 text-indigo-400 fill-indigo-400/20" />
                Pentellia Intelligent Analysis
              </CardTitle>
              {aiSummary && (
                <Badge
                  variant="outline"
                  className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10"
                >
                  AI Generated
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-8">
              {aiSummary ? (
                <div className="animate-in fade-in duration-700">
                  <ReactMarkdown
                    components={{
                      h2: ({ node, ...props }) => (
                        <h2
                          className="text-lg font-bold text-white mt-6 mb-3 flex items-center gap-2 border-l-2 border-indigo-500 pl-3"
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className="text-base font-semibold text-indigo-200 mt-4 mb-2"
                          {...props}
                        />
                      ),
                      strong: ({ node, ...props }) => (
                        <span
                          className="font-bold text-indigo-400"
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          className="list-none space-y-2 my-3 pl-1"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="flex items-start gap-2 relative pl-2">
                          {" "}
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />{" "}
                          <span>{props.children}</span>{" "}
                        </li>
                      ),
                      code: ({ node, ...props }: any) => (
                        <code
                          className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 font-mono text-xs text-orange-300"
                          {...props}
                        />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="border-white/10 my-6" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          className="border-l-4 border-indigo-500/30 bg-indigo-500/5 p-4 rounded-r my-4 italic text-slate-400"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {aiSummary}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 opacity-50 hover:opacity-80 transition-opacity">
                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <Terminal className="h-8 w-8 text-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300 font-medium">
                      Analysis Pending
                    </p>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                      Click the "AI Insight" button in the header to generate a
                      comprehensive remediation plan.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS & HELPERS ---

function ExpandableFindingCard({ finding }: { finding: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group rounded-xl border border-white/10 bg-[#0B0C15] overflow-hidden hover:border-white/20 transition-all shadow-sm">
      <div
        className="p-6 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row gap-4 justify-between items-start cursor-pointer hover:bg-white/[0.02] select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4 flex-1">
          <SeverityIcon severity={finding.severity} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                {finding.title}
              </h4>
              <Badge
                variant="secondary"
                className="bg-white/5 text-slate-400 border-0 text-[10px]"
              >
                {finding.category}
              </Badge>
            </div>
            {!expanded && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                {finding.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden md:block text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              Confidence
            </div>
            <ConfidenceBar score={finding.confidence} />
          </div>
          <div className="text-slate-500 transition-transform duration-300">
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-2 duration-300">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Description
              </h5>
              <p className="text-sm text-slate-300 leading-relaxed">
                {finding.description}
              </p>
            </div>
            {finding.evidence && (
              <div className="rounded-lg bg-[#05060A] border border-white/10 overflow-hidden">
                <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Technical Evidence
                </div>
                <div className="p-4 font-mono text-xs text-emerald-400/90 overflow-x-auto max-h-[300px] custom-scrollbar">
                  <RecursiveEvidence data={finding.evidence} />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6">
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Affected Asset
              </h5>
              <div className="flex items-center gap-2 text-sm text-white bg-white/5 p-2 rounded border border-white/5">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{finding.affected_asset}</span>
              </div>
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Detection Source
              </h5>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Crosshair className="w-4 h-4 text-slate-500" />
                {finding.source_tool || "Composite Engine"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ label, onClick, active, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center px-6 h-10 rounded-full text-sm font-medium transition-all gap-2 whitespace-nowrap border",
        active
          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
          : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
      )}
    >
      {icon} {label}
    </button>
  );
}

// 🆕 UPDATED FILTER BUTTON COMPONENT
function FilterButton({ label, count, active, onClick, variant }: any) {
  const styles: any = {
    all: "hover:bg-white/10 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black",
    critical:
      "hover:text-red-400 data-[active=true]:bg-red-500/20 data-[active=true]:text-red-400 data-[active=true]:border-red-500/50",
    high: "hover:text-orange-400 data-[active=true]:bg-orange-500/20 data-[active=true]:text-orange-400 data-[active=true]:border-orange-500/50",
    medium:
      "hover:text-yellow-400 data-[active=true]:bg-yellow-500/20 data-[active=true]:text-yellow-400 data-[active=true]:border-yellow-500/50",
    low: "hover:text-blue-400 data-[active=true]:bg-blue-500/20 data-[active=true]:text-blue-400 data-[active=true]:border-blue-500/50",
    info: "hover:text-slate-300 data-[active=true]:bg-slate-500/20 data-[active=true]:text-slate-300 data-[active=true]:border-slate-500/50",
  };

  return (
    <button
      onClick={onClick}
      data-active={active}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-transparent transition-all",
        "text-slate-500", // Default text color
        styles[variant],
      )}
    >
      {label}
      <span className={cn("text-[10px] opacity-70", active && "opacity-100")}>
        ({count})
      </span>
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
    <div
      className={cn(
        "p-4 rounded-lg border flex flex-col items-center justify-center",
        colors[color],
      )}
    >
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </span>
    </div>
  );
}

function ConfigRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-mono truncate max-w-[200px]">
        {value}
      </span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  const s = severity?.toLowerCase();
  if (s === "critical")
    return (
      <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
    );
  if (s === "high")
    return (
      <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
      </div>
    );
  if (s === "medium")
    return (
      <div className="h-10 w-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
      </div>
    );
  if (s === "low")
    return (
      <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
        <Info className="w-5 h-5 text-blue-500" />
      </div>
    );
  return (
    <div className="h-10 w-10 rounded-lg bg-slate-500/10 border border-slate-500/30 flex items-center justify-center">
      <Info className="w-5 h-5 text-slate-500" />
    </div>
  );
}

function getRiskColorBorder(score: number) {
  if (score >= 80) return "border-red-500";
  if (score >= 50) return "border-orange-500";
  if (score >= 20) return "border-yellow-500";
  return "border-blue-500";
}

function ConfidenceBar({ score }: { score: number }) {
  const percentage = Math.round((score || 0) * 100);
  let color = "bg-blue-500";
  if (percentage > 80) color = "bg-emerald-500";
  else if (percentage < 50) color = "bg-yellow-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 font-mono">{percentage}%</span>
    </div>
  );
}

function RecursiveEvidence({ data }: { data: any }) {
  if (typeof data !== "object" || data === null) {
    return <span>{String(data)}</span>;
  }
  return (
    <ul className="pl-2 border-l border-white/10 space-y-1 my-1">
      {Object.entries(data).map(([key, value], i) => (
        <li key={i} className="flex flex-col sm:flex-row sm:gap-2 items-start">
          <span className="text-indigo-300 shrink-0">{key}:</span>
          <span className="text-slate-400 break-all">
            {typeof value === "object" ? (
              <RecursiveEvidence data={value} />
            ) : (
              String(value)
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
