"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  FileText,
  MoreVertical,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Globe,
  Trash2,
  Scan,
  Download,
  Server,
  Cloud,
  Loader2,
  Upload,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

// --- Types ---
interface Asset {
  id: string;
  name: string;
  endpoint: string;
  context: string;
  type: "Domain" | "IP" | "Cloud";
  risk_level: "Low" | "Medium" | "High" | "Critical";
  last_scan: string;
  status: "Active" | "Archived";
}

interface CSVAsset {
  name: string;
  endpoint: string;
  type: string;
  context: string;
}

export default function AssetsPage() {
  // --- State ---
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);

  // Selection & Filters
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedCSV, setParsedCSV] = useState<CSVAsset[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [newAsset, setNewAsset] = useState({
    name: "",
    endpoint: "",
    type: "Domain",
    context: "",
  });

  // --- API Handlers ---

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/assets?page=${page}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets);
        setTotalPages(data.pagination.totalPages);
        setTotalAssets(data.pagination.totalAssets);
      }
    } catch (error) {
      toast.error("Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/dashboard/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });

      if (res.ok) {
        toast.success("Asset added successfully");
        setIsCreateOpen(false);
        setNewAsset({ name: "", endpoint: "", type: "Domain", context: "" });
        fetchAssets();
      } else {
        throw new Error("Failed to create");
      }
    } catch (error) {
      toast.error("Failed to create asset");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    const toastId = toast.loading("Deleting asset...");
    try {
      const res = await fetch(`/api/dashboard/assets?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Asset deleted", { id: toastId });
        setAssets((prev) => prev.filter((a) => a.id !== id));
        fetchAssets();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete asset", { id: toastId });
    }
  };

  // --- CSV Logic ---

  const downloadDemoCSV = () => {
    const headers = "name,endpoint,type,context\n";
    const row1 = "Prod API,api.example.com,Domain,Main Gateway\n";
    const row2 = "DB Server,192.168.1.50,IP,Internal Database\n";
    const row3 = "AWS Bucket,s3.aws.com,Cloud,Storage";
    const content = headers + row1 + row2 + row3;

    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const processCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      const data: CSVAsset[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, endpoint, type, context] = line.split(",");

        if (name && endpoint) {
          data.push({
            name: name.trim(),
            endpoint: endpoint.trim(),
            type: type?.trim() || "Domain",
            context: context?.trim() || "",
          });
        }
      }

      if (data.length > 20) {
        toast.error(
          "Limit exceeded: Only the first 20 items will be imported."
        );
        setParsedCSV(data.slice(0, 20));
      } else {
        setParsedCSV(data);
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "text/csv") {
        toast.error("Please upload a CSV file");
        return;
      }
      setImportFile(file);
      processCSV(file);
    }
  };

  const handleBulkImport = async () => {
    if (parsedCSV.length === 0) return;
    setIsCreating(true);
    const toastId = toast.loading(`Importing ${parsedCSV.length} assets...`);

    try {
      const promises = parsedCSV.map((asset) =>
        fetch("/api/dashboard/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(asset),
        })
      );

      await Promise.all(promises);
      toast.success("Import complete!", { id: toastId });
      setIsImportOpen(false);
      setParsedCSV([]);
      setImportFile(null);
      fetchAssets();
    } catch (error) {
      toast.error("Some assets failed to import", { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  // --- Table Helpers ---
  const handleSelectAll = (checked: boolean) => {
    setSelectedAssets(checked ? new Set(assets.map((a) => a.id)) : new Set());
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedAssets);
    checked ? newSet.add(id) : newSet.delete(id);
    setSelectedAssets(newSet);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 font-sans text-slate-200">
      {/* --- Header --- */}
      <div className="flex-none space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Assets Inventory
          </h1>
          <p className="text-sm text-slate-400">
            Manage and monitor your attack surface endpoints.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Create Asset Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 border-0">
                  <Plus className="mr-2 h-4 w-4" /> Add Target
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0B0C15] border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Asset</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAsset} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Asset Name</Label>
                    <Input
                      placeholder="e.g. Production API"
                      className="bg-white/5 border-white/10"
                      value={newAsset.name}
                      onChange={(e) =>
                        setNewAsset({ ...newAsset, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint (URL/IP)</Label>
                    <Input
                      placeholder="e.g. api.example.com"
                      className="bg-white/5 border-white/10"
                      value={newAsset.endpoint}
                      onChange={(e) =>
                        setNewAsset({ ...newAsset, endpoint: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newAsset.type}
                        onValueChange={(val) =>
                          setNewAsset({ ...newAsset, type: val as any })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
                          <SelectItem value="Domain">Domain</SelectItem>
                          <SelectItem value="IP">IP Address</SelectItem>
                          <SelectItem value="Cloud">Cloud Resource</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Context (Optional)</Label>
                      <Input
                        placeholder="e.g. Main Gateway"
                        className="bg-white/5 border-white/10"
                        value={newAsset.context}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, context: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="w-full bg-violet-600 hover:bg-violet-500"
                    >
                      {isCreating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Asset
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Import CSV Dialog */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <FileText className="mr-2 h-4 w-4" /> Import List
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0B0C15] border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Import Assets from CSV</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Drag and drop your CSV file here. Max 20 assets per upload.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {!importFile ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all",
                        isDragging
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-white/10 hover:border-violet-500/50 hover:bg-white/5"
                      )}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setImportFile(e.target.files[0]);
                            processCSV(e.target.files[0]);
                          }
                        }}
                      />
                      <Upload className="h-10 w-10 text-slate-400 mb-4" />
                      <p className="text-sm font-medium text-white">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        CSV (max 20 rows)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {importFile.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {parsedCSV.length} assets found
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setImportFile(null);
                          setParsedCSV([]);
                        }}
                      >
                        <X className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>
                      Supported columns: name, endpoint, type, context
                    </span>
                    <button
                      onClick={downloadDemoCSV}
                      className="text-violet-400 hover:underline flex items-center"
                    >
                      <Download className="mr-1 h-3 w-3" /> Download Demo CSV
                    </button>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    onClick={handleBulkImport}
                    disabled={
                      !importFile || parsedCSV.length === 0 || isCreating
                    }
                    className="w-full bg-violet-600 hover:bg-violet-500"
                  >
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Import {parsedCSV.length} Assets
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* --- Main Table Card --- */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-white/10 bg-[#0B0C15]/50 backdrop-blur-md shadow-xl overflow-hidden">
        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#0B0C15] shadow-sm shadow-black/40">
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500 font-medium">
                <th className="py-4 px-6 w-12 bg-[#0B0C15]">
                  <Checkbox
                    checked={
                      selectedAssets.size === assets.length &&
                      assets.length > 0 &&
                      !isLoading
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={isLoading}
                    className="border-white/20 data-[state=checked]:bg-violet-600"
                  />
                </th>
                <th className="py-4 px-4 font-semibold w-[40%] bg-[#0B0C15]">
                  Target Endpoint
                </th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">Type</th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">
                  Risk Exposure
                </th>
                <th className="py-4 px-4 font-semibold bg-[#0B0C15]">
                  Last Scan
                </th>
                <th className="py-4 px-4 text-right font-semibold bg-[#0B0C15]">
                  Actions
                </th>
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
                          <div className="space-y-2 w-full">
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="h-3 w-20 bg-white/10 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-6 w-16 bg-white/10 rounded-full" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-6 w-20 bg-white/10 rounded-full" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-24 bg-white/10 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-8 w-8 bg-white/10 rounded ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : assets.length === 0 ? (
                // --- EMPTY STATE ---
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No assets found. Add your first target above.
                  </td>
                </tr>
              ) : (
                // --- DATA ROWS ---
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={cn(
                      "group transition-colors hover:bg-white/[0.03]",
                      selectedAssets.has(asset.id) && "bg-violet-500/[0.03]"
                    )}
                  >
                    <td className="py-4 px-6">
                      <Checkbox
                        checked={selectedAssets.has(asset.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(asset.id, checked as boolean)
                        }
                        className="border-white/20 data-[state=checked]:bg-violet-600"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          {asset.type === "Domain" && <Globe size={16} />}
                          {asset.type === "IP" && <Server size={16} />}
                          {asset.type === "Cloud" && <Cloud size={16} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-200 group-hover:text-violet-300 transition-colors truncate">
                            {asset.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                            {asset.endpoint}
                          </span>
                          <span className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                            {asset.context}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant="outline"
                        className="border-blue-500/20 bg-blue-500/10 text-blue-400 font-normal"
                      >
                        {asset.type}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <RiskBadge level={asset.risk_level} />
                    </td>
                    <td className="py-4 px-4 text-slate-400 text-xs">
                      {asset.last_scan
                        ? new Date(asset.last_scan).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-4 px-4 text-right">
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
                          <DropdownMenuLabel>Asset Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                            <Scan className="mr-2 h-4 w-4" /> Start Scan
                          </DropdownMenuItem>
                          <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                            <ExternalLink className="mr-2 h-4 w-4" /> View
                            Findings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Asset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && (
          <div className="flex-none flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
            <div className="text-xs text-slate-400">
              Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, totalAssets)}{" "}
              of {totalAssets} assets
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/5"
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
                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/5"
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

// Helper: Risk Badge
function RiskBadge({ level }: { level: Asset["risk_level"] }) {
  const styles = {
    Critical: "border-red-500/20 bg-red-500/10 text-red-400",
    High: "border-orange-500/20 bg-orange-500/10 text-orange-400",
    Medium: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
    Low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[level]
      )}
    >
      <div className={cn("h-1.5 w-1.5 rounded-full bg-current")} />
      {level}
    </div>
  );
}