"use client";

import React from "react";
import Link from "next/link";
import {
  Globe, Zap, FileText, Terminal, Crosshair,
  Activity, Code2, Bug, Radar, Play, ShieldAlert, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PURPLE ADVERSARIAL STYLES
 * Add these to your globals.css:
 * * @keyframes marquee {
 * 0% { transform: translateX(0); }
 * 100% { transform: translateX(-50%); }
 * }
 * .animate-marquee { animation: marquee 30s linear infinite; }
 * * @keyframes float {
 * 0%, 100% { transform: translateY(0px) rotateY(-10deg) rotateX(5deg); }
 * 50% { transform: translateY(-15px) rotateY(-5deg) rotateX(2deg); }
 * }
 * .animate-float { animation: float 6s ease-in-out infinite; }
 */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#05010a] text-purple-100 font-sans selection:bg-purple-500/30 overflow-x-hidden">

      {/* --- REFINED PURPLE BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,5,40,1)_0%,rgba(5,1,10,1)_100%)]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-40 animate-pulse bg-[radial-gradient(circle_at_20%_30%,rgba(139,92,246,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(192,38,211,0.15)_0%,transparent_50%)]" />
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]"
          style={{ maskImage: "radial-gradient(ellipse at center, black, transparent 80%)" }}
        />
      </div>

      {/* --- 1. MINIMALIST NAVBAR (No Hamburger) --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-purple-500/10 bg-[#05010a]/80 backdrop-blur-xl h-16 md:h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex items-center justify-between">
          <Link href="/" className="group flex items-center shrink-0">
            <img
              src="/logo.png"
              alt="Pentellia"
              className="h-24 md:h-40 w-auto group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all"
            />
          </Link>

          {/* Nav Links - Hidden on Mobile */}
          <div className="hidden lg:flex items-center gap-10 text-[11px] font-bold tracking-[0.3em] uppercase text-purple-400/60">
            <NavLink href="#platform">Node</NavLink>
            <NavLink href="#briefing">Intelligence</NavLink>
            <NavLink href="#features">Arsenal</NavLink>
            <NavLink href="#workflow">Lifecycle</NavLink>
          </div>

          <div className="flex items-center">
             <Button
              asChild
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-none px-4 md:px-6 h-9 md:h-10 tracking-widest uppercase text-[10px] md:text-xs shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
            >
              <Link href="/dashboard">Initialize Scan</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* --- 2. HERO SECTION --- */}
      <section id="platform" className="relative pt-32 md:pt-48 pb-12 md:pb-20 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            <div className="text-left order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 border-l-2 border-purple-500 bg-purple-500/10 text-purple-300 mb-6 md:mb-8 font-mono text-[9px] md:text-[10px] tracking-[0.4em] uppercase">
                Engineered for Offensive Security operations
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white mb-6 md:mb-8 leading-[1.1] md:leading-[0.85] uppercase">
                Adversarial <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400">
                  Intelligence
                </span>
              </h1>

              <p className="text-base md:text-lg text-purple-200/60 mb-8 md:mb-10 max-w-lg leading-relaxed font-light">
                Outperform days of security operations in hours.
                Pentellia is an AI-based adversarial security platform
                built to protect your organization.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-none px-8 md:px-10 h-14 md:h-16 uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all shadow-lg shadow-purple-900/40 w-full sm:w-auto">
                  Deploy Arsenal
                </Button>
                <Button size="lg" variant="outline" className="border-purple-500/20 hover:bg-purple-500/5 text-purple-300 rounded-none px-8 md:px-10 h-14 md:h-16 uppercase font-bold tracking-[0.2em] text-[10px] md:text-xs transition-all w-full sm:w-auto">
                  Briefing V1.1
                </Button>
              </div>
            </div>

            <div className="relative perspective-2000 order-1 lg:order-2">
              <div className="relative z-10 animate-float transform-gpu border border-purple-500/20 rounded-lg overflow-hidden shadow-[0_40px_80px_rgba(88,28,135,0.4)] bg-[#0b0c15] p-1">
                <img
                  src="/dashboard.png"
                  alt="Pentellia Interface"
                  className="w-full h-auto opacity-90 transition-opacity"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/1200x800/0b0c15/a855f7?text=Pentellia+Dashboard";
                  }}
                />
              </div>
              <div className="absolute -top-4 md:-top-6 -right-4 md:-right-6 w-20 md:w-32 h-20 md:h-32 border-t border-r border-purple-500/30" />
              <div className="absolute -bottom-4 md:-bottom-6 -left-4 md:-left-6 w-20 md:w-32 h-20 md:h-32 border-b border-l border-purple-500/30" />
            </div>
          </div>
        </div>
      </section>

      {/* --- 3. FLOATING MARQUEE --- */}
      <section className="relative z-20 py-6 md:py-10">
        <div className="max-w-full overflow-hidden border-y border-purple-500/10 bg-purple-950/20 backdrop-blur-md py-4 md:py-6 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
          <div className="flex animate-marquee whitespace-nowrap">
            <ToolGroup />
            <ToolGroup />
          </div>
        </div>
      </section>

      {/* --- 4. INTELLIGENCE BRIEFING (VIDEO) --- */}
      <section id="briefing" className="py-16 md:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-20 items-center">

            <div className="lg:col-span-3 relative group">
              <div className="relative aspect-video overflow-hidden rounded-sm border border-purple-500/20 shadow-2xl bg-black">
                <video
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-1000"
                  controls
                  playsInline
                >
                  <source src="/ceo-briefing.mp4" type="video/mp4" />
                </video>
                <div className="absolute top-2 md:top-4 right-2 md:right-4 flex items-center gap-2 px-2 md:px-3 py-1 bg-purple-600/20 border border-purple-600/40 text-purple-400 text-[8px] md:text-[9px] font-mono tracking-widest uppercase animate-pulse">
                  <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-purple-500" />
                  IndiaAI Impact Summit
                </div>
              </div>
              <div className="absolute -bottom-3 md:-bottom-4 -left-3 md:-left-4 px-3 md:px-5 py-1 md:py-2 bg-purple-600 text-white font-mono text-[8px] md:text-[10px] font-bold tracking-[0.3em] uppercase">
                Sandeep Verma // Director & CEO
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-xs font-mono text-purple-500 uppercase tracking-[0.4em] mb-4">Adversarial Reveal</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white uppercase mb-6 md:mb-8 leading-tight tracking-tight">Our AI Can <br /> <span className="text-purple-500">Hack You!</span></h3>
              <p className="text-sm md:text-base text-purple-200/60 mb-8 md:mb-10 font-light leading-relaxed">
                Nothing beats our Pentellia Offensive Mode. It thinks like an attacker,
                not a machine bound by automation.
              </p>
              <div className="space-y-3 md:space-y-4">
                <TechnicalDetail label="Network Security" value="v1.1 Active" />
                <TechnicalDetail label="Research & Dev" value="Encorders Pro" />
                <TechnicalDetail label="Operational Speed" value="Machine Speed" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- 5. CORE ARSENAL --- */}
      <section id="features" className="py-16 md:py-32 relative z-10 border-t border-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-xs font-mono text-purple-400 uppercase tracking-[0.6em] mb-4">Capabilities</h2>
          <h3 className="text-3xl md:text-5xl font-black text-white uppercase mb-12 md:mb-24">Offensive Arsenal</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 text-left">
            <CyberCard icon={Globe} accentColor="purple" title="Target Recon" desc="Deep-layer asset discovery including hidden subdomains." />
            <CyberCard icon={Crosshair} accentColor="fuchsia" title="Vuln Analysis" desc="Detect vulnerabilities in minutes with higher accuracy." />
            <CyberCard icon={ShieldAlert} accentColor="indigo" title="Safe Exploit" desc="Validation of vulnerabilities without production downtime." />
          </div>
        </div>
      </section>

      {/* --- 6. TERMINAL SIMULATION --- */}
      <section className="py-16 md:py-24 relative z-10 bg-purple-950/10 border-y border-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-purple-500/30 bg-purple-500/5 text-purple-400 mb-6 font-mono text-[10px] tracking-widest uppercase animate-pulse">
                <Activity className="h-3 w-3" />
                Live Offensive Mode
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 uppercase tracking-tight leading-none">
                Works on your <br />
                <span className="text-purple-500">Terminal</span>
              </h2>
              <p className="text-sm md:text-base text-purple-200/60 mb-10 leading-relaxed font-light">
                Takes just a few seconds to setup. Watch as Pentellia bypasses WAFs.
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-[#070110] p-1 shadow-[0_0_60px_rgba(168,85,247,0.1)] relative overflow-hidden order-1 lg:order-2">
              <div className="bg-black/90 p-4 md:p-6 font-mono text-[10px] md:text-[11px] leading-relaxed h-[300px] md:h-[380px] overflow-hidden">
                <div className="text-purple-500/50 mb-4 flex justify-between border-b border-purple-500/10 pb-2">
                  <span>v3rma@v3rma: (Offensive) $</span>
                </div>
                <div className="text-purple-200 space-y-1">
                   <p className="text-purple-400">Switched to AGENTIC mode.</p>
                   <p className="text-fuchsia-500">Checking open ports on 192.168.29.213...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 7. CTA SECTION --- */}
      <section className="py-40 relative z-10 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative p-16 border border-purple-500/20 bg-[#05010a] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-fuchsia-900/10 opacity-40 group-hover:opacity-100 transition-opacity duration-700" />
            <Terminal className="h-12 w-12 text-purple-400 mx-auto mb-8" />
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 uppercase tracking-tighter">
              Before They Do.
            </h2>
            <Button asChild size="lg" className="h-16 px-14 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm rounded-none tracking-[0.3em] uppercase transition-all shadow-2xl">
              <Link href="/dashboard">Initiate {"->"}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- 8. FOOTER --- */}
      <footer className="border-t border-purple-500/10 bg-[#05010a] pt-16 md:pt-24 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-16 mb-16">
            <div className="col-span-1 text-center md:text-left">
              <img src="/logo.png" alt="Pentellia" className="h-20 md:h-32 w-auto mb-6 mx-auto md:mx-0 opacity-80" />
              <p className="text-[10px] text-purple-500/50 font-mono uppercase tracking-widest leading-loose">
                Adversarial AI Operations Core.<br />
                © 2026 Encorders Pro.
              </p>
            </div>
            <FooterSection title="Platform">
              <FooterLink>Adversarial AI</FooterLink>
            </FooterSection>
            <FooterSection title="Intelligence">
              <FooterLink>Director Sandeep Verma</FooterLink>
            </FooterSection>
            <FooterSection title="Connect">
              <FooterLink>IndiaAI Summit</FooterLink>
            </FooterSection>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative group overflow-hidden py-1">
      <span className="block group-hover:-translate-y-full transition-transform duration-300">
        {children}
      </span>
      <span className="absolute top-full left-0 block text-purple-400 transition-transform duration-300 group-hover:-translate-y-full">
        {children}
      </span>
    </Link>
  );
}

function TechnicalDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-purple-500/10 pb-2 md:pb-3">
      <span className="text-[9px] md:text-[10px] font-mono text-purple-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs md:text-xs font-bold text-white uppercase">{value}</span>
    </div>
  );
}

function ToolGroup() {
  return (
    <div className="flex items-center gap-0">
      <ToolStreamItem label="NMAP" status="ONLINE" />
      <ToolStreamItem label="NUCLEI" status="ACTIVE" />
      <ToolStreamItem label="OFFENSIVE" status="ACTIVE" />
    </div>
  );
}

function ToolStreamItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center gap-4 mx-8 md:mx-12 font-mono uppercase tracking-[0.2em] flex-shrink-0">
      <div className="h-1 w-1 rounded-full bg-purple-900" />
      <span className="text-[10px] md:text-[11px] text-purple-400 font-bold">{label}</span>
      <span className={cn("text-[8px] md:text-[9px] px-2 py-0.5 border border-purple-500/20 bg-black",
        status === "ONLINE" ? "text-fuchsia-400" : "text-purple-400")}>
        [{status}]
      </span>
    </div>
  );
}

function CyberCard({ icon: Icon, title, desc, accentColor }: any) {
  const colors: Record<string, string> = {
    purple: "border-purple-500/20 text-purple-400 hover:shadow-purple-500/20",
    fuchsia: "border-fuchsia-500/20 text-fuchsia-400 hover:shadow-fuchsia-500/20",
    indigo: "border-indigo-500/20 text-indigo-400 hover:shadow-indigo-500/20",
  };
  return (
    <div className={cn("group relative p-6 md:p-10 border backdrop-blur-sm transition-all duration-500 hover:-translate-y-2", colors[accentColor])}>
      <Icon className="h-8 md:h-10 w-8 md:w-10 mb-6 md:mb-8 transition-transform group-hover:scale-110" />
      <h4 className="text-base md:text-lg font-bold text-white uppercase mb-4 tracking-tight">{title}</h4>
      <p className="text-xs text-purple-200/60 leading-relaxed font-light">{desc}</p>
    </div>
  );
}

function FooterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h4 className="text-purple-300 font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px]">{title}</h4>
      <div className="flex flex-col gap-3 md:gap-4">{children}</div>
    </div>
  );
}

function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="#" className="text-[10px] md:text-[11px] text-purple-500/60 hover:text-purple-400 transition-colors tracking-widest font-mono uppercase flex items-center gap-2 group">
      <div className="h-px w-2 md:w-3 bg-purple-900 group-hover:bg-purple-500 transition-all" />
      {children}
    </Link>
  );
}