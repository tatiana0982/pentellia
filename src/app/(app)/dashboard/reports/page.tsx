"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

// --- Types ---
interface Report {
  id: string;
  target: string;
  tool_name: string;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const limit = 10;

  // --- Fetch Data ---
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/reports?page=${page}&limit=${limit}`
      );
      const data = await res.json();

      if (data.success) {
        setReports(data.reports);
        setTotalPages(data.pagination.totalPages);
        setTotalReports(data.pagination.total);
      }
    } catch (error) {
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // --- Handlers ---

  const handleDownload = async (report: Report) => {
    setIsDownloading(report.id);
    const toastId = toast.loading("Downloading report...");

    try {
      const res = await fetch(`/api/dashboard/reports/${report.id}`);

      if (!res.ok) throw new Error("Download failed");

      // Convert response to blob and trigger download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EncodersPro_Report_${report.target}_${report.id.slice(
        0,
        6
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Download complete", { id: toastId });
    } catch (error) {
      toast.error("Failed to download file", { id: toastId });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading("Deleting...");
    try {
      const res = await fetch(`/api/dashboard/reports/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Report deleted", { id: toastId });
        fetchReports(); // Refresh list
      } else {
        throw new Error("Failed");
      }
    } catch (error) {
      toast.error("Delete failed", { id: toastId });
    }
  };

  return (
    <div className="px-8 pt-6 pb-10 space-y-5 font-sans text-slate-200">
      {/* --- Header --- */}
      <div className="flex-none flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Generated Reports
          </h1>
          <p className="text-sm text-slate-400">
            Archive of all security assessment PDFs.
          </p>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="rounded-lg border border-white/[0.08] bg-[#0B0C15]/50 overflow-hidden">
        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#0B0C15] shadow-sm shadow-black/40">
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500 font-medium">
                <th className="py-4 px-6 font-semibold bg-[#0B0C15]">
                  Report Name
                </th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">Target</th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">
                  Date Generated
                </th>
                <th className="py-4 px-4 text-right bg-[#0B0C15]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-sm">
              {isLoading ? (
                // Skeleton Rows
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 w-32 bg-white/10 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-40 bg-white/10 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-white/10 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-8 w-8 bg-white/10 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No reports found. Generate one from the Scans page.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    className="group hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">
                            Security Assessment
                          </p>
                          <p className="text-xs text-slate-500">
                            {report.tool_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-slate-300 bg-white/5 px-2 py-1 rounded">
                        {report.target}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(report.created_at).toLocaleDateString()} at{" "}
                      {new Date(report.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => handleDownload(report)}
                          disabled={isDownloading === report.id}
                        >
                          {isDownloading === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[#0B0C15] border-white/10 text-slate-200"
                          >
                            <DropdownMenuItem
                              onClick={() => handleDelete(report.id)}
                              className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                              Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        {!isLoading && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
            <span className="text-xs text-slate-500">
              Showing {(page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, totalReports)} of {totalReports} reports
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/5 disabled:opacity-30"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/5 disabled:opacity-30"
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