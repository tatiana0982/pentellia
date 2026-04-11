"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Sparkles, Star, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getIcon } from "@/lib/icon-map";
import toast from "react-hot-toast";

// --- Types ---
interface SecurityTool {
  id:          string;
  name:        string;
  description: string;
  category:    string;
  slug:        string;
}

const PINNED_TOOLS      = ["webscan", "cloudscan", "networkscan"];
const MAINTENANCE_TOOLS = ["gvm", "cvesearch"];

// --- Skeleton ---
function ToolSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-white/10 bg-[#0B0C15]/40 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-12 w-12 bg-white/5 rounded-lg" />
        <div className="h-5 w-16 bg-white/5 rounded-full" />
      </div>
      <div className="h-6 w-3/4 bg-white/5 rounded mb-2" />
      <div className="h-4 w-full bg-white/5 rounded mb-1" />
      <div className="h-4 w-2/3 bg-white/5 rounded" />
      <div className="mt-4 h-4 w-1/3 bg-white/5 rounded" />
    </div>
  );
}

// ─── Shared ToolCard ────────────────────────────────────────────────
function ToolCard({ tool, onSelect }: { tool: SecurityTool; onSelect: (slug: string) => void }) {
  const Icon         = getIcon(tool.id);
  const isPinned     = PINNED_TOOLS.includes(tool.slug) || PINNED_TOOLS.includes(tool.id);
  const isMaintenance = MAINTENANCE_TOOLS.includes(tool.slug) || MAINTENANCE_TOOLS.includes(tool.id);
  return (
    <div
      onClick={() => !isMaintenance && onSelect(tool.slug)}
      className={cn(
        "group relative flex flex-col p-5 rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden",
        isPinned      ? "bg-violet-500/[0.08] border-violet-500/40 hover:bg-violet-500/[0.12] hover:border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.1)] cursor-pointer"
        : isMaintenance ? "bg-amber-500/[0.08] border-amber-500/40 cursor-not-allowed opacity-90"
        : "bg-[#0B0C15]/40 border-white/10 hover:bg-white/[0.07] hover:border-violet-500/30 cursor-pointer",
      )}
    >
      {isPinned     && <div className="absolute top-0 right-0 p-16 bg-violet-500/20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />}
      {isMaintenance && <div className="absolute top-0 right-0 p-16 bg-amber-500/10  blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg border transition-colors",
          isPinned ? "bg-violet-500/20 border-violet-500/30 text-violet-200"
          : isMaintenance ? "bg-amber-500/20 border-amber-500/30 text-amber-200"
          : "bg-white/5 border-white/5 text-slate-300 group-hover:border-violet-500/20 group-hover:bg-violet-500/10 group-hover:text-violet-300")}>
          <Icon className="h-6 w-6" />
        </div>
        {isPinned ? (
          <Badge className="bg-violet-500 text-white border-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" /> Recommended
          </Badge>
        ) : isMaintenance ? (
          <Badge className="bg-amber-500 text-white border-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1">
            <Wrench className="h-3 w-3" /> Maintenance
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-transparent border-white/10 text-slate-500 text-[10px] uppercase tracking-wider group-hover:border-violet-500/20 group-hover:text-violet-400">
            {tool.category}
          </Badge>
        )}
      </div>
      <div className="relative z-10 flex-1">
        <h3 className={cn("font-semibold text-lg mb-1 transition-colors",
          isPinned ? "text-white group-hover:text-violet-100"
          : isMaintenance ? "text-white/80"
          : "text-white group-hover:text-violet-200")}>{tool.name}</h3>
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{tool.description}</p>
      </div>
      <div className={cn("relative z-10 mt-4 flex items-center text-xs font-medium transition-colors",
        isPinned ? "text-violet-300 group-hover:text-violet-200"
        : isMaintenance ? "text-amber-400/80"
        : "text-slate-500 group-hover:text-violet-400")}>
        {isMaintenance ? <span>Currently Unavailable</span> : (
          <><span>Configure Scan</span><ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></>
        )}
      </div>
    </div>
  );
}

