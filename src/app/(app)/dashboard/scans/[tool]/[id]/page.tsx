"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Target,
  Shield,
  RefreshCw,
  StopCircle,
  Terminal,
  Sparkles,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock, // Added Lock icon for disabled state
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Custom Components
import { CommonScanReport } from "@/lib/Common";
import { triggerNotificationRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";

// --- Types ---
interface ScanResult {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  target: string;
  tool_name: string;
  created_at: string;
  completed_at?: string;
  result?: any;
}

// ----------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ----------------------------------------------------------------------

export default function ScanReportPage() {
  const params = useParams();
  const scanId = params.id as string;
  const toolSlug = params.tool as string;

  const [scan, setScan] = useState<ScanResult | null>(null);
  const [polling, setPolling] = useState(true);
  const [aiSummary, setAiSummary] = useState("");

  const [showCmsModal, setShowCmsModal] = useState(false);
  const [cmsDetails, setCmsDetails] = useState<{
    detected: string;
    jobId: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // --- Fetch & Polling Logic ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchScanStatus = async () => {
      try {
        const res = await fetch(`/api/dashboard/scans/${scanId}`);
        const data = await res.json();

        if (data.success) {
          // Merge Data: use pythonStatus for progress if running, else DB result
          const fullScanData = {
            ...data.scan,
            result: data.pythonStatus || data.scan.result,
          };

          setScan(fullScanData);

          // CMS Modal Logic
          if (data.pythonStatus?.cms_confirmation_pending === true) {
            if (!showCmsModal) {
              setCmsDetails({
                detected: data.pythonStatus.detected_cms || "Unknown CMS",
                jobId: data.pythonStatus.job_id,
              });
              setShowCmsModal(true);
            }
          } else {
            if (showCmsModal && !data.pythonStatus?.cms_confirmation_pending) {
              setShowCmsModal(false);
            }
          }

          // STOP POLLING Check
          const status = fullScanData.status;
          if (["completed", "failed", "cancelled"].includes(status)) {
            setPolling(false);
            if (status === "completed") {
              triggerNotificationRefresh();
            }
          }
        } else {
          setPolling(false);
          toast.error(data.error || "Scan not found");
        }
      } catch (error) {
        console.error("Polling error", error);
      }
    };

    if (scanId) fetchScanStatus();
    if (polling && scanId) {
      intervalId = setInterval(fetchScanStatus, 3000);
    }

    return () => clearInterval(intervalId);
  }, [scanId, polling, showCmsModal]);

  // --- Handle CMS ---
  const handleCmsAction = async (confirm: boolean) => {
    if (!cmsDetails) return;
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/dashboard/scans/${scanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: confirm,
          external_job_id: cmsDetails.jobId,
        }),
      });
      if (res.ok) {
        toast.success(confirm ? "CMS Scan Initiated" : "CMS Scan Skipped");
        setShowCmsModal(false);
      } else {
        toast.error("Failed to send confirmation");
      }
    } catch (e) {
      toast.error("Network Error");
    } finally {
      setIsConfirming(false);
    }
  };

  // --- Export Handler ---

  const handleExport = async () => {
    if (!scan) return;

    const toastId = toast.loading("Finalizing Secure PDF Asset...");

    const data = { ...scan, ai_summary: aiSummary };

    try {
      const res = await fetch("/api/pdf", {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `Pentellia_Security_Report_${scan.id.slice(0, 8)}.pdf`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Cyber Intel Report Exported", { id: toastId });
    } catch (error) {
      console.error(error);

      toast.error("Export Failed", { id: toastId });
    }
  };

  if (!scan) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full" />
          <p>Retrieving scan data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] font-sans text-slate-200 overflow-y-auto custom-scrollbar">
      <ScanHeader
        scan={scan}
        onExport={handleExport}
        aiSummary={aiSummary}
        setAiSummary={setAiSummary}
      />

      {scan.status === "running" || scan.status === "queued" ? (
        <RunningStateView scan={scan} />
      ) : (
        <CompletedReportView scan={scan} aiSummary={aiSummary} />
      )}

      {/* CMS Modal */}
      <AlertDialog open={showCmsModal} onOpenChange={setShowCmsModal}>
        <AlertDialogContent className="bg-[#0B0C15] border border-white/10 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-orange-400" />
              CMS Detected: {cmsDetails?.detected.toUpperCase()}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The scanner has identified <strong>{cmsDetails?.detected}</strong>
              . Enable specific security checks?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleCmsAction(false)}
              disabled={isConfirming}
              className="hover:bg-white/5 hover:text-white text-slate-400"
            >
              No, Skip
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => handleCmsAction(true)}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Yes, Scan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB COMPONENTS
// ----------------------------------------------------------------------

