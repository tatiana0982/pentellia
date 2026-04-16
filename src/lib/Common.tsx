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
  const meta = data?.meta || {};
  const summary = data?.summary || {};
  const allFindings = data?.findings || [];
  const coverage = data?.tool_coverage || {};
  const execSummary = data?.executive_summary;

  const riskScore = summary.risk_score || 0;
  const riskLevel = summary.risk_level || "Unknown";

  const allSeverities: Severity[] = ["critical", "high", "medium", "low", "info"];

  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set(allSeverities));

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    allFindings.forEach((f: any) => {
      const s = (f.severity || "info").toLowerCase() as keyof typeof c;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [allFindings]);

  const isAllSelected = useMemo(() =>
    allSeverities.every((s) => severityFilter.has(s)),
    [severityFilter]
  );

  const { primaryFindings, secondaryFindings } = useMemo(() => {
    const primary: any[] = [];
    const secondary: any[] = [];
    allFindings.forEach((f: any) => {
      const sev = (f.severity || "unknown").toLowerCase() as Severity;
      if (severityFilter.has(sev)) {
        if (sev === "low" || sev === "info") secondary.push(f);
        else primary.push(f);
      }
    });
    return { primaryFindings: primary, secondaryFindings: secondary };
  }, [allFindings, severityFilter]);

  const isOnlyLowInfoSelected = useMemo(() => {
    if (isAllSelected || severityFilter.size === 0) return false;
    return Array.from(severityFilter).every(sev => sev === "low" || sev === "info");
  }, [severityFilter, isAllSelected]);

  const toggleFilter = (sev: Severity) => setSeverityFilter(new Set([sev]));
  const selectAll = () => setSeverityFilter(new Set(allSeverities));

  const [activeSection, setActiveSection] = useState("executive");
  const isScrollingRef = useRef(false);

  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { isScrollingRef.current = false; }, 1000);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (isScrollingRef.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { root: null, rootMargin: "-120px 0px -80% 0px", threshold: 0 });
    ["executive", "findings", "methodology"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#0B0C15] text-slate-200 selection:bg-indigo-500/30">
      {/* Sticky Nav */}
      <div className="sticky top-0 z-40 w-full bg-[#0B0C15]/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-2 px-6 h-16 overflow-x-auto no-scrollbar max-w-7xl mx-auto w-full">
          <NavButton label="Executive Summary" active={activeSection === "executive"} onClick={() => scrollToSection("executive")} icon={<FileText className="w-4 h-4" />} />
          <NavButton label={`Findings (${allFindings.length})`} active={activeSection === "findings"} onClick={() => scrollToSection("findings")} icon={<AlertTriangle className="w-4 h-4" />} />
          <NavButton label="Methodology" active={activeSection === "methodology"} onClick={() => scrollToSection("methodology")} icon={<Layers className="w-4 h-4" />} />
        </div>
      </div>

      <div className="flex flex-col gap-16 p-6 pb-40 max-w-7xl mx-auto w-full mt-4">

        {/* SECTION 1: EXECUTIVE SUMMARY */}
        <section id="executive" className="space-y-8 scroll-mt-28">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">Executive Summary</h2>
            <p className="text-slate-400">High-level overview of the security posture.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-[#0B0C15] border border-white/10 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              <CardContent className="p-8 text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rotate-45" />
                  <div className={cn("h-32 w-32 rounded-full border-8 flex items-center justify-center bg-[#0B0C15] relative z-10", getRiskColorBorder(riskScore))}>
                    <div className="text-center">
                      <span className="text-5xl font-bold text-white block">{riskScore}</span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">Risk Score</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-1">{riskLevel} Risk</h3>
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
                  {execSummary || "The automated assessment has concluded. Review the findings below for specific vulnerabilities and remediation steps."}
                </div>
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

        {/* SECTION 2: DETAILED FINDINGS */}
        <section id="findings" className="space-y-8 scroll-mt-28">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">Detailed Findings</h2>
              <div className="flex flex-wrap items-center gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-lg w-fit">
                <FilterButton label="All Findings" count={allFindings.length} active={isAllSelected} onClick={selectAll} variant="all" />
                <div className="w-px h-6 bg-white/10 mx-1" />
                <FilterButton label="Critical" count={counts.critical} active={!isAllSelected && severityFilter.has("critical")} onClick={() => toggleFilter("critical")} variant="critical" />
                <FilterButton label="High" count={counts.high} active={!isAllSelected && severityFilter.has("high")} onClick={() => toggleFilter("high")} variant="high" />
                <FilterButton label="Medium" count={counts.medium} active={!isAllSelected && severityFilter.has("medium")} onClick={() => toggleFilter("medium")} variant="medium" />
                <FilterButton label="Low" count={counts.low} active={!isAllSelected && severityFilter.has("low")} onClick={() => toggleFilter("low")} variant="low" />
                <FilterButton label="Info" count={counts.info} active={!isAllSelected && severityFilter.has("info")} onClick={() => toggleFilter("info")} variant="info" />
              </div>
            </div>

            {/* PRIMARY FINDINGS */}
            <div className="grid gap-4">
              {primaryFindings.length > 0 ? (
                primaryFindings.map((finding: any, idx: number) => (
                  <ExpandableFindingCard key={idx} finding={finding} />
                ))
              ) : (!isAllSelected && !isOnlyLowInfoSelected && severityFilter.size > 0) ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <h3 className="text-base font-medium text-white">No Issues Found</h3>
                  <p className="text-slate-500 text-xs mt-1">No vulnerabilities match the selected severity filter.</p>
                </div>
              ) : isAllSelected && primaryFindings.length === 0 && secondaryFindings.length > 0 ? (
                <div className="p-5 border border-dashed border-slate-700/50 rounded-xl bg-white/[0.01] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500/70 shrink-0" />
                  <p className="text-sm text-slate-400">No critical, high, medium, or low severity findings. <span className="text-slate-300">Informational findings are listed below.</span></p>
                </div>
              ) : null}
            </div>

            {/* SECONDARY FINDINGS — expandable cards showing full JSON data */}
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

        {/* SECTION 3: METHODOLOGY */}
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
                  <ConfigRow label="Execution Time" value={new Date(meta.started_at).toLocaleString()} />
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
                    <div key={tool} className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-xs text-indigo-300 uppercase font-mono tracking-wide">
                      <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                      {tool}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// ExpandableFindingCard — renders ALL fields from finding JSON
// ─────────────────────────────────────────────────────────────────────
function ExpandableFindingCard({ finding }: { finding: any }) {
  const [expanded, setExpanded] = useState(false);
  const severity = (finding.severity || "info").toLowerCase();

  const sevStyles: any = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
    info:     "bg-slate-500/10 text-slate-400 border-white/10",
  };

  const additional = finding.evidence?.additional || {};
  const nvd = additional.nvd_enrichment;
  const cveId = additional.cve_id;
  const refs: Array<{ url: string }> = nvd?.references || [];

  // Detect finding type for specialised rendering
  const isShodan = finding.tags?.includes("shodan") || finding.source_tool === "Intelligence Gatherer";
  const isStats  = additional.statistics !== undefined;

  return (
    <div className="group rounded-xl border border-white/10 bg-[#0B0C15] overflow-hidden hover:border-white/20 transition-all">
      {/* Header row — always visible */}
      <div className="p-6 cursor-pointer select-none flex flex-col md:flex-row gap-4 items-start" onClick={() => setExpanded(!expanded)}>
        <SeverityIcon severity={severity} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-2 py-0", sevStyles[severity])}>
              {severity}
            </Badge>
            <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{finding.title}</h4>
          </div>
          {!expanded && <p className="text-sm text-slate-500 line-clamp-1">{finding.description}</p>}
          {/* Tags row */}
          {finding.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {finding.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[10px] bg-white/5 border border-white/10 text-slate-500 px-1.5 py-0.5 rounded font-mono">{tag}</span>
              ))}
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

      {/* Expanded body */}
      {expanded && (
        <div className="px-6 pb-6 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-white/5 animate-in slide-in-from-top-2">

          {/* LEFT: Description + host details + stats + NVD + banner */}
          <div className="lg:col-span-2 space-y-6 pt-6">

            {/* Description */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h5>
              <p className="text-sm text-slate-300 leading-relaxed">{finding.description}</p>
            </div>

            {/* Shodan host details — IP, port, service, org, country, version */}
            {isShodan && !isStats && (additional.ip || additional.port || additional.service) && (
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Host Intelligence</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {additional.ip && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">IP Address</div>
                      <div className="text-sm text-white font-mono">{additional.ip}</div>
                    </div>
                  )}
                  {additional.port && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Port</div>
                      <div className="text-sm text-white font-mono">{additional.port}</div>
                    </div>
                  )}
                  {additional.service && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Service</div>
                      <div className="text-sm text-indigo-300">{additional.service}</div>
                    </div>
                  )}
                  {additional.country && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Country</div>
                      <div className="text-sm text-slate-300">{additional.country}</div>
                    </div>
                  )}
                  {additional.organization && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 col-span-2">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Organization</div>
                      <div className="text-sm text-slate-300">{additional.organization}</div>
                    </div>
                  )}
                  {additional.version && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Version</div>
                      <div className="text-sm text-slate-300 font-mono">{additional.version}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shodan statistics summary card */}
            {isStats && additional.statistics && (
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Scan Statistics</h5>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Results",    value: additional.statistics.total_results },
                    { label: "Unique IPs",        value: additional.statistics.unique_ips },
                    { label: "Unique Ports",      value: additional.statistics.unique_ports },
                    { label: "Unique Countries",  value: additional.statistics.unique_countries },
                    { label: "Vulnerable Hosts",  value: additional.statistics.vulnerable_hosts },
                    { label: "Total CVEs",        value: additional.statistics.total_cves },
                  ].map((s, i) => s.value !== undefined && (
                    <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-white">{s.value}</div>
                      <div className="text-[10px] text-slate-500 uppercase mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                {additional.query && (
                  <div className="mt-3 bg-white/[0.02] border border-white/10 rounded p-3">
                    <span className="text-[10px] text-slate-500 uppercase">Query</span>
                    <span className="text-sm text-indigo-300 font-mono ml-3">{additional.query}</span>
                  </div>
                )}
              </div>
            )}

            {/* Banner preview */}
            {additional.banner_preview && (
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Service Banner</h5>
                <pre className="text-xs text-emerald-400/90 bg-[#05060A] border border-white/10 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {additional.banner_preview}
                </pre>
              </div>
            )}

            {/* NVD CVSS block */}
            {nvd && (
              <div className="rounded-xl bg-[#07040f] border border-indigo-500/20 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">NVD Vulnerability Intelligence</h5>
                  {cveId && (
                    <span className="ml-auto text-[10px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">{cveId}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {nvd.cvss_base_score !== undefined && nvd.cvss_base_score !== null && (
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-2xl font-bold text-white">{nvd.cvss_base_score}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">CVSS Base</span>
                    </div>
                  )}
                  {nvd.cvss_severity && (
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg border">
                      <span className="text-sm font-bold uppercase px-2 py-1 rounded border text-slate-400 bg-white/5 border-white/10">{nvd.cvss_severity}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">Severity</span>
                    </div>
                  )}
                </div>
                {refs.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">References ({refs.length})</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {refs.map((ref, i) => (
                        <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-start gap-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                          <span className="break-all leading-snug">{ref.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw evidence fallback for anything not specifically handled */}
            {!isShodan && finding.evidence && (
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Evidence</h5>
                <div className="rounded-lg bg-[#05060A] border border-white/10 p-4 font-mono text-xs text-emerald-400/90 overflow-x-auto">
                  <RecursiveEvidence data={finding.evidence} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: affected asset + impact + recommendation + classification */}
          <div className="space-y-6 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-6 lg:pl-6">
            {finding.affected_asset && (
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Affected Asset</h5>
                <div className="text-sm text-white bg-white/5 p-2 rounded border border-white/5 break-all font-mono">{finding.affected_asset}</div>
              </div>
            )}

            {finding.impact && (
              <div>
                <h5 className="text-xs font-bold text-orange-500/70 uppercase mb-2">Impact</h5>
                <div className="text-sm text-slate-300 bg-orange-500/5 border border-orange-500/15 rounded p-3 leading-relaxed">
                  {finding.impact}
                </div>
              </div>
            )}

            {finding.recommendation && (
              <div>
                <h5 className="text-xs font-bold text-emerald-500/70 uppercase mb-2">Recommended Action</h5>
                <div className="text-sm text-slate-300 bg-emerald-500/5 border border-emerald-500/15 rounded p-3 leading-relaxed">
                  {finding.recommendation}
                </div>
              </div>
            )}

            {(finding.owasp_category || finding.sans_category) && (
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Classification</h5>
                <div className="flex flex-wrap gap-1.5">
                  {finding.owasp_category && (
                    <span className="text-[10px] font-bold tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-md uppercase">{finding.owasp_category}</span>
                  )}
                  {finding.sans_category && (
                    <span className="text-[10px] font-bold tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-md uppercase">{finding.sans_category.split(":")[0]}</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Source</h5>
              <div className="text-xs text-slate-400 font-mono">{finding.source_tool || "—"}</div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Finding ID</h5>
              <div className="text-xs text-slate-500 font-mono">{finding.id || "—"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub components ───────────────────────────────────────────────────

function FilterButton({ label, count, active, onClick, variant }: any) {
  const styles: any = {
    all:      "data-[active=true]:bg-white data-[active=true]:text-black hover:bg-white/10",
    critical: "data-[active=true]:bg-red-500/20 data-[active=true]:text-red-400 hover:text-red-400",
    high:     "data-[active=true]:bg-orange-500/20 data-[active=true]:text-orange-400 hover:text-orange-400",
    medium:   "data-[active=true]:bg-yellow-500/20 data-[active=true]:text-yellow-400 hover:text-yellow-400",
    low:      "data-[active=true]:bg-blue-500/20 data-[active=true]:text-blue-400 hover:text-blue-400",
    info:     "data-[active=true]:bg-slate-500/20 data-[active=true]:text-slate-300 hover:text-slate-300",
  };
  return (
    <button onClick={onClick} data-active={active}
      className={cn("px-3 py-1.5 rounded-md text-xs font-medium border border-transparent transition-all cursor-pointer text-slate-500", styles[variant])}>
      {label} <span className="text-[10px] opacity-70">({count})</span>
    </button>
  );
}

function NavButton({ label, onClick, active, icon }: any) {
  return (
    <button onClick={onClick} className={cn("flex items-center px-6 h-10 rounded-full text-sm font-medium transition-all gap-2 border",
      active ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-white/5 border-white/5 text-slate-400 hover:text-white")}>
      {icon} {label}
    </button>
  );
}

function StatBox({ label, count, color }: any) {
  const colors: any = {
    red:    "text-red-400 border-red-500/20 bg-red-500/5",
    orange: "text-orange-400 border-orange-500/20 bg-orange-500/5",
    yellow: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
    blue:   "text-blue-400 border-blue-500/20 bg-blue-500/5",
    slate:  "text-slate-400 border-white/10 bg-white/5",
  };
  return (
    <div className={cn("p-4 rounded-lg border flex flex-col items-center justify-center", colors[color])}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-[10px] uppercase opacity-80">{label}</span>
    </div>
  );
}

function ConfigRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-mono truncate max-w-[200px]">{value}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical" || severity === "high" || severity === "medium")
    return <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
      <AlertTriangle className={cn("w-5 h-5", severity === "critical" ? "text-red-500" : severity === "high" ? "text-orange-500" : "text-yellow-500")} />
    </div>;
  return <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
    <Info className="w-5 h-5 text-blue-500" />
  </div>;
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