"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Network,
  Server,
  ShieldAlert,
  Sparkles,
  Target,
  Terminal,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NetworkScanReport({
  data,
  aiSummary,
}: {
  data: any;
  aiSummary?: string;
}) {
  // --- Data Extraction & Safe Access ---
  const resultRoot = data?.result || {};
  const scanResults = resultRoot.results || {};
  const summary = resultRoot.summary || {};

  // Tools Data
  const masscanData = scanResults.discovery?.masscan || {};
  const openPorts = masscanData.results || [];
  const shodanData = scanResults.discovery?.shodansearch || {};
  const nmapData = scanResults.service_detection?.nmap || {};

  // Meta Info
  const target = resultRoot.target || "Unknown Target";
  const resolvedIp = masscanData.resolved_ip || "Unknown IP";
  const scanDuration = resultRoot.scan_duration
    ? `${resultRoot.scan_duration}s`
    : "N/A";
  const completedAt = data?.completed_at || new Date().toISOString();

  // Risks (Default to 0 if missing)
  const riskCounts = {
    critical: summary.critical || 0,
    high: summary.high || 0,
    medium: summary.medium || 0,
    low: summary.low || 0,
    info: summary.errors ? 1 : openPorts.length > 0 ? openPorts.length : 0, // Treat open ports as Info/Low depending on logic
  };

  // Determine Overall Risk Level based on counts
  let overallRisk = "Secure";
  let overallColor = "text-emerald-500";
  let overallBorder = "border-emerald-500";

  if (riskCounts.critical > 0) {
    overallRisk = "Critical";
    overallColor = "text-red-500";
    overallBorder = "border-red-500";
  } else if (riskCounts.high > 0) {
    overallRisk = "High";
    overallColor = "text-orange-500";
    overallBorder = "border-orange-500";
  } else if (riskCounts.medium > 0) {
    overallRisk = "Medium";
    overallColor = "text-yellow-500";
    overallBorder = "border-yellow-500";
  } else if (riskCounts.low > 0 || openPorts.length > 0) {
    overallRisk = "Low";
    overallColor = "text-blue-500";
    overallBorder = "border-blue-500";
  }

  // --- Scroll & Navigation Logic (Identical to CloudScan) ---
  const [activeSection, setActiveSection] = useState("summary");
  const isScrollingRef = useRef(false);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { root: null, rootMargin: "-100px 0px -70% 0px", threshold: 0 }
    );

    ["summary", "findings", "tests", "params", "ai"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#0B0C15] text-slate-200 selection:bg-blue-500/30">
      {/* --- Sticky Header --- */}
      <div className="sticky top-0 z-50 w-full bg-[#0B0C15]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Network className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-white leading-none">
                Network Scan Report
              </h1>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 opacity-80">
                {target}
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider"
          >
            <CheckCircle2 className="w-3 h-3 mr-1.5" /> Completed
          </Badge>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <NavButton
              label="Summary"
              active={activeSection === "summary"}
              onClick={() => scrollToSection("summary")}
            />
            <NavButton
              label="Open Ports"
              active={activeSection === "findings"}
              onClick={() => scrollToSection("findings")}
            />
            <NavButton
              label="Performed Tests"
              active={activeSection === "tests"}
              onClick={() => scrollToSection("tests")}
            />
            <NavButton
              label="Scan Parameters"
              active={activeSection === "params"}
              onClick={() => scrollToSection("params")}
            />
            <NavButton
              label="AI Analysis"
              icon={<Sparkles className="h-3.5 w-3.5 mr-2 text-indigo-400" />}
              active={activeSection === "ai"}
              onClick={() => scrollToSection("ai")}
            />
          </div>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex flex-col gap-16 p-6 pb-40 max-w-7xl mx-auto w-full mt-8">
        {/* SECTION: SUMMARY */}
        <section id="summary" className="scroll-mt-48 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white tracking-tight">
              Executive Summary
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              JOB ID: {data?.job_id?.split("-")[0] || "UNK"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Summary Card */}
            <Card className="lg:col-span-2 bg-[#0B0C15] border border-white/10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.02] border min-w-[180px]",
                      overallBorder.replace("border-", "border-") + "/20"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold tracking-wider mb-2",
                        overallColor
                      )}
                    >
                      Overall Risk
                    </span>
                    <div className="relative flex items-center justify-center h-24 w-24">
                      <svg
                        className="absolute inset-0 h-full w-full -rotate-90 transform"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          className="text-slate-800"
                          strokeWidth="6"
                          stroke="currentColor"
                          fill="transparent"
                          r="44"
                          cx="50"
                          cy="50"
                        />
                        <circle
                          className={overallColor}
                          strokeWidth="6"
                          strokeDasharray={200}
                          strokeDashoffset={100}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="44"
                          cx="50"
                          cy="50"
                        />
                      </svg>
                      <span className="text-3xl font-light text-white">
                        {overallRisk}
                      </span>
                    </div>
                  </div>

                  <div className="hidden md:block w-px h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                  <div className="flex-1 grid grid-cols-4 gap-4 w-full">
                    <RiskMiniCard
                      label="Critical"
                      count={riskCounts.critical}
                      color="text-red-500"
                    />
                    <RiskMiniCard
                      label="High"
                      count={riskCounts.high}
                      color="text-orange-500"
                    />
                    <RiskMiniCard
                      label="Medium"
                      count={riskCounts.medium}
                      color="text-yellow-500"
                    />
                    <RiskMiniCard
                      label="Info"
                      count={riskCounts.info}
                      color="text-slate-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              <MetaCard
                icon={<Clock className="w-4 h-4" />}
                label="Duration"
                value={scanDuration}
              />
              <MetaCard
                icon={<Server className="w-4 h-4" />}
                label="Resolved IP"
                value={resolvedIp}
                fontMono
              />
              <div className="p-5 rounded-lg border border-white/10 bg-white/[0.02] flex flex-col justify-center">
                <span className="text-xs text-slate-500 mb-1">
                  Completion Time
                </span>
                <span className="text-sm font-medium text-slate-200">
                  {new Date(completedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-white/5" />

        {/* SECTION: FINDINGS */}
        <section id="findings" className="scroll-mt-48 mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              Network Findings
            </h3>
            <div className="flex gap-4">
              <div className="flex bg-white/5 p-1 rounded-lg">
                <FilterBadge
                  label="All Ports"
                  count={openPorts.length}
                  active
                />
                <FilterBadge label="Vulns" count={0} />
              </div>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl bg-[#0B0C15] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs shadow-lg">
                  INFO
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Discovered Open Ports & Services
                  </h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-slate-500 font-mono flex items-center">
                      <Wifi className="w-3 h-3 mr-1.5" /> {openPorts.length}{" "}
                      Ports Open
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
            </div>

            <div className="p-0 border-t border-white/5 bg-black/20">
              {openPorts.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.03] text-xs uppercase text-slate-500 font-semibold">
                      <tr>
                        <th className="px-6 py-4">Port</th>
                        <th className="px-6 py-4">Protocol</th>
                        <th className="px-6 py-4">State</th>
                        <th className="px-6 py-4">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {openPorts.map((port: any, idx: number) => (
                        <tr
                          key={idx}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-emerald-400">
                            {port.port}
                          </td>
                          <td className="px-6 py-4 text-slate-300 uppercase">
                            {port.protocol}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 text-[10px] uppercase"
                            >
                              {port.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-500">
                            {port.ip}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 italic">
                  No open ports found or scan was blocked.
                </div>
              )}
            </div>
            {/* Nmap Error Handling Display */}
            {nmapData.error && (
              <div className="px-6 py-3 bg-red-500/5 border-t border-white/5 flex items-center gap-2 text-red-400 text-xs font-mono">
                <ShieldAlert className="h-4 w-4" />
                Warning: Service detection (Nmap) failed: {nmapData.error}
              </div>
            )}
          </div>
        </section>

        {/* SECTION: TESTS */}
        <section id="tests" className="scroll-mt-48 mt-8 space-y-6">
          <h3 className="text-xl font-semibold text-white">Performed Tests</h3>
          <Card className="bg-[#0B0C15] border border-white/10 group hover:border-white/20 transition-all">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <CheckCircle2 className="h-6 w-6 text-purple-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-200 group-hover:text-white transition-colors">
                    Network Infrastructure Analysis
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
                    Executed <strong>Masscan</strong> for high-speed port
                    probing, queried <strong>Shodan</strong> for passive
                    intelligence, and attempted <strong>Nmap</strong> for deep
                    service fingerprinting to identify open attack surfaces.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION: PARAMETERS */}
        <section id="params" className="scroll-mt-48 mt-8 space-y-6">
          <h3 className="text-xl font-semibold text-white">Scan Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ParameterCard label="Target Host" value={target} />
            <ParameterCard
              label="Port Range"
              value={masscanData.ports_scanned || "1-1000"}
            />
            <ParameterCard
              label="Scan Rate"
              value={`${masscanData.scan_rate || "Unknown"} pps`}
            />
            <ParameterCard
              label="Scan Type"
              value={resultRoot.scan_type || "Network Scan"}
            />
          </div>
        </section>

        {/* SECTION: AI ANALYSIS */}
        <section id="ai" className="scroll-mt-48 mt-8 space-y-6">
          <Card className="bg-[#0B0C15] border-indigo-500/30 shadow-[0_0_80px_rgba(79,70,229,0.08)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-40 bg-indigo-600/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
            <CardHeader className="border-b border-white/5 bg-indigo-500/5 py-5 px-6">
              <CardTitle className="flex items-center gap-2.5 text-indigo-300 text-base font-medium">
                <Sparkles className="h-4 w-4 text-indigo-400 fill-indigo-400/20" />
                DeepSeek Intelligent Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {aiSummary ? (
                <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white max-w-none text-sm leading-7">
                  {aiSummary}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <Terminal className="h-8 w-8 text-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300 font-medium">
                      Analysis Pending
                    </p>
                    <p className="text-slate-500 text-sm">
                      AI insight generation has not been triggered for this scan
                      yet.
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

// --- HELPER COMPONENTS ---

function NavButton({ label, onClick, active, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center h-14 px-4 text-sm font-medium transition-all border-b-2 outline-none select-none",
        active
          ? "border-purple-500 text-purple-400 bg-purple-500/5"
          : "border-transparent text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.02]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function RiskMiniCard({ label, count, color }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
      <span className={cn("text-2xl font-light mb-1", color)}>{count}</span>
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        {label}
      </span>
    </div>
  );
}

function MetaCard({ icon, label, value, fontMono }: any) {
  return (
    <div className="p-5 rounded-lg border border-white/10 bg-white/[0.02] flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-500">{icon}</span>
        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-sm font-medium text-slate-200 truncate",
          fontMono && "font-mono"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ParameterCard({ label, value }: any) {
  return (
    <div className="bg-[#0B0C15] border border-white/10 p-6 rounded-lg flex flex-col gap-2">
      <div className="text-xs font-bold uppercase text-slate-500 tracking-wide flex items-center gap-2">
        <Target className="w-3 h-3" /> {label}
      </div>
      <div className="text-sm text-slate-200 font-mono bg-black/40 px-4 py-3 rounded border border-white/5 truncate select-all">
        {value}
      </div>
    </div>
  );
}

function FilterBadge({ label, count, active }: any) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all",
        active
          ? "bg-purple-600 text-white shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <span>{label}</span>
      {count !== undefined && <span className="opacity-70">({count})</span>}
    </button>
  );
}