// ─── Clustered A–Z Category View ────────────────────────────────────
// Pinned tools always first, then categories in alphabetical order
function ClusteredView({ tools, onSelect }: { tools: SecurityTool[]; onSelect: (slug: string) => void }) {
  // Separate pinned from rest
  const pinned = tools.filter(t => PINNED_TOOLS.includes(t.slug) || PINNED_TOOLS.includes(t.id));
  const rest   = tools.filter(t => !PINNED_TOOLS.includes(t.slug) && !PINNED_TOOLS.includes(t.id));

  // Group rest by category, sort categories A–Z
  const categoryMap = new Map<string, SecurityTool[]>();
  for (const tool of rest) {
    const cat = tool.category || "Other";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(tool);
  }
  const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-10 pb-10">
      {/* ── Recommended ──────────────────────────────────────────── */}
      {pinned.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-4 w-4 text-violet-400 fill-violet-400" />
            <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Recommended</span>
            <div className="flex-1 h-px bg-violet-500/20" />
            <span className="text-[11px] text-slate-600">{pinned.length} tools</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pinned.map(t => <ToolCard key={t.id} tool={t} onSelect={onSelect} />)}
          </div>
        </div>
      )}

      {/* ── A–Z Categories ───────────────────────────────────────── */}
      {sortedCategories.map(category => {
        const catTools = categoryMap.get(category)!;
        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-5 w-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-black text-slate-400">{category[0].toUpperCase()}</span>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{category}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[11px] text-slate-600">{catTools.length} tool{catTools.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {catTools.map(t => <ToolCard key={t.id} tool={t} onSelect={onSelect} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function NewScanPage() {
  const router = useRouter();

  const [tools, setTools]                   = useState<SecurityTool[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [searchQuery, setSearchQuery]       = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // --- Fetch Tools ---
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res  = await fetch("/api/tools");
        const data = await res.json();
        if (data.success) {
          setTools(data.tools);
        } else {
          toast.error("Failed to load tools");
        }
      } catch {
        toast.error("Network error loading tools");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTools();
  }, []);

  // --- Filter & Sort ---
  const filteredTools = tools
    .filter(tool => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? tool.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aPinned = PINNED_TOOLS.includes(a.slug) || PINNED_TOOLS.includes(a.id);
      const bPinned = PINNED_TOOLS.includes(b.slug) || PINNED_TOOLS.includes(b.id);
      const aMaint  = MAINTENANCE_TOOLS.includes(a.slug) || MAINTENANCE_TOOLS.includes(a.id);
      const bMaint  = MAINTENANCE_TOOLS.includes(b.slug) || MAINTENANCE_TOOLS.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (aMaint  && !bMaint)  return 1;
      if (!aMaint && bMaint)   return -1;
      return 0;
    });

  const categories = Array.from(new Set(tools.map(t => t.category)));

  // ── Tool click — no domain gate, subscription is enforced server-side ──
  const handleToolClick = (slug: string) => {
    router.push(`/dashboard/new-scan/${slug}`);
  };

  return (
    <div className="px-8 pt-6 pb-10 space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="flex-none space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">New Scan</h1>
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
              onChange={e => setSearchQuery(e.target.value)}
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
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
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

      {/* Tools Grid */}
      <div className="mt-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {Array.from({ length: 8 }).map((_, i) => <ToolSkeleton key={i} />)}
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
            <Search className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No tools found</p>
            <p className="text-sm">Try adjusting your search terms</p>
          </div>
        ) : (searchQuery || selectedCategory) ? (
          // Flat grid when filtering/searching
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {filteredTools.map(tool => <ToolCard key={tool.id} tool={tool} onSelect={handleToolClick} />)}
          </div>
        ) : (
          // Clustered A–Z category view when browsing all
          <ClusteredView tools={filteredTools} onSelect={handleToolClick} />
        )}
      </div>
    </div>
  );
}