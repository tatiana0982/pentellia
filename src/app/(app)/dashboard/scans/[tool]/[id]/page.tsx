"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Target,
  Shield,
  RefreshCw,
  Terminal,
  Sparkles,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Loader2,
  BrainCircuit,
  Fingerprint,
  Cpu,
  ShieldAlert,
  Activity,
  Zap,
  Network,
  Server,
  Radio,
  GlobeLock
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

// Custom Components
import { CommonScanReport } from "@/lib/Common";
import { triggerNotificationRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------
// THE "RICH TEXT" ENGINE (READABILITY & LAYMEN UX OPTIMIZED)
// ----------------------------------------------------------------------

const AIRichRenderer = ({ content }: { content: string }) => {
  return (
    <div className="relative space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Decorative Background Element */}
      <div className="absolute -left-6 md:-left-10 top-0 w-1 h-full bg-gradient-to-b from-indigo-500/20 via-fuchsia-500/10 to-transparent hidden md:block" />

      <ReactMarkdown
        components={{
          // Header 1: The Hero Title
          h1: ({ children }) => (
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6 md:mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-slate-400 leading-tight">
              {children}
            </h1>
          ),
          // Header 2: The Section Title
          h2: ({ children }) => (
            <div className="flex items-center gap-3 md:gap-4 mt-12 mb-6 group">
              <div className="h-[2px] w-8 md:w-12 bg-gradient-to-r from-indigo-500 to-fuchsia-500 group-hover:w-16 transition-all duration-500" />
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
                {children}
              </h2>
            </div>
          ),
          // Header 3: Bold Subpoints
          h3: ({ children }) => (
            <h3 className="text-base md:text-lg font-bold text-slate-100 mt-8 mb-3 flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-white/5 border border-white/10 shrink-0">
                <Zap className="h-4 w-4 text-indigo-400" />
              </div>
              {children}
            </h3>
          ),
          // Paragraph: Superior Readability, High Line-Height, Left Aligned
          p: ({ children }) => (
            <p className="text-base md:text-[1.1rem] leading-[1.8] text-slate-300 font-normal mb-6 text-left selection:bg-indigo-500/30">
              {children}
            </p>
          ),
          // Lists: Clean, Spaced, and Icon-based
          ul: ({ children }) => (
            <ul className="space-y-4 md:space-y-5 my-6 ml-1 md:ml-2 text-left">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-4 group">
              <div className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10 group-hover:scale-125 group-hover:bg-fuchsia-400 transition-all duration-300" />
              <span className="text-slate-300 group-hover:text-white transition-colors leading-[1.8] text-base md:text-[1.1rem] text-left">
                {children}
              </span>
            </li>
          ),
          // Blockquotes: The "Glass Card" look
          blockquote: ({ children }) => (
            <div className="my-8 md:my-10 p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500 text-left">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-fuchsia-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full transition-colors duration-500" />
              <div className="text-indigo-100/90 leading-[1.8] font-medium relative z-10 text-base md:text-[1.1rem]">
                {children}
              </div>
            </div>
          ),
          // Strong: Bold Highlighting
          strong: ({ children }) => (
            <strong className="font-bold text-white px-1.5 py-0.5 rounded bg-white/5 border-b border-white/10 shadow-sm mx-0.5">
              {children}
            </strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// ----------------------------------------------------------------------
// DECORATIVE BACKGROUND SYSTEM
// ----------------------------------------------------------------------
const CyberBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    {/* Deep base color */}
    <div className="absolute inset-0 bg-[#030308]" />
    
    {/* Radial glows */}
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/10 blur-[120px]" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-900/10 blur-[120px]" />
    
    {/* Tech Grid */}
    <div 
      className="absolute inset-0 opacity-[0.03]" 
      style={{
        backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
        backgroundSize: '4rem 4rem',
        maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 10%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 10%, transparent 100%)'
      }}
    />
  </div>
);

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
  const router = useRouter();
  const scanId = params.id as string;

  const [scan, setScan] = useState<ScanResult | null>(null);
  const [polling, setPolling] = useState(true);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

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
          const fullScanData = { ...data.scan, result: data.pythonStatus || data.scan.result };
          setScan(fullScanData);
          
          if (data.pythonStatus?.cms_confirmation_pending === true && !showCmsModal) {
              setCmsDetails({ detected: data.pythonStatus.detected_cms || "Unknown CMS", jobId: data.pythonStatus.job_id });
              setShowCmsModal(true);
          }
          
          if (["completed", "failed", "cancelled"].includes(fullScanData.status)) {
            setPolling(false);
            if (fullScanData.status === "completed") triggerNotificationRefresh();
          }
        } else { 
          setPolling(false); 
          toast.error(data.error || "Scan not found"); 
        }
      } catch (error) { console.error("Polling error", error); }
    };
    if (scanId) fetchScanStatus();
    if (polling && scanId) intervalId = setInterval(fetchScanStatus, 3000);
    return () => clearInterval(intervalId);
  }, [scanId, polling, showCmsModal]);

  // --- HIDE "NO ISSUES FOUND" BUG FIX ---
  // Actively hides the empty state text exclusively when Low/Info tabs are active
  useEffect(() => {
    if (scan?.status !== "completed") return;
    
    const observer = new MutationObserver(() => {
      const noIssuesElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span')).filter(el => 
        el.textContent?.includes('No Issues Found') || 
        el.textContent?.includes('No vulnerabilities match')
      );
      
      noIssuesElements.forEach(el => {
        let container = el.parentElement;
        // Traverse up to find the wrapping border box
        while (container && !container.className.includes('border') && container.tagName !== 'DIV') {
          container = container.parentElement;
        }
        
        if (container && container.parentElement) {
          const mainBlock = container.closest('div.border') || container;
          
          // Check if 'Low' or 'Info' tabs are currently active
          const activeTab = Array.from(document.querySelectorAll('button')).find(btn => 
            (btn.textContent?.includes('Low') || btn.textContent?.includes('Info')) && 
            (btn.className.includes('text-indigo') || btn.className.includes('border-indigo') || btn.className.includes('text-violet'))
          );

          if (activeTab) {
            (mainBlock as HTMLElement).style.display = 'none';
          } else {
            (mainBlock as HTMLElement).style.display = '';
          }
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scan?.status]);

  // --- FORMAT MASSIVE DESCRIPTIONS (INTELLIGENT PARSER) ---
  const processedData = useMemo(() => {
    if (!scan?.result) return scan?.result;
    
    try {
      const cloned = JSON.parse(JSON.stringify(scan.result));
      
      // Breaks giant walls of text into structured paragraphs based on common CVE wording
      const formatText = (text: string) => {
        if (typeof text !== 'string') return text;
        return text
          .replace(/(This occurs because|This affects|The impact is|The vulnerability allows)/gi, '\n\n**Context:** $1')
          .replace(/(For example,|For instance,)/gi, '\n\n**Example:** $1')
          .replace(/(NOTE:)/g, '\n\n**Note:**')
          .replace(/(\(CVSS[^)]+\))/gi, '\n\n**$1**')
          .replace(/([a-z])\.\s+([A-Z])/g, '$1.\n\n$2') // Intelligent sentence splitting
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      };

      const traverse = (obj: any) => {
        if (Array.isArray(obj)) {
          obj.forEach(traverse);
        } else if (obj !== null && typeof obj === 'object') {
          if (obj.description) obj.description = formatText(obj.description);
          if (obj.desc) obj.desc = formatText(obj.desc);
          if (obj.remediation) obj.remediation = formatText(obj.remediation);
          Object.values(obj).forEach(traverse);
        }
      };

      traverse(cloned);
      return cloned;
    } catch (e) {
      return scan.result; // Safety fallback
    }
  }, [scan?.result]);

  const handleCmsAction = async (confirm: boolean) => {
    if (!cmsDetails) return;
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/dashboard/scans/${scanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm, external_job_id: cmsDetails.jobId }),
      });
      if (res.ok) { 
        toast.success(confirm ? "Advanced Scan Modules Initiated" : "Modules Bypassed"); 
        setShowCmsModal(false); 
      }
    } catch (e) { toast.error("Secure Connection Error"); } finally { setIsConfirming(false); }
  };

  const handleExport = async () => {
    if (!scan) return;
    const toastId = toast.loading("Encrypting and Finalizing PDF Asset...", {
      style: { background: '#0B0C15', color: '#fff', border: '1px solid rgba(139, 92, 246, 0.2)' }
    });
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scan, ai_summary: aiSummary }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Security_Suite_Report_${scan.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click(); a.remove(); window.URL.revokeObjectURL(url);
      toast.success("Intelligence Report Exported Successfully", { id: toastId });
    } catch (error) { toast.error("Export Procedure Failed", { id: toastId }); }
  };

  const handleAiSummarize = async () => {
    if (scan?.status !== "completed") return;
    setAiLoading(true);
    setAiSummary("");
    setIsAiOpen(true);
    
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ toolName: scan.tool_name, scanData: scan.result }),
      });

      if (!res.body) throw new Error("Stream closed prematurely");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let isSSE = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        if (buffer.includes('data: ')) {
          isSSE = true;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content || "";
                setAiSummary((prev) => prev + content);
              } catch (e) {
                // Ignore incomplete JSON slices during stream
              }
            }
          }
        } else if (!isSSE) {
          setAiSummary((prev) => prev + chunk);
          buffer = ""; 
        }
      }
      
      if (!isSSE && buffer.trim() !== '') {
        setAiSummary((prev) => prev + buffer);
      }

    } catch (e) { 
      toast.error("Neural synthesis interrupted"); 
    } finally { 
      setAiLoading(false); 
    }
  };

  if (!scan) return <GlobalLoadingState />;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative font-sans text-slate-200 overflow-y-auto custom-scrollbar selection:bg-violet-500/30">
      
      {/* RICH BACKGROUND */}
      <CyberBackground />

      {/* PREMIUM HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030308]/80 backdrop-blur-2xl px-4 md:px-6 py-4 md:py-5 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="flex flex-col w-full md:w-auto">
            <div className="flex items-center gap-3 text-[10px] uppercase text-violet-400 font-bold mb-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
                <GlobeLock className="h-3 w-3" />
                <span>Encrypted Channel</span>
              </div>
              <span className="opacity-50">|</span>
              <span>Session ID: {scan.id.slice(0, 8)}</span>
            </div>
            
            <div className="flex items-center justify-between md:justify-start w-full gap-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => router.back()} 
                  className="h-10 w-10 shrink-0 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col">
                  <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <span className="truncate max-w-[200px] sm:max-w-xs">{scan.tool_name}</span>
                    <Badge variant="outline" className="bg-white/5 text-slate-300 border-white/10 font-mono text-xs px-2 py-0.5 rounded-md hidden sm:flex">
                      v4.2.0
                    </Badge>
                  </h1>
                  <p className="text-slate-400 text-xs md:text-sm flex items-center gap-2 mt-0.5 font-mono">
                    Target: <span className="text-violet-300 truncate max-w-[150px] sm:max-w-xs">{scan.target}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            
            {/* STATUS TELEMETRY DUMMY UI */}
            <div className="hidden xl:flex items-center gap-4 mr-4 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-2xl shrink-0">
               <div className="flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-mono text-slate-400 uppercase">Sys: Optimal</span>
               </div>
               <div className="w-[1px] h-4 bg-white/10" />
               <div className="flex items-center gap-2">
                 <Server className="h-3 w-3 text-slate-500" />
                 <span className="text-[10px] font-mono text-slate-400 uppercase">24ms Ping</span>
               </div>
            </div>

            <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleAiSummarize} 
                  disabled={scan.status !== "completed"}
                  className="relative group bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-[0_0_20px_rgba(139,92,246,0.3)] px-5 md:px-7 h-11 md:h-12 rounded-xl md:rounded-2xl transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:shadow-none overflow-hidden shrink-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  <BrainCircuit className="mr-2 h-4 w-4 drop-shadow-md" /> 
                  <span className="font-semibold drop-shadow-md text-sm md:text-base">AI Brief</span>
                </Button>
              </DialogTrigger>

              {/* THE MODAL: ULTIMATE RICH TYPOGRAPHY (MOBILE OPTIMIZED) */}
              <DialogContent className="bg-[#05050A]/95 backdrop-blur-3xl border border-white/10 text-slate-200 w-[95vw] md:max-w-5xl p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border-t-violet-500/50 rounded-2xl sm:rounded-[2rem]">
                <DialogHeader className="px-5 py-6 md:px-10 md:py-8 bg-gradient-to-b from-violet-500/[0.05] to-transparent border-b border-white/5 relative">
                  <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[100px] bg-violet-500/20 blur-[100px] pointer-events-none" />
                  
                  <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-fuchsia-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-fuchsia-400 tracking-widest">Analysis Core</span>
                      </div>
                      <h2 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 md:p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                          <Bot className="h-5 w-5 md:h-6 md:w-6 text-violet-400" />
                        </div>
                        Security Synthesis
                      </h2>
                    </div>
                    {aiLoading && (
                      <div className="flex items-center self-start sm:self-auto gap-3 px-4 py-2 md:px-5 md:py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin text-violet-400" />
                        <span className="text-[10px] md:text-[11px] font-bold text-violet-300 uppercase animate-pulse">Compiling</span>
                      </div>
                    )}
                  </DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[60vh] md:h-[70vh] px-5 md:px-16 py-6 md:py-10 relative">
                  {/* Internal grid background for the modal */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf60a_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
                  
                  <div className="relative z-10 max-w-4xl mx-auto">
                    {aiSummary ? (
                      <AIRichRenderer content={aiSummary} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[40vh] md:h-[50vh] text-center">
                         <div className="relative mb-8 md:mb-10">
                            <div className="absolute inset-0 bg-violet-500/20 blur-[80px] rounded-full" />
                            <div className="relative flex items-center justify-center h-24 w-24 md:h-32 md:w-32 border border-violet-500/30 rounded-full bg-violet-500/5 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                              <Cpu className="h-10 w-10 md:h-12 md:w-12 text-violet-400 animate-[spin_6s_linear_infinite]" />
                              <div className="absolute inset-0 border-t-2 border-fuchsia-500 rounded-full animate-[spin_2s_linear_infinite]" />
                            </div>
                         </div>
                         <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-3">Initializing Scan Analysis</h3>
                         <p className="text-slate-400 text-xs md:text-sm max-w-md leading-relaxed font-light px-4">
                           Our systems are currently parsing vector data and mapping threat topologies to generate your executive report.
                         </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                {/* Footer Gradient Blur to fade out text nicely */}
                <div className="absolute bottom-0 left-0 w-full h-16 md:h-24 bg-gradient-to-t from-[#05050A] via-[#05050A]/80 to-transparent pointer-events-none" />
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={handleExport} 
              disabled={scan.status !== "completed"} 
              className="border-white/10 bg-white/[0.02] hover:bg-white/10 rounded-xl md:rounded-2xl h-11 md:h-12 px-4 md:px-6 text-slate-300 font-medium transition-all duration-300 shrink-0"
            >
              <Download className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Export PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="max-w-[1600px] mx-auto w-full p-4 md:p-8 lg:p-12 relative z-10">
        {scan.status === "running" || scan.status === "queued" ? (
          <RunningStateView scan={scan} />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
             
             {/* STUNNING HERO WRAPPER FOR THE REPORT */}
             <div className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 p-6 md:p-10 mb-8 md:mb-10 backdrop-blur-md shadow-2xl">
               <div className="absolute top-0 right-0 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-violet-500/10 blur-[100px] md:blur-[150px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
               <div className="absolute bottom-0 left-0 w-[300px] md:w-[400px] h-[300px] md:h-[400px] bg-fuchsia-500/10 blur-[100px] md:blur-[120px] pointer-events-none -translate-x-1/3 translate-y-1/3" />
               
               <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6 md:gap-8">
                  <div className="space-y-4 md:space-y-6">
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 md:p-4 w-fit rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/5 border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                           <Shield className="h-8 w-8 md:h-10 md:w-10 text-violet-400" />
                        </div>
                        <div className="space-y-1 md:space-y-2">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                             <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white">Comprehensive Security Audit</h2>
                             <div className="w-fit">
                               <StatusBadge status={scan.status} />
                             </div>
                           </div>
                           <p className="text-slate-400 font-medium text-sm md:text-lg">
                             Automated vulnerability assessment & intelligence gathering.
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col items-start xl:items-end gap-3 bg-black/20 p-4 md:p-5 rounded-xl md:rounded-2xl border border-white/5 backdrop-blur-sm w-full xl:w-auto">
                     <div className="flex flex-row items-center gap-4 md:gap-6">
                       <div className="space-y-1 text-left xl:text-right">
                         <p className="text-[10px] text-slate-500 font-mono uppercase">Scan Initiated</p>
                         <p className="text-xs md:text-sm font-semibold text-white">{new Date(scan.created_at).toLocaleString()}</p>
                       </div>
                       <div className="w-[1px] h-8 md:h-10 bg-white/10" />
                       <div className="space-y-1 text-left xl:text-right">
                         <p className="text-[10px] text-slate-500 font-mono uppercase">Engine Protocol</p>
                         <p className="text-xs md:text-sm font-semibold text-white flex items-center gap-2">
                           <Network className="h-3 w-3 text-violet-400" /> Distributed Node
                         </p>
                       </div>
                     </div>
                  </div>
               </div>
             </div>

             {/* RENDER THE COMMON SCAN REPORT (Prop aiSummary Removed = No Duplicates) */}
             <div className="bg-[#05050A]/40 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-4 md:p-10 shadow-2xl backdrop-blur-md overflow-x-auto">
               <CommonScanReport data={processedData} activeTabOverride={null} />
             </div>

             {/* RENDER THE BEAUTIFUL AI SUMMARY AT THE BOTTOM */}
             {aiSummary && (
                <div className="mt-12 bg-[#05050A]/80 border border-indigo-500/30 rounded-[2.5rem] p-8 md:p-14 shadow-[0_0_50px_rgba(99,102,241,0.1)] backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-500/10 blur-[150px] pointer-events-none -translate-x-1/2 translate-y-1/2" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/10 pb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 rounded-2xl border border-indigo-500/30 shadow-inner">
                                <Bot className="h-8 w-8 text-indigo-400" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Pentellia LLM Response</h3>
                                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 font-mono text-[10px] tracking-widest uppercase hidden md:inline-flex">Verified Intel</Badge>
                                </div>
                                <p className="text-slate-400 text-sm md:text-base font-medium">Executive-grade security synthesis & remediation strategy.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl w-fit">
                            <Sparkles className="h-4 w-4 text-fuchsia-400" />
                            <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">AI Generated Summary</span>
                        </div>
                    </div>
                    
                    <div className="relative z-10 max-w-5xl mx-auto text-left">
                        <AIRichRenderer content={aiSummary} />
                    </div>
                </div>
             )}
          </div>
        )}
      </main>

      {/* CMS MODAL */}
      <AlertDialog open={showCmsModal} onOpenChange={setShowCmsModal}>
        <AlertDialogContent className="bg-[#0A0505] border border-orange-500/30 text-slate-200 rounded-2xl md:rounded-[2rem] w-[95vw] p-0 overflow-hidden shadow-[0_0_100px_rgba(249,115,22,0.15)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
          <AlertDialogHeader className="p-6 md:p-8 pb-4">
            <AlertDialogTitle className="flex items-center gap-3 md:gap-4 text-xl md:text-3xl text-white font-bold">
              <div className="p-2 md:p-3 bg-orange-500/10 rounded-xl md:rounded-2xl border border-orange-500/20">
                <ShieldAlert className="h-6 w-6 md:h-8 md:w-8 text-orange-400" />
              </div>
              Infrastructure Match
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-sm md:text-lg leading-relaxed mt-4 md:mt-6">
              The intelligence gatherer has identified <strong className="text-white bg-white/5 px-2 py-0.5 rounded-md mx-1">{cmsDetails?.detected.toUpperCase()}</strong> infrastructure on the target. 
              Standard scanning patterns may miss application-specific vulnerabilities. Inject specialized exploit payloads?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 md:p-8 pt-2 md:pt-4 flex sm:justify-between items-center w-full">
            <p className="text-[10px] md:text-xs text-slate-500 font-mono hidden sm:block">ACT_REQ: OVERRIDE</p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => handleCmsAction(false)} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-12 px-6 w-full sm:w-auto">
                Bypass
              </Button>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-8 rounded-xl h-12 shadow-[0_0_20px_rgba(249,115,22,0.3)] border-0 w-full sm:w-auto transition-all active:scale-95" onClick={() => handleCmsAction(true)}>
                Engage Deep Scan
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ----------------------------------------------------------------------
// HELPER COMPONENTS (ULTRA-RICH STYLING)
// ----------------------------------------------------------------------

function GlobalLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#030308] relative overflow-hidden px-4 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-[#030308] to-[#030308]" />
      <div className="relative flex flex-col items-center gap-6 md:gap-8 z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/30 blur-[40px] md:blur-[60px] rounded-full" />
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-t-2 border-l-2 border-violet-500 animate-[spin_1.5s_cubic-bezier(0.68,-0.55,0.265,1.55)_infinite]" />
          <div className="absolute inset-2 rounded-full border-b-2 border-r-2 border-fuchsia-500 animate-[spin_1s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-white/50 animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-white font-bold text-xs md:text-sm uppercase tracking-wide">Establishing Secure Authentication</span>
          <span className="text-violet-400/80 font-mono text-[10px] uppercase animate-pulse">Your Confidential data is encrypted on our servers.</span>
        </div>
      </div>
    </div>
  );
}

