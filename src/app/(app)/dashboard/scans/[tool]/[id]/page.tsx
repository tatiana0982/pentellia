"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Download,
  Target,
  Shield,
  Layers,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  StopCircle,
  Terminal,
  Sparkles,
  Bot,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Ensure these paths exist in your project
import {
  Wafw00fReport,
  NmapReport,
  NucleiReport,
  DirbReport,
} from "@/lib/scan-reports";
import { NetworkScanReport } from "@/lib/NetworkScanReport";
import { WebScanReport } from "@/lib/WebScanReport";
import { CommonScanReport } from "@/lib/Common";
import { triggerNotificationRefresh } from "@/lib/events";

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
// PDF GENERATOR LOGIC
// ----------------------------------------------------------------------

const loadImage = (
  url: string,
): Promise<{ data: string; w: number; h: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const maxWidth = 300;
      const scaleFactor = maxWidth / img.width;
      const newWidth = maxWidth;
      const newHeight = img.height * scaleFactor;
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, newWidth, newHeight);
      ctx?.drawImage(img, 0, 0, newWidth, newHeight);
      resolve({
        data: canvas.toDataURL("image/png"),
        w: newWidth,
        h: newHeight,
      });
    };
    img.onerror = () => resolve({ data: "", w: 0, h: 0 });
  });
};

// ----------------------------------------------------------------------
// PDF GENERATOR LOGIC (AESTHETIC & DETAILED)
// ----------------------------------------------------------------------

const generateAndSavePDF = async (scan: any, aiSummaryText: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2;

  // Design System
  const COLORS = {
    PURPLE: [124, 58, 237],
    DARK: [15, 23, 42],
    CRITICAL: [220, 38, 38],
    HIGH: [234, 88, 12],
    MEDIUM: [202, 138, 4],
    LOW: [22, 163, 74],
    INFO: [37, 99, 235],
    BORDER: [226, 232, 240],
  };

  // --- PAGE 1: CYBER OPS FRONT COVER ---
  doc.setFillColor(COLORS.DARK[0], COLORS.DARK[1], COLORS.DARK[2]);
  doc.rect(0, 0, pageWidth, 70, "F");

  // Aesthetic Accents
  doc.setDrawColor(COLORS.PURPLE[0], COLORS.PURPLE[1], COLORS.PURPLE[2]);
  doc.setLineWidth(1.5);
  doc.line(margin, 20, margin + 10, 20); // Top left accent

  // Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("PENTELLIA", margin, 40);

  doc.setFontSize(9);
  doc.setFont("courier", "bold");
  doc.setTextColor(COLORS.PURPLE[0], COLORS.PURPLE[1], COLORS.PURPLE[2]);
  doc.text("AI-DRIVEN PENETRATION RECONNAISSANCE", margin, 48);

  // Metadata Box (Right Side)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `REPORT ID: ${scan.id.slice(0, 12).toUpperCase()}`,
    pageWidth - margin,
    35,
    { align: "right" },
  );
  doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, 41, {
    align: "right",
  });
  doc.text(`TIME: ${new Date().toLocaleTimeString()}`, pageWidth - margin, 47, {
    align: "right",
  });

  let currentY = 85;

  // --- SECTION: AI EXECUTIVE SUMMARY ---
  doc.setTextColor(COLORS.DARK[0], COLORS.DARK[1], COLORS.DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("01. Executive AI Intelligence Summary", margin, currentY);
  currentY += 4;

  doc.setDrawColor(COLORS.BORDER[0], COLORS.BORDER[1], COLORS.BORDER[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 12;

  // Summary Text Styling
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);

  const cleanAiText = aiSummaryText
    ? aiSummaryText.replace(/[#*`]/g, "")
    : "The Pentellia AI Engine is analyzing the scan vectors... No summary generated.";

  const splitAiText = doc.splitTextToSize(cleanAiText, maxLineWidth);

  splitAiText.forEach((line: string) => {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 25;
    }
    doc.text(line, margin, currentY);
    currentY += 6.5;
  });

  // --- PAGE BREAK: TECHNICAL DATA ---
  doc.addPage();
  currentY = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(COLORS.DARK[0], COLORS.DARK[1], COLORS.DARK[2]);
  doc.text("02. Operational Scan Parameters", margin, currentY);
  currentY += 12;

  autoTable(doc, {
    startY: currentY,
    head: [["FIELD ARCHITECTURE", "CORE DATASET"]],
    body: [
      ["PRIMARY TARGET", scan.target || "N/A"],
      ["SCAN ENGINE", scan.tool_name || "Web Security Suite"],
      ["JOB INSTANCE", scan.id],
      ["COMPLETION STATUS", "SUCCESSFUL / VERIFIED"],
      ["NETWORK LATENCY", scan.result?.meta?.latency || "Low"],
    ],
    headStyles: { fillColor: COLORS.PURPLE, font: "courier", fontSize: 10 },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 5 },
    theme: "grid",
  });

  currentY = (doc as any).lastAutoTable.finalY + 20;

  // --- SECTION: RAW TELEMETRY ---
  doc.setFont("helvetica", "bold");
  doc.text("03. Raw Scan Telemetry (JSON)", margin, currentY);
  currentY += 10;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  const rawData = JSON.stringify(scan.result, null, 2);
  const splitRaw = doc.splitTextToSize(rawData, maxLineWidth);

  splitRaw.forEach((line: string) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 25;
    }
    doc.text(line, margin, currentY);
    currentY += 4;
  });

  // Global Interactive Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(COLORS.DARK[0], COLORS.DARK[1], COLORS.DARK[2]);
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PENTELLIA CYBER TOOL V2.0 - SECURE INTERNAL LOG`,
      margin,
      pageHeight - 6,
    );
    doc.text(`PAGE ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  return doc;
};

