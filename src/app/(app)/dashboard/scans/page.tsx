"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  FileText,
  StopCircle,
  Calendar,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

// --- Types ---
interface Scan {
  id: string;
  target: string;
  status: "completed" | "running" | "failed" | "queued" | "cancelled";
  tool_id: string;
  tool_name: string;
  created_at: string;
  completed_at?: string;
  result?: any;
}

export default function ScansPage() {
  const router = useRouter();

  // --- State ---
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalScans, setTotalScans] = useState(0);

  // Selection
  const [selectedScans, setSelectedScans] = useState<Set<string>>(new Set());

  // --- Fetch Data ---
  const fetchScans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/scans?page=${page}&limit=${limit}`,
      );
      const data = await res.json();

      if (data.success) {
        setScans(data.scans);
        setTotalPages(data.pagination.totalPages);
        setTotalScans(data.pagination.totalScans);
        // Reset selection on page change to avoid confusion
        setSelectedScans(new Set());
      } else {
        toast.error("Failed to load scans");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // --- Handlers ---

  const handleDelete = async (id: string) => {
    const toastId = toast.loading("Deleting...");
    try {
      const res = await fetch(`/api/dashboard/scans/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Scan deleted", { id: toastId });
        fetchScans();
        setSelectedScans((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete scan", { id: toastId });
    }
  };

  // 🆕 NEW: Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (selectedScans.size === 0) return;

    const count = selectedScans.size;
    const toastId = toast.loading(`Deleting ${count} scans...`);

    try {
      // Execute all delete requests in parallel
      const deletePromises = Array.from(selectedScans).map((id) =>
        fetch(`/api/dashboard/scans/${id}`, { method: "DELETE" }),
      );

      await Promise.all(deletePromises);

      toast.success(`Deleted ${count} scans`, { id: toastId });
      setSelectedScans(new Set());
      fetchScans(); // Refresh list
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete some scans", { id: toastId });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedScans(checked ? new Set(scans.map((s) => s.id)) : new Set());
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedScans);
    checked ? newSet.add(id) : newSet.delete(id);
    setSelectedScans(newSet);
  };

  const navigateToReport = (scan: Scan) => {
    const toolSlug = scan.tool_id || "unknown";
    router.push(`/dashboard/scans/${toolSlug}/${scan.id}`);
  };

  // --- Helpers ---

  const getDuration = (start: string, end?: string) => {
    if (!end) return null;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getSeverityCounts = (scan: Scan) => {
    if (scan.status !== "completed" || !scan.result) {
      return { critical: 0, high: 0, medium: 0, low: 0 };
    }
    if (scan.result.severity_summary) {
      return scan.result.severity_summary;
    }
    const findings = scan.result.findings || scan.result.vulnerabilities || [];
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };

    if (Array.isArray(findings)) {
      findings.forEach((f: any) => {
        const sev = (f.severity || f.info?.severity || "").toLowerCase();
        if (counts.hasOwnProperty(sev)) {
          // @ts-ignore
          counts[sev]++;
        }
      });
    }
    return counts;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4 font-sans text-slate-200 p-6">
      {/* --- Fixed Header Section --- */}
      <div className="flex-none flex items-end justify-between space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Scan Activity
          </h1>
          <p className="text-sm text-slate-400">
            Monitor running assessments and review past results.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 🆕 Conditional Rendering for Bulk Actions */}
          {selectedScans.size > 0 ? (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 animate-in fade-in zoom-in-95 duration-200"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedScans.size})
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/dashboard/new-scan")}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:from-violet-500 hover:to-indigo-500 border-0"
            >
              <Zap className="mr-2 h-4 w-4 fill-white/20" /> New Scan
            </Button>
          )}
        </div>
      </div>

      {/* --- Main Glass Card --- */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-white/10 bg-[#0B0C15]/50 backdrop-blur-md shadow-xl overflow-hidden">
        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#0B0C15] shadow-sm shadow-black/40">
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500 font-medium">
                <th className="py-4 px-6 w-12 bg-[#0B0C15]">
                  <Checkbox
                    checked={
                      scans.length > 0 &&
                      selectedScans.size === scans.length &&
                      !isLoading
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={isLoading}
                    className="border-white/20 data-[state=checked]:bg-violet-600"
                  />
                </th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">
                  Scan Name
                </th>
                <th className="py-4 px-4 font-semibold text-center bg-[#0B0C15]">
                  Status
                </th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">Target</th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">
                  Findings
                </th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">Timing</th>
                <th className="py-4 px-4 bg-[#0B0C15]"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-sm">
              {isLoading ? (
                // --- SKELETON ROWS ---
                <>
                  {[...Array(10)].map((_, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 animate-pulse"
                    >
                      <td className="py-4 px-6">
                        <div className="h-4 w-4 bg-white/10 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-white/10 rounded-lg shrink-0" />
                          <div className="space-y-2 w-full max-w-[140px]">
                            <div className="h-4 w-full bg-white/10 rounded" />
                          </div>
                        </div>
                      </td>
                      {/* ... other skeletons ... */}
                      <td className="py-4 px-4" colSpan={5}></td>
                    </tr>
                  ))}
                </>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No scans found. Start your first scan!
                  </td>
                </tr>
              ) : (
                // --- DATA ROWS ---
                scans.map((scan) => {
                  const summary = getSeverityCounts(scan);
                  const duration = getDuration(
                    scan.created_at,
                    scan.completed_at,
                  );

                  return (
                    <tr
                      key={scan.id}
                      onClick={() => navigateToReport(scan)} // 🆕 Click entire row
                      className={cn(
                        "group transition-colors hover:bg-white/[0.03] cursor-pointer", // 🆕 Cursor pointer
                        selectedScans.has(scan.id) && "bg-violet-500/[0.05]",
                      )}
                    >
                      <td
                        className="py-4 px-6"
                        onClick={(e) => e.stopPropagation()} // 🆕 Prevent navigation when checking box
                      >
                        <Checkbox
                          checked={selectedScans.has(scan.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(scan.id, checked as boolean)
                          }
                          className="border-white/20 data-[state=checked]:bg-violet-600"
                        />
                      </td>

                      {/* Tool Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                            <Zap size={16} />
                          </div>
                          <span className="font-medium text-slate-200 group-hover:text-violet-300 transition-colors">
                            {scan.tool_name}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <StatusBadge status={scan.status} />
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="truncate text-slate-300 font-mono text-xs">
                            {scan.target}
                          </span>
                        </div>
                      </td>

                      {/* Findings Summary */}
                      <td className="py-4 px-4">
                        {scan.status === "completed" ? (
                          <div className="flex items-center gap-1.5">
                            <VulnPill
                              count={summary.critical}
                              color="critical"
                            />
                            <VulnPill count={summary.high} color="high" />
                            <VulnPill count={summary.medium} color="medium" />
                            <VulnPill count={summary.low} color="low" />
                            {summary.critical +
                              summary.high +
                              summary.medium +
                              summary.low ===
                              0 && (
                              <span className="text-xs text-slate-600">
                                Clean
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </td>

                      {/* Timing */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-300">
                            {new Date(scan.created_at).toLocaleDateString()}
                          </span>
                          {duration && (
                            <span className="text-[10px] text-slate-500">
                              {duration}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 px-4 text-right"
                        onClick={(e) => e.stopPropagation()} // 🆕 Prevent navigation when clicking menu
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[#0B0C15] border-white/10 text-slate-200"
                          >
                            <DropdownMenuLabel>Options</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => navigateToReport(scan)}
                              className="cursor-pointer focus:bg-white/10"
                            >
                              <FileText className="mr-2 h-4 w-4" /> View Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(scan.id)}
                              className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer (Pagination) */}
        {!isLoading && (
          <div className="flex-none flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
            <div className="text-xs text-slate-400">
              Showing {(page - 1) * limit + 1}-
              {Math.min(page * limit, totalScans)} of {totalScans} scans
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/5 text-slate-400"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-500 px-2">
                Page {page} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/5 text-slate-400"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components (Same as before) ---

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <div className="relative group">
        <CheckCircle2 size={18} className="text-emerald-500" />
        <div className="absolute inset-0 bg-emerald-500/20 blur-[6px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }
  if (status === "running" || status === "queued") {
    return (
      <div className="flex items-center gap-2 text-blue-400" title={status}>
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }
  if (status === "failed") {
    return <XCircle size={18} className="text-red-500" title="Failed" />;
  }
  if (status === "cancelled") {
    return (
      <StopCircle size={18} className="text-slate-500" title="Cancelled" />
    );
  }
  return <Calendar size={18} className="text-slate-500" />;
}

function VulnPill({
  count,
  color,
}: {
  count: number;
  color: "critical" | "high" | "medium" | "low";
}) {
  if (count === 0) return null;

  const styles = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <span
      className={cn(
        "flex items-center justify-center min-w-[24px] px-1.5 h-5 text-[10px] font-bold rounded border",
        styles[color],
      )}
    >
      {count}
    </span>
  );
}