function ScanHeader({ scan, onExport, setAiSummary, aiSummary }: any) {
  const router = useRouter();
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // 🔒 CHECK 2: Determine if buttons should be enabled
  const isReady = scan.status === "completed" && scan.result;

  const handleAiSummarize = async () => {
    // Double check guard
    if (!isReady) {
      toast.error("Scan analysis is not yet available.");
      return;
    }

    setAiLoading(true);
    setAiSummary("");
    setIsAiOpen(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        body: JSON.stringify({
          toolName: scan.tool_name,
          scanData: scan.result,
        }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        setAiSummary((prev: string) => prev + decoder.decode(value));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="pl-0 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <span>/</span>
          <span className="text-slate-300 font-mono text-xs">
            ID: {scan.id.slice(0, 8)}...
          </span>
        </div>

        <div className="flex gap-3">
          {/* AI Button */}
          <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
            {/* We conditionally render the Trigger to prevent opening if disabled */}
            {isReady ? (
              <DialogTrigger asChild>
                <Button
                  onClick={handleAiSummarize}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  <Sparkles className="mr-2 h-4 w-4 text-indigo-200" /> AI
                  Insight
                </Button>
              </DialogTrigger>
            ) : (
              <Button
                disabled
                className="bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed"
              >
                {scan.status === "running" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                AI Insight
              </Button>
            )}

            <DialogContent className="bg-[#0B0C15] border border-white/10 text-slate-200 max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl text-white border-b border-white/10 pb-4">
                  <Bot className="h-6 w-6 text-indigo-400" /> AI Security
                  Analysis
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[500px] pr-4 mt-4">
                {aiSummary ? (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 gap-4 animate-pulse">
                    <Sparkles className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="text-slate-400">Analyzing data...</p>
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Export Button */}
          <Button
            variant="outline"
            onClick={onExport}
            disabled={!isReady} // 🔒 Disable if not ready
            className={cn(
              "border-white/10",
              !isReady
                ? "text-slate-600 bg-white/5"
                : "text-slate-300 hover:text-white hover:bg-white/5",
            )}
          >
            {isReady ? (
              <Download className="mr-2 h-4 w-4" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between bg-[#0B0C15] border border-white/10 p-6 rounded-xl shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {scan.tool_name || "Security"} Report
          </h1>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Target className="h-4 w-4" />
            <span>Target:</span>
            <span className="font-mono text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded">
              {scan.target}
            </span>
          </div>
        </div>
        <StatusBadge status={scan.status} />
      </div>
    </div>
  );
}

function RunningStateView({ scan }: { scan: ScanResult }) {
  const [logsOpen, setLogsOpen] = useState(true);
  const pythonStatus = scan.result || {};
  const progress = pythonStatus?.progress?.percentage || 0;
  const currentStep =
    pythonStatus?.progress?.current_description || "Initializing...";
  const completedTools = pythonStatus?.progress?.completed_steps || [];

  return (
    <div className="space-y-6 p-6">
      <div className="bg-[#0B0C15] border border-white/10 rounded-xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none animate-pulse" />
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />{" "}
              Scan in progress...
            </h3>
            <p className="text-sm text-slate-400 font-mono">{currentStep}</p>
          </div>
          <span className="text-3xl font-bold text-indigo-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative mb-6">
          <div
            className="h-full bg-indigo-600 transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_1.5s_infinite] bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {completedTools.map((tool: string) => (
            <div
              key={tool}
              className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded border border-emerald-500/20"
            >
              <CheckCircle2 className="h-3 w-3" />{" "}
              <span className="uppercase">{tool}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border border-white/10 rounded-xl bg-[#0B0C15] overflow-hidden">
        <button
          onClick={() => setLogsOpen(!logsOpen)}
          className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04]"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Terminal className="h-4 w-4 text-slate-500" /> Live Execution Log
          </span>
          {logsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {logsOpen && (
          <ScrollArea className="h-64 bg-[#05060a] p-4 font-mono text-xs">
            <div className="space-y-1.5">
              <div className="text-slate-500 border-b border-white/5 pb-2 mb-2">
                [SYSTEM] Scan ID: {scan.id} running.
              </div>
              {completedTools.map((t: string) => (
                <div key={t} className="text-slate-300">
                  <span className="text-emerald-500">[DONE]</span> Module {t}{" "}
                  finished.
                </div>
              ))}
              <div className="text-slate-200 animate-pulse">
                <span className="text-blue-500">[BUSY]</span> {currentStep}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function CompletedReportView({
  scan,
  aiSummary,
}: {
  scan: ScanResult;
  aiSummary?: string;
}) {
  return (
    <div className="animate-in fade-in duration-500">
      <CommonScanReport data={scan.result} aiSummary={aiSummary} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    queued: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return (
    <Badge
      variant="outline"
      className={cn("capitalize px-3 py-1", styles[status] || styles.queued)}
    >
      {status === "running" && (
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
      )}
      {status}
    </Badge>
  );
}
