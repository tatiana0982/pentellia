"use client";

// src/app/(app)/dashboard/c2/page.tsx
// Arsenal — SecLists wordlist browser.
// Fetches via /api/arsenal/wordlist backend proxy (CSP-safe).

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, Download, Copy, Search,
  Code2, ChevronRight, Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge }  from "@/components/ui/badge";
import toast from "react-hot-toast";

// ── Data ──────────────────────────────────────────────────────────────
// `path` matches the allowlist in /api/arsenal/wordlist/route.ts
const WORDLIST_CATEGORIES = [
  {
    id:   "passwords",
    name: "Passwords",
    icon: KeyIcon,
    lists: [
      { name: "10k Common Passwords",   path: "Passwords/Common-Credentials/10k-most-common.txt",                    desc: "OWASP-style weak password list." },
      { name: "Top SSH Passwords",      path: "Passwords/Common-Credentials/top-20-common-SSH-passwords.txt",        desc: "Top 20 SSH brute-force passwords." },
      { name: "Default Credentials",    path: "Passwords/Default-Credentials/default-passwords.csv",                 desc: "Default vendor logins (admin:admin, etc.)." },
      { name: "WPA Probable Passwords", path: "Passwords/WiFi-WPA/probable-v2-wpa-top4800.txt",                      desc: "Common WPA2 PSK passphrases." },
    ],
  },
  {
    id:   "discovery",
    name: "Discovery",
    icon: GlobeIcon,
    lists: [
      { name: "Subdomains — 5k",        path: "Discovery/DNS/subdomains-top1million-5000.txt",                       desc: "Top 5k subdomain wordlist." },
      { name: "Web Content Common",     path: "Discovery/Web-Content/common.txt",                                    desc: "Common web paths for directory brute-force." },
      { name: "API Endpoints",          path: "Discovery/Web-Content/api/api-endpoints.txt",                         desc: "Common API route patterns." },
      { name: "Directories + Ext.",     path: "Discovery/Web-Content/directory-list-2.3-small.txt",                  desc: "Directory list for web enumeration." },
    ],
  },
  {
    id:   "usernames",
    name: "Usernames",
    icon: UserIcon,
    lists: [
      { name: "Top Usernames",          path: "Usernames/top-usernames-shortlist.txt",                               desc: "Common admin/service usernames." },
      { name: "Names",                  path: "Usernames/Names/names.txt",                                            desc: "First names wordlist." },
    ],
  },
  {
    id:   "payloads",
    name: "Payloads",
    icon: BombIcon,
    lists: [
      { name: "XSS — Basic",            path: "Fuzzing/XSS/XSS-Jhaddix.txt",                                         desc: "XSS payload list by Jhaddix." },
      { name: "SQLi",                   path: "Fuzzing/SQLi/Generic-SQLi.txt",                                        desc: "Generic SQL injection payloads." },
      { name: "LFI Payloads",           path: "Fuzzing/LFI/LFI-gracefulsecurity-linux.txt",                           desc: "Linux LFI traversal strings." },
      { name: "SSRF Payloads",          path: "Fuzzing/SSRF.txt",                                                     desc: "SSRF payload collection." },
    ],
  },
];

type ListItem = { name: string; path: string; desc: string };
const DEFAULT_LIST = WORDLIST_CATEGORIES[0].lists[0];
const GH_BASE      = "https://raw.githubusercontent.com/danielmiessler/SecLists/master";

