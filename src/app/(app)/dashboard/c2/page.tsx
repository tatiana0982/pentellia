"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  FolderOpen,
  FileText,
  Download,
  Copy,
  Search,
  Code2,
  Database,
  ShieldAlert,
  ChevronRight,
  Loader2,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";

// --- 1. DATA SOURCE (SecLists Mapping) ---
// We point to raw GitHub URLs for the actual "hacker" lists.
const WORDLIST_CATEGORIES = [
  {
    id: "passwords",
    name: "Passwords",
    icon: KeyIcon,
    lists: [
      {
        name: "OWASP Weak Passwords",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt",
        desc: "OWASP-style weak password list (10k).",
      },
      {
        name: "Common Credentials",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/top-20-common-SSH-passwords.txt",
        desc: "Frequently used username and password combinations.",
      },
      {
        name: "Default Creds",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Default-Credentials/default-passwords.csv",
        desc: "Default vendor logins (admin:admin, etc).",
      },
      {
        name: "WiFi WPA",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/WiFi-WPA/probable-v2-wpa-top4800.txt",
        desc: "Common WPA2 PSK phrases.",
      },
    ],
  },
  {
    id: "discovery",
    name: "Discovery (DNS/Web)",
    icon: GlobeIcon,
    lists: [
      {
        name: "Subdomains Top 5000",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt",
        desc: "High-probability subdomains for enumeration.",
      },
      {
        name: "Web Content (Common)",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt",
        desc: "Standard directories and files.",
      },
      {
        name: "API Endpoints",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/api/api-endpoints.txt",
        desc: "Common API routes (/v1, /api/user).",
      },
    ],
  },
  // {
  //   id: "fuzzing",
  //   name: "Fuzzing & Payloads",
  //   icon: BombIcon,
  //   lists: [
  //     {
  //       name: "XSS Polyglots",
  //       url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Fuzzing/XSS/XSS-Bypass-Strings-BruteLogic.txt",
  //       desc: "Scripts to bypass WAFs and filters.",
  //     },
  //     {
  //       name: "SQL Injection",
  //       url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Fuzzing/SQLi/Quick-SQLi.txt",
  //       desc: "Quick check SQLi payloads.",
  //     },
  //     {
  //       name: "LFI / Path Traversal",
  //       url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Fuzzing/LFI/LFI-Jhaddix.txt",
  //       desc: "Classic ../../../etc/passwd vectors.",
  //     },
  //   ],
  // },
  {
    id: "usernames",
    name: "Usernames",
    icon: UserIcon,
    lists: [
      {
        name: "Top Usernames",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/top-usernames-shortlist.txt",
        desc: "Shortlist of common user handles.",
      },
      {
        name: "Names (USA)",
        url: "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/Names/names.txt",
        desc: "Common first names for brute forcing.",
      },
    ],
  },
];

// --- COMPONENTS ---

export default function WordlistsPage() {
  const [selectedList, setSelectedList] = useState(
    WORDLIST_CATEGORIES[0].lists[0]
  );
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Inside src/app/dashboard/wordlists/page.tsx

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        // FIX: Use our local proxy instead of direct GitHub URL
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(
          selectedList.url
        )}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Failed to fetch");

        const text = await res.text();
        // Limit to first 1000 lines for performance
        const preview = text.split("\n").slice(0, 1000).join("\n");
        setContent(preview);
      } catch (error) {
        setContent(
          "Error: Could not load remote wordlist.\nCheck your connection or the source repository."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [selectedList]);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Preview copied to clipboard");
  };

  const handleDownload = () => {
    window.open(selectedList.url, "_blank");
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 font-mono text-slate-300 p-2 overflow-hidden">
      {/* LEFT: The "File Explorer" */}
      <div className="w-80 flex flex-col bg-[#0B0C15]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shrink-0">
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-violet-400">
            <Terminal className="h-5 w-5" />
            <h2 className="text-sm font-bold tracking-widest uppercase">
              Payload_Library
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="grep wordlist..."
              className="h-9 bg-black/40 border-white/10 pl-8 text-xs focus-visible:ring-violet-500/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-4">
            {WORDLIST_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 px-2 uppercase tracking-wide">
                  <cat.icon className="h-3 w-3" />
                  {cat.name}
                </div>
                <div className="space-y-0.5">
                  {cat.lists
                    .filter((l) =>
                      l.name.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((list) => (
                      <button
                        key={list.url}
                        onClick={() => setSelectedList(list)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-xs transition-all flex items-center justify-between group",
                          selectedList.url === list.url
                            ? "bg-violet-600/10 text-violet-300 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                            : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <span className="truncate">{list.name}</span>
                        {selectedList.url === list.url && (
                          <ChevronRight className="h-3 w-3 animate-pulse" />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT: The "Terminal Viewer" */}
      <div className="flex-1 flex flex-col bg-[#0f1019] rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
        {/* CRT Scanline Effect Overlay (Subtle) */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20" />

        {/* Viewer Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-[#0B0C15]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-bold text-white">
                {selectedList.name}.txt
              </span>
              <Badge
                variant="outline"
                className="bg-white/5 text-[10px] text-slate-400 border-white/10 h-5"
              >
                REMOTE
              </Badge>
            </div>
            <span className="text-[10px] text-slate-500 truncate max-w-md mt-0.5">
              {selectedList.desc}
            </span>
          </div>

          <div className="flex items-center gap-2 z-20">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
            >
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy Preview
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Download Full
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-[#0d0e14]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-500/50 gap-4">
              <Loader2 className="h-10 w-10 animate-spin" />
              <div className="text-xs font-mono animate-pulse">
                ESTABLISHING UPLINK...
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Line Numbers + Content */}
                <div className="flex gap-4 text-sm font-mono leading-relaxed">
                  <div className="flex flex-col text-slate-700 select-none text-right min-w-[2rem]">
                    {content.split("\n").map((_, i) => (
                      <span key={i}>{i + 1}</span>
                    ))}
                  </div>
                  <pre className="text-slate-300 whitespace-pre-wrap break-all selection:bg-emerald-500/30 selection:text-emerald-200">
                    {content}
                  </pre>
                </div>

                {/* Bottom Fade indicating truncation */}
                <div className="mt-4 pt-4 border-t border-dashed border-white/10 text-center text-xs text-slate-500">
                  <span className="bg-[#0d0e14] px-2 -mt-7 inline-block">
                    --- End of Preview (First 500 lines) ---
                  </span>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="h-8 bg-[#0B0C15] border-t border-white/10 flex items-center justify-between px-4 text-[10px] text-slate-500 z-20">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SOURCE: SEC_LISTS_MASTER
            </span>
            <span className="hidden sm:inline">TYPE: TEXT/PLAIN</span>
          </div>
          <div className="flex gap-4">
            <span>LINES: {content ? content.split("\n").length : 0}+</span>
            <span>SIZE: PREVIEW_MODE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ICONS (Helpers) ---
function KeyIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function GlobeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function BombIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="13" r="9" />
      <path d="M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95" />
      <path d="m22 2-1.5 1.5" />
    </svg>
  );
}
function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