// ----------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ----------------------------------------------------------------------

export default function ScanReportPage() {
  const params = useParams();
  const scanId = params.id as string;
  const toolSlug = params.tool as string;

  const [scan, setScan] = useState<ScanResult | null>(null);
  const [polling, setPolling] = useState(true);
  const [progress, setProgress] = useState(0);
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
        // Ensure this API endpoint exists and returns { success: true, scan: ... }
        const res = await fetch(`/api/dashboard/scans/${scanId}`);
        const data = await res.json();

        if (data.success) {
          const fullScanData = { ...data.scan, result: data.pythonStatus };
          setScan(fullScanData);
          // ----------------------------------------------------
          // CHECK FOR CMS CONFIRMATION
          // ----------------------------------------------------
          if (data.pythonStatus?.cms_confirmation_pending === true) {
            // Only show if not already showing to prevent re-renders
            if (!showCmsModal) {
              setCmsDetails({
                detected: data.pythonStatus.detected_cms || "Unknown CMS",
                jobId: data.pythonStatus.job_id,
              });
              setShowCmsModal(true);
            }
          } else {
            // If pending becomes false (user clicked elsewhere or job finished), close it
            if (showCmsModal && !data.pythonStatus?.cms_confirmation_pending) {
              setShowCmsModal(false);
            }
          }
          if (data.scan.status === "completed") {
            triggerNotificationRefresh();
            setScan(data.scan);
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
    if (polling && scanId) intervalId = setInterval(fetchScanStatus, 3000);

    return () => clearInterval(intervalId);
  }, [scanId, polling, showCmsModal]);
  // --- Handle CMS Confirmation ---
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
      console.error(e);
      toast.error("Network Error");
    } finally {
      setIsConfirming(false);
    }
  };
  // --- Export Handler ---
  const handleExport = async () => {
    if (!scan) return;
    const toastId = toast.loading("Finalizing Secure PDF Asset...");

    try {
      const doc = await generateAndSavePDF(scan, aiSummary);
      doc.save(`Pentellia_Intel_${scan.id.slice(0, 8)}.pdf`);
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
    <div className="flex flex-col h-[calc(100vh-6rem)] font-sans text-slate-200 overflow-y-auto custom-scrollbar  ">
      <ScanHeader
        scan={scan}
        onExport={handleExport}
        aiSummary={aiSummary}
        setAiSummary={setAiSummary}
      />

      {scan.status === "running" || scan.status === "queued" ? (
        <RunningStateView scan={scan} progress={progress} />
      ) : (
        <CompletedReportView
          scan={scan}
          toolSlug={toolSlug}
          aiSummary={aiSummary}
        />
      )}

      <AlertDialog open={showCmsModal} onOpenChange={setShowCmsModal}>
        <AlertDialogContent className="bg-[#0B0C15] border border-white/10 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-orange-400" />
              CMS Detected: {cmsDetails?.detected.toUpperCase()}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The scanner has identified <strong>{cmsDetails?.detected}</strong>{" "}
              running on the target. Do you want to enable specific security
              checks for this CMS?
              <br />
              <br />
              <span className="text-xs bg-white/5 p-2 rounded block border border-white/5">
                Note: This may increase scan time but provides deeper
                vulnerability assessment (e.g., WPScan).
              </span>
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
              Yes, Scan {cmsDetails?.detected}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ----------------------------------------------------------------------
// HEADER COMPONENT (Contains AI Logic)
// ----------------------------------------------------------------------

function ScanHeader({
  scan,
  onExport,
  setAiSummary,
  aiSummary,
}: {
  scan: ScanResult;
  setAiSummary: (summary: string) => void;
  aiSummary: string;
  onExport: () => void;
}) {
  const router = useRouter();

  const [aiLoading, setAiLoading] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const handleAiSummarize = async () => {
    setAiLoading(true);
    setAiSummary("");
    setIsAiOpen(true);

    const res = await fetch("/api/ai/summarize", {
      method: "POST",
      body: JSON.stringify({
        toolName: scan.tool_name,
        scanData: scan.result,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;

      // The server is now sending raw text tokens, not JSON strings
      const chunk = decoder.decode(value);
      fullText += chunk;
      setAiSummary(fullText);
    }
    setAiLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Top Nav Row */}
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
          {/* AI MODAL TRIGGER */}
          <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleAiSummarize}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:scale-105"
              >
                <Sparkles className="mr-2 h-4 w-4 text-indigo-200" />
                AI Insight
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-[#0B0C15] border border-white/10 text-slate-200 max-w-2xl sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl text-white border-b border-white/10 pb-4">
                  <Bot className="h-6 w-6 text-indigo-400" />
                  AI Security Analysis
                </DialogTitle>
              </DialogHeader>

              <div className="min-h-[300px] mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  {/* Initial loader ONLY before first token */}
                  {aiSummary.length === 0 && aiLoading && (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-indigo-400 animate-spin" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">
                        Analyzing attack vectors with Pentellia Co-Pilot...
                      </p>
                    </div>
                  )}

                  {/* Streamed content ALWAYS mounted */}
                  {aiSummary.length > 0 && (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                      <ReactMarkdown
                        components={{
                          h3: ({ ...props }) => (
                            <h3
                              className="text-indigo-400 text-lg font-semibold mt-6 mb-3 border-l-4 border-indigo-500 pl-3"
                              {...props}
                            />
                          ),
                          strong: ({ ...props }) => (
                            <span className="text-white font-bold" {...props} />
                          ),
                          ul: ({ ...props }) => (
                            <ul
                              className="list-disc pl-5 space-y-2 marker:text-indigo-500"
                              {...props}
                            />
                          ),
                          p: ({ ...props }) => (
                            <p className="leading-relaxed mb-4" {...props} />
                          ),
                        }}
                      >
                        {aiSummary}
                      </ReactMarkdown>

                      {/* Typing cursor */}
                      {aiLoading && (
                        <span className="inline-block w-[2px] h-4 bg-indigo-400 animate-pulse ml-1 align-baseline" />
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={onExport}
            className="border-white/10 hover:bg-white/5 text-slate-300 hover:text-white"
          >
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Main Info Banner */}
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

// ----------------------------------------------------------------------
// VIEW: RUNNING STATE
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// VIEW: RUNNING STATE
// ----------------------------------------------------------------------

function RunningStateView({
  scan,
  progress,
}: {
  scan: ScanResult;
  progress: number;
}) {
  const [logsOpen, setLogsOpen] = useState(true);

  const pythonStatus = scan.result || {}; // Adjust based on how you store the pythonStatus
  const realProgress = pythonStatus?.progress?.percentage || progress;
  const currentStep =
    pythonStatus?.progress?.current_description ||
    "Initializing scan engines...";
  const currentTool = pythonStatus?.progress?.current_tool || "System";
  const completedTools = pythonStatus?.progress?.completed_tools || [];

  return (
    <div className="space-y-6 p-6">
      {/* Progress Card */}
      <div className="bg-[#0B0C15] border border-white/10 rounded-xl p-8 shadow-lg relative overflow-hidden">
        {/* Background Pulse Effect */}
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none animate-pulse" />

        <div className="flex justify-between items-end mb-4 relative z-10">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
              Scan in progress...
            </h3>
            <p className="text-sm text-slate-400 font-mono">{currentStep}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-indigo-400">
              {Math.round(realProgress)}%
            </span>
            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
              Completion
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative mb-6">
          <div
            className="h-full bg-indigo-600 transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${realProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_1.5s_infinite] bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
          </div>
        </div>

        {/* Tools Grid (Visualizing what's happening) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {completedTools.map((tool: string) => (
            <div
              key={tool}
              className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded border border-emerald-500/20"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span className="uppercase">{tool}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded border border-indigo-500/20 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="uppercase">{currentTool}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
          >
            <StopCircle className="h-4 w-4 mr-2" /> Abort Scan
          </Button>
        </div>
      </div>

      {/* Live Logs Terminal */}
      <div className="border border-white/10 rounded-xl bg-[#0B0C15] overflow-hidden">
        <button
          onClick={() => setLogsOpen(!logsOpen)}
          className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
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
                [SYSTEM] Job ID: {scan.id} initialized at{" "}
                {new Date(scan.created_at).toLocaleTimeString()}
              </div>

              {/* Simulate logs based on completed tools */}
              {completedTools.map((tool: string) => (
                <div key={tool} className="flex gap-2">
                  <span className="text-emerald-500">[SUCCESS]</span>
                  <span className="text-slate-300">
                    Module <span className="text-indigo-400">{tool}</span>{" "}
                    execution finished.
                  </span>
                </div>
              ))}

              {/* Current Action */}
              <div className="flex gap-2 animate-pulse">
                <span className="text-blue-500">[RUNNING]</span>
                <span className="text-slate-200">{currentStep}</span>
              </div>

              <div className="mt-2 h-4 w-2 bg-slate-500 animate-blink" />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// VIEW: COMPLETED STATE
// ----------------------------------------------------------------------

function CompletedReportView({
  scan,
  toolSlug,
  aiSummary,
}: {
  aiSummary?: string;
  scan: ScanResult;
  toolSlug: string;
}) {
  console.log(scan);
  // We use the common report for ALL completed scans now,
  // passing the raw scan result which contains the new standardized structure.
  return (
    <div className="animate-in fade-in duration-500">
      <CommonScanReport data={scan.result} aiSummary={aiSummary} />
    </div>
  );
}

// ----------------------------------------------------------------------
// HELPERS & GENERIC COMPONENTS
// ----------------------------------------------------------------------

function GenericJSONReport({ data }: { data: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0B0C15] p-8 text-center border-dashed">
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
          <FileText className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Standard Report View</h3>
          <p className="text-sm text-slate-500">
            No specialized parser available.
          </p>
        </div>
      </div>
      <div className="text-left">
        <pre className="bg-black/50 p-4 rounded-lg border border-white/5 text-xs font-mono text-slate-300 overflow-auto max-h-[500px] whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="p-4 rounded-xl bg-[#0B0C15] border border-white/10 flex items-center gap-4 shadow-sm">
      <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase">{label}</p>
        <p className="text-sm text-white font-semibold truncate" title={value}>
          {value}
        </p>
      </div>
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