// ── Main ──────────────────────────────────────────────────────────────
export default function ArsenalPage() {
  const [selectedList, setSelectedList] = useState<ListItem>(DEFAULT_LIST);
  const [content,      setContent]      = useState("");
  const [totalLines,   setTotalLines]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");

  // Fetch via backend proxy — bypasses CSP
  const fetchList = useCallback(async (list: ListItem) => {
    setLoading(true);
    setError(null);
    setContent("");
    setTotalLines(0);
    try {
      const res  = await fetch(`/api/arsenal/wordlist?path=${encodeURIComponent(list.path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setContent(data.content ?? "");
      setTotalLines(data.total ?? 0);
    } catch (err: any) {
      setError("Failed to load wordlist. Please try again.");
      console.error("[Arsenal]", err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(selectedList); }, [selectedList, fetchList]);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleDownload = () => {
    // Download full file directly from GitHub (browser download — not blocked by connect-src)
    const filename = selectedList.name.replace(/\s+/g, "_").toLowerCase() + ".txt";
    const a = Object.assign(document.createElement("a"), {
      href: `${GH_BASE}/${selectedList.path}`,
      target: "_blank", rel: "noopener noreferrer",
      download: filename,
    });
    a.click();
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 font-mono animate-in fade-in duration-300">

      {/* ── LEFT: Category browser ── */}
      <div className="w-60 shrink-0 flex flex-col rounded-lg border border-white/[0.07] bg-[#0d0e1a] overflow-hidden">
        <div className="h-11 flex items-center gap-2 px-4 border-b border-white/[0.06]">
          <Code2 className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Arsenal</span>
          <Badge variant="outline" className="ml-auto bg-white/[0.04] text-[10px] text-slate-500 border-white/[0.07] h-5">
            SecLists
          </Badge>
        </div>

        <div className="p-2.5 border-b border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter lists…"
              className="pl-8 h-7 bg-black/30 border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:ring-0"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-3">
            {WORDLIST_CATEGORIES.map(cat => {
              const filtered = cat.lists.filter(l =>
                l.name.toLowerCase().includes(search.toLowerCase()),
              );
              if (!filtered.length) return null;
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                    <cat.icon className="h-3 w-3 text-slate-600" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{cat.name}</span>
                  </div>
                  <div className="space-y-0.5">
                    {filtered.map(list => (
                      <button
                        key={list.path}
                        onClick={() => setSelectedList(list)}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded-md text-xs transition-all flex items-center justify-between gap-2",
                          selectedList.path === list.path
                            ? "bg-violet-500/10 text-violet-300 border border-violet-500/15"
                            : "hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent",
                        )}
                      >
                        <span className="truncate">{list.name}</span>
                        {selectedList.path === list.path && <ChevronRight className="h-3 w-3 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* ── RIGHT: Terminal viewer ── */}
      <div className="flex-1 flex flex-col rounded-lg border border-white/[0.07] bg-[#0a0b10] overflow-hidden relative">

        {/* Header */}
        <div className="h-12 flex items-center justify-between px-5 border-b border-white/[0.07] bg-[#0d0e1a] z-10 shrink-0">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-bold text-white">{selectedList.name}</span>
              {totalLines > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">{totalLines.toLocaleString()} lines</span>
              )}
            </div>
            <span className="text-[10px] text-slate-600 mt-0.5 max-w-xs truncate">{selectedList.desc}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy} disabled={!content} className="h-8 border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs">
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
            </Button>
            <Button size="sm" onClick={handleDownload} className="h-8 bg-violet-600 hover:bg-violet-500 text-white border-0 text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download Full
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-violet-500/40" />
              <span className="text-xs text-slate-600 animate-pulse font-mono">FETCHING WORDLIST…</span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <AlertCircle className="h-7 w-7 text-red-500/40" />
              <p className="text-xs text-slate-500">{error}</p>
              <button
                onClick={() => fetchList(selectedList)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-5">
                <div className="flex gap-4 text-xs leading-relaxed">
                  <div className="flex flex-col text-slate-700 select-none text-right min-w-[2.5rem] shrink-0">
                    {content.split("\n").map((_, i) => <span key={i}>{i + 1}</span>)}
                  </div>
                  <pre className="text-slate-300 whitespace-pre-wrap break-all flex-1 selection:bg-violet-500/20">
                    {content}
                  </pre>
                </div>
                <div className="mt-4 pt-4 border-t border-dashed border-white/[0.05] text-center">
                  <span className="text-[11px] text-slate-600">
                    Preview: first 500 lines · {totalLines.toLocaleString()} total · click Download Full for complete list
                  </span>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Status bar */}
        <div className="h-6 bg-[#0d0e1a] border-t border-white/[0.06] flex items-center justify-between px-4 text-[10px] text-slate-600 shrink-0">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                loading ? "bg-amber-500 animate-pulse" : error ? "bg-red-500" : "bg-violet-500",
              )} />
              {loading ? "LOADING" : error ? "ERROR" : "READY"}
            </span>
            <span>SOURCE: SECLISTS / GITHUB</span>
          </div>
          <span>LINES: {content ? content.split("\n").length : 0} (PREVIEW)</span>
        </div>
      </div>
    </div>
  );
}

// ── Icon helpers ───────────────────────────────────────────────────────
function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function BombIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="13" r="9" /><path d="M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95" /><path d="m22 2-1.5 1.5" />
    </svg>
  );
}
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}