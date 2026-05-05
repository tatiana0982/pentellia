"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Shield, RefreshCw, Terminal, Sparkles,
  Bot, ChevronDown, ChevronUp, Loader2, BrainCircuit, Cpu,
  ShieldAlert, Activity, Zap, Network, Server, Radio, GlobeLock,
  FileText, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";

import { CommonScanReport } from "@/lib/Common";
import { AssetDiscoveryReport } from "@/lib/AssetDiscoveryReport";
import { triggerNotificationRefresh, triggerFullRefresh } from "@/lib/events";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "paused";

interface ScanResult {
  id:            string;
  status:        ScanStatus;
  target:        string;
  tool_name:     string;
  tool_id?:      string;
  created_at:    string;
  completed_at?: string;
  result?:       any;
}

// ─────────────────────────────────────────────────────────────────────
// AI Rich Renderer
// ─────────────────────────────────────────────────────────────────────

const AIRichRenderer = ({ content }: { content: string }) => (
  <div className="relative space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
    <div className="absolute -left-6 md:-left-10 top-0 w-1 h-full bg-gradient-to-b from-indigo-500/20 via-fuchsia-500/10 to-transparent hidden md:block" />
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6 md:mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-slate-400 leading-tight">{children}</h1>
        ),
        h2: ({ children }) => (
          <div className="flex items-center gap-3 md:gap-4 mt-12 mb-6 group">
            <div className="h-[2px] w-8 md:w-12 bg-gradient-to-r from-indigo-500 to-fuchsia-500 group-hover:w-16 transition-all duration-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">{children}</h2>
          </div>
        ),
        h3: ({ children }) => (
          <h3 className="text-base md:text-lg font-bold text-slate-100 mt-8 mb-3 flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-white/5 border border-white/10 shrink-0">
              <Zap className="h-4 w-4 text-indigo-400" />
            </div>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-base md:text-[1.1rem] leading-[1.8] text-slate-300 font-normal mb-6 text-left selection:bg-indigo-500/30">{children}</p>
        ),
        ul: ({ children }) => <ul className="space-y-4 md:space-y-5 my-6 ml-1 md:ml-2 text-left">{children}</ul>,
        li: ({ children }) => (
          <li className="flex items-start gap-4 group">
            <div className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10 group-hover:scale-125 group-hover:bg-fuchsia-400 transition-all duration-300" />
            <span className="text-slate-300 group-hover:text-white transition-colors leading-[1.8] text-base md:text-[1.1rem] text-left">{children}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <div className="my-8 md:my-10 p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500 text-left">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-fuchsia-500" />
            <div className="text-indigo-100/90 leading-[1.8] font-medium relative z-10 text-base md:text-[1.1rem]">{children}</div>
          </div>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-white px-1.5 py-0.5 rounded bg-white/5 border-b border-white/10 shadow-sm mx-0.5">{children}</strong>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// AI Summary section — always shown on completed scans
// ─────────────────────────────────────────────────────────────────────

function AiSummarySection({
  summary, isGenerating, isLoadedFromCache, onGenerate,
}: {
  summary:           string;
  isGenerating:      boolean;
  isLoadedFromCache: boolean;
  onGenerate:        () => void;
}) {
  return (
    <div className="mt-12 bg-[#05050A]/80 border border-indigo-500/25 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/8 blur-[150px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-500/8 blur-[150px] pointer-events-none -translate-x-1/2 translate-y-1/2" />

      {/* Header */}
      <div className="px-8 md:px-14 pt-10 md:pt-14 pb-8 border-b border-white/8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/8 rounded-2xl border border-indigo-500/25 shadow-inner">
              <Bot className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Executive Security Analysis
                </h3>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 font-mono text-[10px] tracking-widest uppercase hidden md:inline-flex">
                  AI Synthesis
                </Badge>
              </div>
              <p className="text-slate-500 text-sm">
                Automated threat intelligence compiled from scan findings
              </p>
            </div>
          </div>

          {/* State indicator */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border w-fit shrink-0 bg-white/[0.03]
            border-white/10">
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Synthesizing</span>
              </>
            ) : isLoadedFromCache && summary ? (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Cached</span>
              </>
            ) : summary ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Generated</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-slate-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Not Generated</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-8 md:px-14 py-10 relative z-10">

        {/* Streaming in progress */}
        {isGenerating && summary && (
          <div className="max-w-5xl mx-auto text-left">
            <AIRichRenderer content={summary} />
            <div className="flex items-center gap-3 mt-8 px-5 py-3 rounded-xl bg-violet-500/8 border border-violet-500/15 w-fit">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span className="text-xs text-violet-400 font-mono uppercase tracking-wider">Processing intelligence feed</span>
            </div>
          </div>
        )}

        {/* Generating but no content yet */}
        {isGenerating && !summary && (
          <div className="space-y-4 animate-pulse">
            {[70, 100, 85, 60, 90, 75, 50].map((w, i) => (
              <div key={i} className={`h-4 rounded-lg bg-white/5`} style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {/* Completed summary */}
        {!isGenerating && summary && (
          <div className="max-w-5xl mx-auto text-left">
            <AIRichRenderer content={summary} />
          </div>
        )}

        {/* Empty state — no summary exists */}
        {!isGenerating && !summary && (
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 py-6">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-slate-500/10 blur-[40px] rounded-full" />
              <div className="relative flex items-center justify-center h-16 w-16 border border-white/10 rounded-2xl bg-white/[0.03]">
                <FileText className="h-7 w-7 text-slate-500" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-base font-semibold text-slate-300 mb-2">
                No executive summary for this scan
              </h4>
              <p className="text-slate-500 text-sm leading-relaxed max-w-lg mb-6">
                Generate an AI-powered executive analysis that translates raw vulnerability data into prioritised findings, business risk assessment, and actionable remediation steps for technical and non-technical stakeholders.
              </p>
              <Button
                onClick={onGenerate}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] px-6 h-11 rounded-xl font-semibold transition-all"
              >
                <BrainCircuit className="mr-2 h-4 w-4" />
                Generate Executive Summary
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Background, loading, running state — unchanged from before
// ─────────────────────────────────────────────────────────────────────

const CyberBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#030308]" />
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/10 blur-[120px]" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-900/10 blur-[120px]" />
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
      backgroundSize: "4rem 4rem",
      maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 10%, transparent 100%)",
      WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 10%, transparent 100%)",
    }} />
  </div>
);

function GlobalLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#030308] relative overflow-hidden px-4 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-[#030308] to-[#030308]" />
      <div className="relative flex flex-col items-center gap-6 z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/30 blur-[50px] rounded-full" />
          <div className="h-20 w-20 rounded-full border-t-2 border-l-2 border-violet-500 animate-[spin_1.5s_cubic-bezier(0.68,-0.55,0.265,1.55)_infinite]" />
          <div className="absolute inset-2 rounded-full border-b-2 border-r-2 border-fuchsia-500 animate-[spin_1s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white/50 animate-pulse" />
          </div>
        </div>
        <div>
          <span className="text-white font-bold text-sm uppercase tracking-wide block">Establishing Secure Session</span>
          <span className="text-violet-400/70 font-mono text-[10px] uppercase animate-pulse block mt-1">Encrypted connection active</span>
        </div>
      </div>
    </div>
  );
}

// Real-state progress — NO fake time-based simulation
// Uses actual backend percentage if available, otherwise indeterminate
function getStepProgress(scan: ScanResult): { pct: number | null; label: string; indeterminate: boolean } {
  const raw = scan.result?.progress?.percentage;
  // Real backend % — use it
  if (typeof raw === "number" && raw > 0 && raw <= 100) {
    return { pct: raw, label: scan.result?.progress?.current_description || "", indeterminate: false };
  }
  // Status-only — no fake math
  if (scan.status === "queued")  return { pct: null, label: "Queued — waiting for engine...",   indeterminate: true };
  if (scan.status === "running") return { pct: null, label: scan.result?.progress?.current_description || "Running intelligence modules...", indeterminate: true };
  return { pct: null, label: "Initializing...", indeterminate: true };
}

function RunningStateView({ scan, confirmations, onConfirm, isConfirming }: {
  scan: ScanResult; confirmations: any[]; isConfirming: boolean;
  onConfirm: (reqId: string, response: string, action?: "single" | "all") => void;
}) {
  const [logsOpen, setLogsOpen] = useState(true);
  const { pct, label: stepLabel, indeterminate } = getStepProgress(scan);
  const currentStep    = scan.result?.progress?.current_description || stepLabel || "Initializing Scan Core...";
  const completedTools: string[] = scan.result?.progress?.completed_steps || [];
  const pendingConf    = confirmations.find((c: any) => c.status === "pending");

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-1000 mt-6 md:mt-10">
      <div className="bg-[#05050A]/60 border border-white/5 rounded-3xl md:rounded-[3rem] p-6 md:p-16 shadow-2xl relative overflow-hidden text-center backdrop-blur-xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-violet-600/10 blur-[100px] pointer-events-none" />
        <div className="space-y-10 relative z-10">
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center h-24 w-24 rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10">
              <Radio className="h-10 w-10 text-violet-400 absolute animate-ping opacity-15" />
              <RefreshCw className="h-9 w-9 text-violet-300 animate-[spin_3s_linear_infinite]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                Active Intelligence Gathering
              </h3>
              <p className="text-fuchsia-400 font-mono text-xs uppercase flex items-center justify-center gap-3">
                <span className="h-2 w-2 rounded-full bg-fuchsia-500 animate-pulse shrink-0" />
                <span className="truncate max-w-sm">{currentStep}</span>
              </p>
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-2 space-y-4">
            {/* Show real % only if backend provides it, otherwise indeterminate */}
            {pct !== null ? (
              <>
                <div className="flex justify-between items-end">
                  <div><span className="text-slate-500 font-mono text-[10px] uppercase block">Progress</span></div>
                  <span className="text-white text-5xl font-black tabular-nums">{Math.round(pct)}<span className="text-violet-500 text-3xl">%</span></span>
                </div>
                <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                    style={{ width: `${pct}%`, backgroundImage: "linear-gradient(90deg, #6d28d9 0%, #a21caf 100%)" }}>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:20px_20px] animate-[shimmer_1s_infinite_linear]" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">
                    {scan.status === "queued" ? "Queued" : "Running"}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px] animate-pulse">Processing...</span>
                </div>
                {/* Indeterminate shimmer bar — no fake % */}
                <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div className="h-full rounded-full relative overflow-hidden bg-gradient-to-r from-violet-700 to-fuchsia-700"
                    style={{ width: "100%" }}>
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.25)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite_linear] bg-[length:200%_100%]" />
                  </div>
                </div>
              </>
            )}
          </div>
          <AlertDialog open={!!pendingConf}>
            <AlertDialogContent className="bg-[#0A0505] border border-blue-500/30 text-slate-200 rounded-2xl p-0 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
              <AlertDialogHeader className="p-6 md:p-8 pb-4">
                <AlertDialogTitle className="flex items-center gap-3 text-xl text-white font-bold">
                  <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20"><Activity className="h-6 w-6 text-blue-400 animate-pulse" /></div>
                  Interactive Prompt Required
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300 text-sm leading-relaxed mt-4">
                  {pendingConf?.message || pendingConf?.prompt || "Confirmation required to proceed."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="p-6 pt-2 flex flex-col sm:flex-row justify-end gap-3 bg-white/[0.02] border-t border-white/5">
                <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-red-500/10 hover:text-red-400" disabled={isConfirming}
                  onClick={() => onConfirm(pendingConf.request_id || pendingConf.id, "skip")}>Skip Phase</Button>
                {(pendingConf?.prompt?.toLowerCase().includes("subdomain") || pendingConf?.message?.toLowerCase().includes("subdomain")) && (
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isConfirming}
                    onClick={() => onConfirm(pendingConf.request_id || pendingConf.id, "top_10")}>Scan Top 10</Button>
                )}
                <Button className="bg-blue-600 hover:bg-blue-500 text-white" disabled={isConfirming}
                  onClick={() => onConfirm(pendingConf.request_id || pendingConf.id, "all")}>
                  {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & Proceed"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="border border-white/10 rounded-[2rem] bg-black/60 backdrop-blur-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <button onClick={() => setLogsOpen(!logsOpen)}
          className="w-full flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors border-b border-white/5 group">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <span className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase group-hover:text-white transition-colors">
              <Terminal className="h-4 w-4 text-violet-500" /> Execution Logs
            </span>
          </div>
          {logsOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        {logsOpen && (
          <ScrollArea className="h-64 px-6 py-5 font-mono text-[11px] leading-relaxed">
            <div className="space-y-3">
              <div className="flex gap-6 pb-3 border-b border-white/5 opacity-50">
                <span className="text-violet-400">root@pentellia:~#</span>
                <span className="text-slate-300">tail -f /var/log/scan_{scan.id.slice(0, 6)}.log</span>
              </div>
              {completedTools.map((t, i) => (
                <div key={t} className="flex gap-6 items-start animate-in fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="text-emerald-400 font-bold shrink-0 w-20">[ OK ]</span>
                  <span className="text-slate-300">Module <span className="text-white font-bold">{t.toUpperCase()}</span> completed.</span>
                </div>
              ))}
              <div className="flex gap-6 items-start animate-pulse">
                <span className="text-violet-400 font-bold shrink-0 w-20">[ EXEC ]</span>
                <span className="text-white">{currentStep} <span className="animate-[ping_1.5s_infinite]">_</span></span>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────

export default function ScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [scan,          setScan]          = useState<ScanResult | null>(null);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [polling,       setPolling]       = useState(true);
  const [isAiOpen,      setIsAiOpen]      = useState(false);
  const [isConfirming,  setIsConfirming]  = useState(false);
  const [showCmsModal,  setShowCmsModal]  = useState(false);
  // Keep ref in sync with state so polling closure can read it without restart
  useEffect(() => { showCmsModalRef.current = showCmsModal; }, [showCmsModal]);
  // requestId is the standard confirmation request_id from /confirmations/{job_id}.
  // When present, we respond via POST /confirm/{job_id}/{request_id} (action=single).
  // When absent (this engine's CMS confirmations live inside run_webscan() and
  // aren't enumerable via /confirmations), we broadcast via /confirm-all/{job_id}
  // (action=all) — at Phase 4 the only pending confirmation is the CMS one.
  const [cmsDetails,    setCmsDetails]    = useState<{ detected: string; jobId: string; requestId?: string } | null>(null);

  // AI Summary — plain state, no custom hook
  const [aiSummary,    setAiSummary]    = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiFromCache,  setAiFromCache]  = useState(false);
  const aiGeneratingRef                 = useRef(false);
  const showCmsModalRef                 = useRef(false); // ref so polling doesn't restart on modal open
  // Once the user has answered the CMS modal, lock it shut. The engine takes
  // a few seconds to clear pythonStatus.cms_confirmation_pending and to drop
  // the entry from /confirmations, during which polling would otherwise
  // re-trigger the modal. Reset only on hard failure so retries are possible.
  const cmsRespondedRef                 = useRef(false);

  // ── Reliable polling — time-based intervals, stops on terminal state ─
  // Intervals: first 30s → every 2s | next 2min → every 5s | after → every 10s
  // Uses /stream (lightweight status check, fits Vercel 10s limit).
  // On first load uses /scans/[id] (DB-only, instant).
  useEffect(() => {
    if (!scanId) return;

    // New scan → fresh CMS modal lifecycle. Reset the responded-lock so the
    // modal can open for this scan's CMS confirmation regardless of state
    // left over from any earlier scan navigation.
    cmsRespondedRef.current = false;

    let stopped   = false;
    let timeoutId: NodeJS.Timeout;
    const startedAt = Date.now();

    const getDelay = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 30_000)  return 2_000;   // first 30s  → every 2s
      if (elapsed < 150_000) return 5_000;   // next 2min  → every 5s
      return 10_000;                          // after      → every 10s
    };

    const poll = async (isFirst = false) => {
      if (stopped) return;
      // PART 8: Pause polling when tab is not visible — saves resources
      if (!isFirst && document.hidden) {
        if (!stopped) timeoutId = setTimeout(() => poll(), getDelay());
        return;
      }
      const endpoint = isFirst
        ? `/api/dashboard/scans/${scanId}`         // initial: DB only, instant
        : `/api/dashboard/scans/${scanId}/stream`; // polling: checks Flask status

      try {
        const res  = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (stopped || !data.success) return;

        // FIX: Use pythonStatus only for active scans (progress/logs).
        // On completion, scan.result contains actual findings from DB — never overwrite with pythonStatus.
        const isTerminal = ["completed", "failed", "cancelled"].includes(data.scan?.status);
        const resolvedResult = isTerminal
          ? data.scan.result                              // completed: use DB findings
          : (data.pythonStatus || data.scan.result);     // active: use Flask status for progress
        const scanData: ScanResult = { ...data.scan, result: resolvedResult };
        setScan(prev => {
          // Never downgrade a completed scan to running due to stale poll
          if (prev?.status === "completed" && scanData.status !== "completed") return prev;
          return scanData;
        });
        if (data.confirmations?.length) setConfirmations(data.confirmations);
        if (data.aiSummary && isFirst) { setAiSummary(data.aiSummary); setAiFromCache(true); }

        // ── CMS confirmation detection ──────────────────────────────────
        // Backend WebScan Phase 4 emits a CMS_DETECTED confirmation through
        // the standard /confirmations/{job_id} endpoint (new flow). Older
        // engines also set pythonStatus.cms_confirmation_pending (legacy flag).
        // We accept either source and prefer the standard array because it
        // carries the request_id needed by /confirm/{job_id}/{request_id}.
        //
        // Matching is permissive: type variants, CMS keywords in the message,
        // or — when the legacy flag is set — fall back to the sole pending
        // confirmation in the array on the assumption it's the CMS one.
        const isCmsConf = (c: any): boolean => {
          const status = c?.status;
          if (status && status !== "pending") return false;
          const t = String(c?.type    ?? "").toLowerCase();
          const m = String(c?.message ?? c?.prompt ?? "").toLowerCase();
          if (t === "cms_detected" || t.includes("cms")) return true;
          if (m.includes("wordpress") || m.includes("drupal") || m.includes("joomla")) return true;
          if (m.includes("wpscan")    || m.includes("droopescan") || m.includes("joomscan")) return true;
          return false;
        };

        let cmsConfFromArray = (data.confirmations || []).find(isCmsConf);
        const cmsLegacyFlag  = data.pythonStatus?.cms_confirmation_pending;

        if (!cmsConfFromArray && cmsLegacyFlag) {
          const pending = (data.confirmations || []).filter(
            (c: any) => !c?.status || c?.status === "pending",
          );
          if (pending.length === 1) cmsConfFromArray = pending[0];
        }

        // ── Stale-modal guard ──────────────────────────────────────────
        // Phase 4 has a hard 60-second window on the engine
        // (wait_for_cms_confirmation, f.py line ~903). After timeout the
        // engine runs cleanup_cms_confirmation() which deletes the dict
        // entry and clears the cms_confirmation_pending flag. If the modal
        // is still showing at that point, any click gets "No CMS
        // confirmation pending for this job" because the dict entry is
        // gone. Close the modal as soon as we observe either:
        //   (a) the legacy flag has dropped AND there's no CMS entry in
        //       the standard confirmations array (engine moved past Phase 4)
        //   (b) the scan has reached a terminal state (completed/failed/
        //       cancelled) — no Phase 4 at all anymore
        // We mark cmsRespondedRef so the modal won't reopen on subsequent
        // polls; close silently because no user action is required.
        const scanIsTerminal = ["completed", "failed", "cancelled"]
          .includes(scanData.status);

        if (
          showCmsModalRef.current &&
          !cmsRespondedRef.current &&
          (scanIsTerminal || (!cmsConfFromArray && !cmsLegacyFlag))
        ) {
          setShowCmsModal(false);
          cmsRespondedRef.current = true;
        }

        if (
          (cmsConfFromArray || cmsLegacyFlag) &&
          !showCmsModalRef.current &&
          !cmsRespondedRef.current &&
          !scanIsTerminal
        ) {
          // Resolve detected CMS name: legacy field first, otherwise parse from message.
          let detected: string | undefined = data.pythonStatus?.detected_cms;
          if (!detected && cmsConfFromArray) {
            const msg = String(cmsConfFromArray.message || cmsConfFromArray.prompt || "");
            const m   = msg.match(/(WordPress|Drupal|Joomla|SharePoint)/i);
            if (m) detected = m[1];
          }
          setCmsDetails({
            detected:  detected || "Unknown CMS",
            jobId:     data.pythonStatus?.job_id,
            requestId: cmsConfFromArray?.request_id || cmsConfFromArray?.id,
          });
          setShowCmsModal(true);
        }

        if (["completed", "failed", "cancelled"].includes(scanData.status)) {
          stopped = true;
          setPolling(false);
          if (scanData.status === "completed") {
            toast.success("Scan completed!", {
              icon: "✅",
              style: { background: "#0B0C15", color: "#fff", border: "1px solid rgba(139,92,246,0.3)" },
              duration: 4000,
            });
            triggerFullRefresh();
          }
          if (scanData.status === "failed") {
            toast.error("Scan failed. Check logs for details.", {
              style: { background: "#0B0C15", color: "#fff" },
            });
          }
          return;
        }
      } catch { /* network blip — retry on next tick */ }

      if (!stopped) {
        timeoutId = setTimeout(() => poll(), getDelay());
      }
    };

    // Immediate first fetch (no delay), then start interval loop
    poll(true).then(() => {
      if (!stopped) timeoutId = setTimeout(() => poll(), getDelay());
    });

    // Part 2: Resume polling immediately when tab becomes visible again
    // (avoids waiting for next scheduled tick after long background period)
    const onVisible = () => {
      if (!stopped && !document.hidden) {
        clearTimeout(timeoutId);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]); // showCmsModal intentionally excluded — use ref to avoid restart

  // ── Generate AI Summary ──────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (aiGeneratingRef.current) return;
    if (scan?.status !== "completed") return;
    if (!scan?.result) return;
    if (aiSummary) return; // already have it

    aiGeneratingRef.current = true;
    setAiGenerating(true);
    setAiSummary("");

    try {
      const res = await fetch("/api/ai/summarize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: scan.tool_name,
          scanData: scan.result,
          scanId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "AI service error" }));
        toast.error(err.message ?? "Summary generation failed.");
        return;
      }

      const ct = res.headers.get("content-type") ?? "";

      // Cached JSON path
      if (ct.includes("application/json")) {
        const d = await res.json();
        if (d.cached && d.content) { setAiSummary(d.content); setAiFromCache(true); }
        return;
      }

      // Streaming path — parse SSE format: data: {"content":"..."}


      if (!res.body) { toast.error("No stream received."); return; }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   full    = "";
      let   buf     = "";   // incomplete line buffer

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });

        // Process all complete SSE lines in buffer
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";   // last element may be incomplete

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const { content } = JSON.parse(payload);
            if (content) {
              full += content;
              setAiSummary((p) => p + content);
            }
          } catch { /* skip malformed chunk */ }
        }
      }

      if (full) { triggerNotificationRefresh(); }
    } catch (err: any) {
      toast.error(err.message ?? "Generation failed.");
      setAiSummary("");
    } finally {
      setAiGenerating(false);
      aiGeneratingRef.current = false;
    }
  }, [aiSummary, scan, scanId]);

  // Open modal + trigger generation if no summary yet
  const handleAiBriefClick = () => {
    setIsAiOpen(true);
    if (!aiSummary) handleGenerate();
  };

  // ── "No Issues Found" DOM fix ─────────────────────────────────────
  useEffect(() => {
    if (scan?.status !== "completed") return;
    const observer = new MutationObserver(() => {
      Array.from(document.querySelectorAll("h1,h2,h3,h4,p,span"))
        .filter((el) => el.textContent?.includes("No Issues Found") || el.textContent?.includes("No vulnerabilities match"))
        .forEach((el) => {
          let c = el.parentElement;
          while (c && !c.className.includes("border") && c.tagName !== "DIV") c = c.parentElement;
          if (c?.parentElement) {
            const b = (c.closest("div.border") || c) as HTMLElement;
            const t = Array.from(document.querySelectorAll("button")).find(
              (btn) => (btn.textContent?.includes("Low") || btn.textContent?.includes("Info")) &&
                       (btn.className.includes("text-indigo") || btn.className.includes("text-violet")),
            );
            b.style.display = t ? "none" : "";
          }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scan?.status]);

  // ── Format scan data ──────────────────────────────────────────────
  const processedData = useMemo(() => {
    if (!scan?.result) return scan?.result;
    try {
      const cloned = JSON.parse(JSON.stringify(scan.result));
      const fmt = (t: string) => typeof t !== "string" ? t : t
        .replace(/(This occurs because|This affects|The impact is|The vulnerability allows)/gi, "\n\n**Context:** $1")
        .replace(/(For example,|For instance,)/gi, "\n\n**Example:** $1")
        .replace(/(NOTE:)/g, "\n\n**Note:**")
        .replace(/(\(CVSS[^)]+\))/gi, "\n\n**$1**")
        .replace(/([a-z])\.\s+([A-Z])/g, "$1.\n\n$2")
        .replace(/\n{3,}/g, "\n\n").trim();
      const traverse = (obj: any) => {
        if (Array.isArray(obj)) { obj.forEach(traverse); return; }
        if (obj !== null && typeof obj === "object") {
          if (obj.description) obj.description = fmt(obj.description);
          if (obj.desc)        obj.desc         = fmt(obj.desc);
          if (obj.remediation) obj.remediation  = fmt(obj.remediation);
          Object.values(obj).forEach(traverse);
        }
      };
      traverse(cloned);
      return cloned;
    } catch { return scan.result; }
  }, [scan?.result]);

  // ── Other handlers ─────────────────────────────────────────────────
  const handleExport = async () => {
    if (!scan) return;
    const tid = toast.loading("Finalizing PDF...", { style: { background: "#0B0C15", color: "#fff" } });
    try {
      const res = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...scan, ai_summary: aiSummary }) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Export failed");
      }
      const blob = await res.blob(), url = window.URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = `Pentellia_Report_${scan.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      toast.success("Report exported", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Export failed", { id: tid });
    }
  };

  // ── CMS confirmation handler ────────────────────────────────────────
  // The engine handles CMS confirmations through a bespoke `_cms_confirmations`
  // dict (f.py lines 835–940), NOT through the standard ConfirmationManager.
  // The only endpoint that touches that dict is POST /confirm-cms/{job_id} with
  // body { confirm: bool } — which the legacy /api/dashboard/scans/[id] route
  // forwards to. Hitting /confirm-all or /confirm/{job}/{req} returns 200 OK
  // but doesn't unblock the worker, so wait_for_cms_confirmation() times out
  // and the result comes back with `skipped_reason: "User declined or
  // confirmation timed out"` even though the user clicked Activate.
  //
  // Therefore: ALWAYS use the legacy URL for CMS regardless of whether we
  // captured a request_id during polling. (The /confirm route is still the
  // right path for discovery / authtest / any tool that goes through
  // ConfirmationManager — see handleInteractiveConfirm below — but those are
  // called from the running-state generic modal, not this CMS modal.)
  //
  // Once the click is in flight we lock the modal closed via cmsRespondedRef
  // so polling can't re-open it while the engine drains the bespoke dict.
  // On a hard failure we release the lock so the user can retry.
  const handleCmsAction = async (confirm: boolean) => {
    if (!cmsDetails) return;
    setIsConfirming(true);
    cmsRespondedRef.current = true; // optimistic lock — released on retriable failure
    try {
      const res = await fetch(`/api/dashboard/scans/${scanId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          confirm,
          external_job_id: cmsDetails.jobId,
        }),
      });

      if (res.ok) {
        toast.success(confirm ? "Deep scan modules activated" : "Bypassed");
        setShowCmsModal(false);
        // Lock stays engaged — modal will not reopen even if polling still
        // sees the legacy `cms_confirmation_pending` flag for a few seconds
        // while the engine drains its bespoke dict and clears the flag.
        return;
      }

      // Non-OK: extract the engine's actual reason and decide if it's a
      // retriable failure or a "the engine has already moved on" condition.
      let msg = "Confirmation failed";
      try {
        const errData = await res.json();
        msg = errData?.error || errData?.message || msg;
      } catch { /* keep generic */ }

      const lower = String(msg).toLowerCase();
      const movedPast =
        // "No CMS confirmation pending for this job" — bespoke dict cleaned
        // up because cms_confirm_timeout (60s) fired before the click landed.
        (lower.includes("no") && lower.includes("pending")) ||
        lower.includes("expired") ||
        lower.includes("already") ||
        lower.includes("not found");

      if (movedPast) {
        // Engine has moved past Phase 4 — the click can't take effect, but
        // the scan is continuing on its own. Close the modal silently so the
        // user isn't stuck staring at it. Lock stays engaged.
        setShowCmsModal(false);
        toast(confirm ? "Engine already advanced past this phase" : "Bypassed", {
          icon:  "ℹ️",
          style: { background: "#0B0C15", color: "#fff", border: "1px solid rgba(139,92,246,0.3)" },
        });
      } else {
        // Real, retriable failure — release the lock and keep modal open.
        cmsRespondedRef.current = false;
        toast.error(msg);
      }
    } catch {
      cmsRespondedRef.current = false;
      toast.error("Connection error");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleInteractiveConfirm = async (request_id: string, responseAction: string, actionType: "single" | "all" = "single") => {
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/dashboard/scans/${scanId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionType, request_id, response: responseAction }) });
      if (res.ok) { toast.success(`${responseAction.toUpperCase()} sent`); setConfirmations((p) => actionType === "all" ? [] : p.filter((c) => c.request_id !== request_id)); }
      else toast.error("Confirmation failed");
    } catch { toast.error("Network error"); } finally { setIsConfirming(false); }
  };

  if (!scan) return <GlobalLoadingState />;

  const isActive    = (["queued", "running", "paused"] as ScanStatus[]).includes(scan.status);
  const isCompleted = scan.status === "completed";

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative font-sans text-slate-200 overflow-y-auto custom-scrollbar selection:bg-violet-500/30">
      <CyberBackground />

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030308]/80 backdrop-blur-2xl px-4 md:px-6 py-4 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col w-full md:w-auto">
            <div className="flex items-center gap-3 text-[10px] uppercase text-violet-400 font-bold mb-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
                <GlobeLock className="h-3 w-3" /><span>Encrypted Channel</span>
              </div>
              <span className="opacity-50">|</span>
              <span>Session {scan.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}
                className="h-10 w-10 shrink-0 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                  <span className="truncate max-w-xs">{scan.tool_name}</span>
                  <Badge variant="outline" className="bg-white/5 text-slate-400 border-white/10 font-mono text-xs hidden sm:flex">v4.2.0</Badge>
                </h1>
                <p className="text-slate-500 text-xs font-mono mt-0.5">
                  Target: <span className="text-violet-300">{scan.target}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="hidden xl:flex items-center gap-4 mr-2 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-2xl shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-500 uppercase">Sys: Optimal</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Server className="h-3 w-3 text-slate-600" />
                <span className="text-[10px] font-mono text-slate-500 uppercase">24ms</span>
              </div>
            </div>

            {/* AI Brief button — opens focused modal */}
            <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAiBriefClick} disabled={!isCompleted}
                  className="relative group bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-[0_0_20px_rgba(139,92,246,0.3)] px-6 h-11 rounded-xl transition-all active:scale-95 disabled:opacity-30 overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  <span className="font-semibold text-sm">{aiSummary ? "View Analysis" : "AI Analysis"}</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-[#05050A]/95 backdrop-blur-3xl border border-white/10 text-slate-200 w-[95vw] md:max-w-5xl p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-2xl sm:rounded-[2rem]">
                <DialogHeader className="px-6 py-6 md:px-10 md:py-8 bg-gradient-to-b from-violet-500/[0.05] to-transparent border-b border-white/5 relative">
                  <div className="absolute top-0 right-0 w-[400px] h-[100px] bg-violet-500/15 blur-[80px] pointer-events-none" />
                  <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-fuchsia-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-fuchsia-400 tracking-widest">Analysis Core</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10"><Bot className="h-5 w-5 text-violet-400" /></div>
                        Executive Security Analysis
                      </h2>
                    </div>
                    {aiGenerating && (
                      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 self-start sm:self-auto">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                        <span className="text-[11px] font-bold text-violet-300 uppercase">Compiling</span>
                      </div>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[65vh] px-6 md:px-14 py-8 relative">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf60a_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
                  <div className="relative z-10 max-w-4xl mx-auto">
                    {aiSummary ? (
                      <AIRichRenderer content={aiSummary} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[45vh] text-center">
                        <div className="relative mb-8">
                          <div className="absolute inset-0 bg-violet-500/20 blur-[60px] rounded-full" />
                          <div className="relative flex items-center justify-center h-24 w-24 border border-violet-500/30 rounded-full bg-violet-500/5">
                            <Cpu className="h-10 w-10 text-violet-400 animate-[spin_6s_linear_infinite]" />
                            <div className="absolute inset-0 border-t-2 border-fuchsia-500 rounded-full animate-[spin_2s_linear_infinite]" />
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Synthesizing Intelligence</h3>
                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Parsing threat vectors and compiling executive-grade security analysis.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#05050A] to-transparent pointer-events-none" />
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleExport} disabled={!isCompleted}
              className="border-white/10 bg-white/[0.02] hover:bg-white/10 rounded-xl h-11 px-4 md:px-6 text-slate-300 font-medium transition-all shrink-0">
              <Download className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Export PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto w-full p-4 md:p-8 lg:p-12 relative z-10">
        {isActive ? (
          <RunningStateView scan={scan} confirmations={confirmations} onConfirm={handleInteractiveConfirm} isConfirming={isConfirming} />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Scan meta */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-black/20 border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl mb-8 backdrop-blur-md">
              <div className="flex items-center gap-4 mb-5 md:mb-0">
                <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Shield className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Comprehensive Security Audit</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Automated vulnerability assessment & intelligence gathering</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-5 md:pt-0 md:pl-8 w-full md:w-auto">
                <div>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest block mb-1">Target</span>
                  <span className="text-sm text-slate-200 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{scan.target}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest block mb-1">Protocol</span>
                  <span className="text-sm text-slate-300 flex items-center gap-1.5"><Network className="h-3.5 w-3.5 text-violet-400" /> Distributed</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest block mb-1">Executed</span>
                  <span className="text-sm text-slate-300 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-500" />{new Date(scan.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Scan report */}
            <div className="bg-[#05050A]/40 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-4 md:p-10 shadow-2xl backdrop-blur-md overflow-x-auto">
              {scan.tool_id === "discovery" || scan.tool_id === "asset-discovery" || scan.tool_name === "Asset Discovery" ? (
                <AssetDiscoveryReport data={processedData} />
              ) : (
                <CommonScanReport data={processedData} />
              )}
            </div>

            {/* AI Summary — always rendered on completed scans */}
            <AiSummarySection
              summary={aiSummary}
              isGenerating={aiGenerating}
              isLoadedFromCache={aiFromCache}
              onGenerate={handleGenerate}
            />
          </div>
        )}
      </main>

      {/* CMS Modal */}
      <AlertDialog open={showCmsModal} onOpenChange={setShowCmsModal}>
        <AlertDialogContent className="bg-[#0A0505] border border-orange-500/30 text-slate-200 rounded-[2rem] w-[95vw] p-0 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
          <AlertDialogHeader className="p-6 md:p-8 pb-4">
            <AlertDialogTitle className="flex items-center gap-4 text-2xl text-white font-bold">
              <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20"><ShieldAlert className="h-7 w-7 text-orange-400" /></div>
              Infrastructure Match Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-base leading-relaxed mt-5">
              The scanner has identified <strong className="text-white bg-white/5 px-2 py-0.5 rounded mx-1">{cmsDetails?.detected.toUpperCase()}</strong> on the target. Standard scan profiles may under-report application-specific vulnerabilities. Activate specialized payload injection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 pt-2 flex sm:justify-between items-center w-full">
            <p className="text-xs text-slate-600 font-mono hidden sm:block">OVERRIDE_REQUIRED</p>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => handleCmsAction(false)} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11 px-6 flex-1 sm:flex-none">Bypass</Button>
              <Button onClick={() => handleCmsAction(true)} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-8 rounded-xl h-11 flex-1 sm:flex-none">Activate Deep Scan</Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}