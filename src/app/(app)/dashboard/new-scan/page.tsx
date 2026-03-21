"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Sparkles, Star, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getIcon } from "@/lib/icon-map";
import { useDomainGate } from "@/context/DomainVerificationContext";
import toast from "react-hot-toast";

// --- Types ---
interface SecurityTool {
  id: string;
  name: string;
  description: string;
  category: string;
  slug: string;
}

const PINNED_TOOLS = ["webscan", "cloudscan", "networkscan"];
const MAINTENANCE_TOOLS = ["gvm", "cvesearch"];

// --- Skeleton Loader ---
function ToolSkeleton() {
  return (
    <div className="flex flex-col p-5 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse space-y-3">
      <div className="h-9 w-9 rounded-lg bg-white/10" />
      <div className="h-4 w-2/3 bg-white/10 rounded" />
      <div className="h-3 w-full bg-white/5 rounded" />
      <div className="h-3 w-4/5 bg-white/5 rounded" />
    </div>
  );
}

export default function NewScanPage() {
  const router = useRouter();
  const { requireVerifiedDomain } = useDomainGate();

  const [tools, setTools] = useState<SecurityTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // --- Fetch Tools ---
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch("/api/tools");
        const data = await res.json();
        if (data.success) {
          setTools(data.tools);
        } else {
          toast.error("Failed to load tools");
        }
      } catch (error) {
        console.error("Error fetching tools:", error);
        toast.error("Network error loading tools");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTools();
  }, []);

  // --- Filtering & Sorting ---
  const filteredTools = tools
    .filter((tool) => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory
        ? tool.category === selectedCategory
        : true;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aPinned = PINNED_TOOLS.includes(a.slug) || PINNED_TOOLS.includes(a.id);
      const bPinned = PINNED_TOOLS.includes(b.slug) || PINNED_TOOLS.includes(b.id);
      const aMaint = MAINTENANCE_TOOLS.includes(a.slug) || MAINTENANCE_TOOLS.includes(a.id);
      const bMaint = MAINTENANCE_TOOLS.includes(b.slug) || MAINTENANCE_TOOLS.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (aMaint && !bMaint) return 1;
      if (!aMaint && bMaint) return -1;
      return 0;
    });

  const categories = Array.from(new Set(tools.map((t) => t.category)));

  // ── Domain-gated tool click ──────────────────────────────────
  // requireVerifiedDomain() returns true if allowed, false + opens
  // the verification modal automatically if not verified.
  const handleToolClick = (slug: string) => {
    if (!requireVerifiedDomain()) return;
    router.push(`/dashboard/new-scan/${slug}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 font-sans text-slate-200">
      {/* --- Header --- */}
      <div className="flex-none space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            New Scan
          </h1>
          <p className="text-sm text-slate-400">
            Select a tool to configure and launch a new security assessment.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Find a scanner..."
              className="pl-9 bg-[#0B0C15]/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-violet-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {!isLoading && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  selectedCategory === null
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/50"
                    : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-white",
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setSelectedCategory(cat === selectedCategory ? null : cat)
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    selectedCategory === cat
                      ? "bg-violet-600/20 text-violet-300 border-violet-500/50"
                      : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-white",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Tools Grid --- */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <ToolSkeleton key={i} />
            ))}
          </div>
        ) : filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {filteredTools.map((tool) => {
              const Icon = getIcon(tool.id);
              const isPinned =
                PINNED_TOOLS.includes(tool.slug) ||
                PINNED_TOOLS.includes(tool.id);
              const isMaintenance =
                MAINTENANCE_TOOLS.includes(tool.slug) ||
                MAINTENANCE_TOOLS.includes(tool.id);

              return (
                <div
                  key={tool.id}
                  onClick={() => !isMaintenance && handleToolClick(tool.slug)}
                  className={cn(
                    "group relative flex flex-col p-5 rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden",
                    isPinned
                      ? "bg-violet-500/[0.08] border-violet-500/40 hover:bg-violet-500/[0.12] hover:border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.1)] cursor-pointer"
                      : isMaintenance
                        ? "bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20 cursor-pointer",
                  )}
                >
                  {/* Pinned glow */}
                  {isPinned && (
                    <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {isPinned && (
                      <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[9px] px-1.5 py-0.5">
                        <Star className="h-2.5 w-2.5 mr-1 fill-current" />
                        Featured
                      </Badge>
                    )}
                    {isMaintenance && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0.5">
                        <Wrench className="h-2.5 w-2.5 mr-1" />
                        Maintenance
                      </Badge>
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg mb-3 transition-colors",
                      isPinned
                        ? "bg-violet-500/20 text-violet-400 group-hover:bg-violet-500/30"
                        : "bg-white/10 text-slate-400 group-hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Name */}
                  <p
                    className={cn(
                      "font-semibold text-sm mb-1 pr-16 transition-colors",
                      isPinned
                        ? "text-violet-200 group-hover:text-white"
                        : "text-slate-200 group-hover:text-white",
                    )}
                  >
                    {tool.name}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
                    {tool.description}
                  </p>

                  {/* Category + arrow */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">
                      {tool.category}
                    </span>
                    {!isMaintenance && (
                      <ArrowRight
                        className={cn(
                          "h-3.5 w-3.5 transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5",
                          isPinned ? "text-violet-400" : "text-slate-400",
                        )}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Sparkles className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No tools match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}