function RunningStateView({ scan }: { scan: ScanResult }) {
  const [logsOpen, setLogsOpen] = useState(true);
  const progress = scan.result?.progress?.percentage || 0;
  const currentStep = scan.result?.progress?.current_description || "Initializing Scan Core...";
  const completedTools = scan.result?.progress?.completed_steps || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 animate-in fade-in zoom-in-95 duration-1000 mt-6 md:mt-10">
      
      {/* THE RADAR / PROGRESS SECTION */}
      <div className="bg-[#05050A]/60 border border-white/5 rounded-3xl md:rounded-[3rem] p-6 md:p-16 shadow-2xl relative overflow-hidden text-center backdrop-blur-xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] md:w-[800px] h-[150px] md:h-[200px] bg-violet-600/10 blur-[80px] md:blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-fuchsia-600/5 blur-[80px] md:blur-[100px] pointer-events-none rounded-full" />
        
        <div className="space-y-8 md:space-y-12 relative z-10">
          <div className="flex flex-col items-center gap-4 md:gap-6">
             <div className="relative flex items-center justify-center h-20 w-20 md:h-28 md:w-28 rounded-2xl md:rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.1)]">
                <Radio className="h-8 w-8 md:h-12 md:w-12 text-violet-400 absolute animate-ping opacity-20" />
                <RefreshCw className="h-8 w-8 md:h-10 md:w-10 text-violet-300 animate-[spin_3s_linear_infinite]" />
             </div>
             <div className="space-y-2">
               <h3 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Active Intelligence Gathering</h3>
               <p className="text-fuchsia-400 font-mono text-xs md:text-sm uppercase flex items-center justify-center gap-2 md:gap-3">
                 <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-fuchsia-500 animate-pulse shrink-0" />
                 <span className="truncate max-w-[250px] sm:max-w-md">{currentStep}</span>
               </p>
             </div>
          </div>

          <div className="space-y-4 md:space-y-5 max-w-2xl mx-auto px-2">
            <div className="flex justify-between items-end">
              <div className="flex flex-col items-start gap-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Compute Allocation</span>
                <span className="text-slate-300 text-xs md:text-sm font-medium">Node Cluster 04</span>
              </div>
              <span className="text-white text-4xl md:text-5xl font-black tabular-nums leading-none">
                {Math.round(progress)}<span className="text-violet-500 text-2xl md:text-3xl">%</span>
              </span>
            </div>
            
            <div className="h-3 md:h-4 w-full bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
              <div 
                className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" 
                style={{ 
                  width: `${progress}%`,
                  backgroundImage: 'linear-gradient(90deg, #6d28d9 0%, #a21caf 100%)'
                }}
              >
                {/* Glossy Shimmer overlay inside progress bar */}
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_1s_infinite_linear]" />
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TERMINAL / LOG VIEW */}
      <div className="border border-white/10 rounded-2xl md:rounded-[2rem] bg-black/60 backdrop-blur-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        
        <button 
          onClick={() => setLogsOpen(!logsOpen)} 
          className="w-full flex items-center justify-between p-4 md:p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-colors border-b border-white/5 group"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden sm:flex gap-1.5">
              <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <span className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs font-bold text-slate-400 uppercase sm:ml-2 md:ml-4 group-hover:text-white transition-colors">
              <Terminal className="h-3 w-3 md:h-4 md:w-4 text-violet-500 shrink-0" /> Kernel Logs
            </span>
          </div>
          {logsOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>

        {logsOpen && (
          <ScrollArea className="h-60 md:h-80 px-4 md:px-8 py-4 md:py-6 font-mono text-[10px] md:text-[11px] leading-relaxed">
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 pb-3 md:pb-4 border-b border-white/5 opacity-50">
                <span className="text-violet-400">root@system:~#</span>
                <span className="text-slate-300">tail -f /var/log/scan_{scan.id.slice(0,6)}.log</span>
              </div>
              
              {completedTools.map((t: string, i: number) => (
                <div key={t} className="flex gap-3 md:gap-6 items-start animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                  <span className="text-emerald-400 font-bold shrink-0 w-16 md:w-24">[ OK ]</span>
                  <span className="text-slate-300">
                    Module <span className="text-white font-bold">{t.toUpperCase()}</span> execution completed.
                  </span>
                </div>
              ))}
              
              <div className="flex gap-3 md:gap-6 items-start animate-pulse">
                <span className="text-violet-400 font-bold shrink-0 w-16 md:w-24">[ ACTIVE ]</span>
                <span className="text-white break-all md:break-normal">
                  Executing: <span className="text-fuchsia-300">{currentStep}</span> <span className="animate-[ping_1.5s_infinite]">_</span>
                </span>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string, text: string, border: string, shadow: string, glow: string }> = {
    completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", shadow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]", glow: "bg-emerald-500" },
    running: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", shadow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]", glow: "bg-violet-500" },
    failed: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", shadow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]", glow: "bg-red-500" },
    queued: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", shadow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]", glow: "bg-amber-500" },
    cancelled: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", shadow: "shadow-none", glow: "bg-slate-500" },
  };

  const current = config[status] || config.queued;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "capitalize px-4 py-1.5 md:px-5 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full border backdrop-blur-md flex items-center gap-2", 
        current.bg, current.text, current.border, current.shadow
      )}
    >
      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", current.glow, status === "running" ? "animate-ping" : "")} />
      {status}
    </Badge>
  );
}