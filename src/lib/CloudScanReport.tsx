"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Globe,
  Server,
  Sparkles,
  Terminal,
  Activity,
  Clock,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CloudScanReport({
  data,
  aiSummary,
}: {
  data: any;
  aiSummary?: string;
}) {
  // --- Data Extraction ---
  const rawResults = data?.results || {};
  const summary = data?.summary || {};
  const httpxData = rawResults?.asset_probing?.httpx?.results?.[0] || {};
  const techStack = httpxData.tech || [];
  const startTime = data?.created_at || "2026-01-08 - 16:49";
  const duration = data?.scan_duration
    ? `${data.scan_duration} seconds`
    : "1m 58s";
  const target = data?.target || "https://www.glossour.com/";
  const sourceIp = httpxData.host_ip || "172.236.211.30";

  const riskCounts = {
    critical: summary.critical || 0,
    high: summary.high || 0,
    medium: summary.medium || 0,
    low: summary.low || 1,
    info: summary.errors ? 1 : 0,
  };

  // --- Navigation Logic ---
  const [activeSection, setActiveSection] = useState("summary");

  // We use this to prevent the observer from flickering the active state
  // while the smooth scroll animation is happening.
  const isScrollingRef = useRef(false);

  // 1. Reliable Scroll Function
  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveSection(id); // Set active immediately for UI responsiveness

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });

      // Re-enable the observer after animation (approx 1s)
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  // 2. Intersection Observer (Scroll Spy)
  useEffect(() => {
    const observerOptions = {
      root: null, // observes viewport
      rootMargin: "-100px 0px -70% 0px", // Offset: Triggers when section is near top of screen
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // If we are manually scrolling (clicked a tab), ignore observer
      if (isScrollingRef.current) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    // Observe all sections
    const sections = ["summary", "findings", "tests", "params", "ai"];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#0B0C15] text-slate-200 selection:bg-blue-500/30">
      {/* --- Sticky Header --- */}
      <div className="sticky top-0 z-50 w-full bg-[#0B0C15]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/50 transition-all duration-300">
        {/* Top Bar */}
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-white leading-none">
                Scan Report
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
              label="Findings"
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
        {/* IMPORTANT: 
            Added `id="summary"` for the observer.
            Added `scroll-mt-48` so the sticky header doesn't cover the content when scrolled.
        */}
        <section id="summary" className="scroll-mt-48 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white tracking-tight">
              Executive Summary
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              ID: {data?.id || "SCAN-8291"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Summary Card */}
            <Card className="lg:col-span-2 bg-[#0B0C15] border border-white/10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 min-w-[180px]">
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-2">
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
                          className="text-blue-500"
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
                        Low
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
                label="Scan Duration"
                value={duration}
              />
              <MetaCard
                icon={<Server className="w-4 h-4" />}
                label="Source IP"
                value={sourceIp}
                fontMono
              />
              <div className="p-5 rounded-lg border border-white/10 bg-white/[0.02] flex flex-col justify-center">
                <span className="text-xs text-slate-500 mb-1">Scan Date</span>
                <span className="text-sm font-medium text-slate-200">
                  {startTime}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-white/5" />

        <section id="findings" className="scroll-mt-48 mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Findings</h3>
            <div className="flex gap-4">
              <div className="flex bg-white/5 p-1 rounded-lg">
                <FilterBadge label="All" count={techStack.length + 1} active />
                <FilterBadge label="Vulns" count={0} />
              </div>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl bg-[#0B0C15] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded flex items-center  justify-center bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-xs shadow-lg">
                  LOW
                </div>

                <div className=" flex flex-col ">
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Server software and technology detected
                  </h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-slate-500 font-mono flex items-center">
                      <Globe className="w-3 h-3 mr-1.5" /> Port 443
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
            </div>

            <div className="p-8 border-t border-white/5 bg-black/20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Technological Footprint
                  </h5>
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 px-4 py-3 bg-white/[0.03] border-b border-white/10 text-xs font-medium text-slate-400">
                      <div>Software / Library</div>
                      <div>Category</div>
                    </div>
                    <div className="divide-y divide-white/5 bg-[#0B0C15]">
                      {techStack.map((tech: string, i: number) => (
                        <div
                          key={i}
                          className="grid grid-cols-2 px-4 py-3.5 hover:bg-white/[0.02] transition-colors group/row cursor-default"
                        >
                          <div className="flex items-center gap-3 text-sm text-slate-200">
                            <TechLogo name={tech} />
                            <span>{tech}</span>
                          </div>
                          <div className="flex items-center text-sm text-slate-500">
                            {detectCategory(tech)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tests" className="scroll-mt-48 mt-8 space-y-6">
          <h3 className="text-xl font-semibold text-white">Performed Tests</h3>
          <Card className="bg-[#0B0C15] border border-white/10 group hover:border-white/20 transition-all">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-200 group-hover:text-white transition-colors">
                    Full Stack Reconnaissance
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
                    The scanner identified the technology stack, analyzed server
                    headers, and fingerprinted client-side frameworks using
                    standard passive and active reconnaissance probes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="params" className="scroll-mt-48 mt-8 space-y-6">
          <h3 className="text-xl font-semibold text-white">Scan Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ParameterCard label="Target URL" value={target} />
            <ParameterCard label="Origin IP" value={sourceIp} />
          </div>
        </section>

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

// --- HELPER COMPONENTS (No Changes Needed Here) ---

function NavButton({ label, onClick, active, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center h-14 px-4 text-sm font-medium transition-all border-b-2 outline-none select-none",
        active
          ? "border-blue-500 text-blue-400 bg-blue-500/5"
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
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <span>{label}</span>
      {count !== undefined && <span className="opacity-70">({count})</span>}
    </button>
  );
}

function TechLogo({ name }: { name: string }) {
  const n = name.charAt(0).toUpperCase();
  let style = "bg-slate-800 text-slate-400 border-white/5";

  const lower = name.toLowerCase();
  if (lower.includes("google"))
    style = "bg-orange-900/20 text-orange-400 border-orange-500/20";
  else if (lower.includes("react"))
    style = "bg-cyan-900/20 text-cyan-400 border-cyan-500/20";
  else if (lower.includes("next"))
    style = "bg-white/10 text-white border-white/20";
  else if (lower.includes("cloud"))
    style = "bg-blue-900/20 text-blue-400 border-blue-500/20";

  return (
    <div
      className={cn(
        "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold border shadow-sm",
        style
      )}
    >
      {n}
    </div>
  );
}

function detectCategory(name: string) {
  const n = name.toLowerCase();
  if (n.includes("react") || n.includes("vue") || n.includes("angular"))
    return "Front-end Framework";
  if (n.includes("next") || n.includes("nuxt")) return "Full-stack Framework";
  if (n.includes("google") && n.includes("analytics")) return "Analytics";
  if (n.includes("security") || n.includes("hsts")) return "Security Header";
  if (n.includes("cloudflare") || n.includes("fastly")) return "CDN / WAF";
  return "Library / Module";
}
