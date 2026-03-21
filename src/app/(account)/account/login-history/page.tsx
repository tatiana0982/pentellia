"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Laptop, Smartphone, Monitor, Globe,
  Code2, Clock, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Event { id: string; ip_address: string; location: string; user_agent: string; login_at: string; }

const LIMIT = 5;

function getBrowser(ua: string) {
  if (/edg\//i.test(ua))     return { name:"Edge",    v: ua.match(/edg\/([\d]+)/i)?.[1]    ?? "" };
  if (/firefox\//i.test(ua)) return { name:"Firefox", v: ua.match(/firefox\/([\d]+)/i)?.[1] ?? "" };
  if (/chrome\//i.test(ua))  return { name:"Chrome",  v: ua.match(/chrome\/([\d]+)/i)?.[1]  ?? "" };
  if (/safari\//i.test(ua))  return { name:"Safari",  v: ua.match(/version\/([\d]+)/i)?.[1] ?? "" };
  return { name:"Browser", v:"" };
}
function getOS(ua: string) {
  if (/windows nt 10/i.test(ua)) return "Windows 10/11";
  if (/android/i.test(ua))       return "Android";
  if (/iphone/i.test(ua))        return "iOS";
  if (/mac os x/i.test(ua))      return "macOS";
  if (/linux/i.test(ua))         return "Linux";
  return "Unknown OS";
}
function DevIcon(ua: string) {
  if (/mobile|android|iphone/i.test(ua)) return Smartphone;
  if (/tablet|ipad/i.test(ua))           return Monitor;
  return Laptop;
}
function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400*7) return `${Math.floor(diff/86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}
function locationInfo(ip: string, loc: string) {
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127."))
    return { label:"Local Development", icon: Code2, color:"text-blue-400",  bg:"bg-blue-500/8"  };
  if (!loc || loc === "Unknown")
    return { label:"Unknown Location",  icon: Globe, color:"text-slate-500", bg:"bg-slate-800/50" };
  return { label: loc, icon: Globe, color:"text-emerald-400", bg:"bg-emerald-500/8" };
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({length:LIMIT}).map((_,i) => (
        <div key={i} className={cn("h-[76px] rounded-2xl bg-slate-900/40 animate-pulse", i%2 && "opacity-60")} />
      ))}
    </div>
  );
}

export default function LoginHistoryPage() {
  const [history,    setHistory]    = useState<Event[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  const load = useCallback(async (p: number, silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res  = await fetch(`/api/history?page=${p}&limit=${LIMIT}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else { toast.error("Failed to load"); }
    } catch { toast.error("Network error"); }
    finally  { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const go = (p: number) => { if (p >= 1 && p <= totalPages) setPage(p); };

  const pageNums = (() => {
    const w = 3;
    let s = Math.max(1, page - 1);
    let e = Math.min(totalPages, s + w - 1);
    if (e - s < w - 1) s = Math.max(1, e - w + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  })();

  return (
    <div className="w-full max-w-5xl xl:max-w-none space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Security Log</h1>
            <p className="text-sm text-slate-500 mt-0.5">{total} sign-in event{total !== 1 ? "s" : ""} on record</p>
          </div>
        </div>
        <button onClick={() => load(page, true)} disabled={refreshing}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all disabled:opacity-40">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
        <AlertCircle className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-300/80 leading-relaxed">
          If you notice unfamiliar sign-in activity, immediately change your password and revoke active sessions. Contact support if you suspect unauthorized access.
        </p>
      </div>

      {/* Events */}
      {loading ? <Skeleton /> : history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/20 py-20 flex flex-col items-center gap-3">
          <ShieldCheck className="h-10 w-10 text-slate-600" />
          <p className="text-slate-400 text-sm font-medium">No login history yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((ev, idx) => {
            const browser = getBrowser(ev.user_agent);
            const os      = getOS(ev.user_agent);
            const DevI    = DevIcon(ev.user_agent);
            const loc     = locationInfo(ev.ip_address, ev.location);
            const LocI    = loc.icon;
            const current = idx === 0 && page === 1;

            return (
              <div key={ev.id} className={cn(
                "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150",
                current
                  ? "bg-emerald-500/[0.04] border-emerald-500/15 hover:border-emerald-500/25"
                  : "bg-slate-900/30 border-slate-800/50 hover:bg-slate-900/60 hover:border-slate-700/60",
              )}>
                {/* Device icon */}
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  current ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800/60 text-slate-500 group-hover:text-slate-300",
                )}>
                  <DevI className="h-5 w-5" />
                </div>

                {/* Browser + OS */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{browser.name}</span>
                    {browser.v && <span className="text-[11px] text-slate-600 font-mono">{browser.v}</span>}
                    {current && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Current session
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{os}</p>
                </div>

                {/* Location */}
                <div className="hidden md:flex items-center gap-2 min-w-[180px]">
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", loc.bg)}>
                    <LocI className={cn("h-3.5 w-3.5", loc.color)} />
                  </div>
                  <span className={cn("text-xs font-medium truncate max-w-[140px]", loc.color)}>{loc.label}</span>
                </div>

                {/* IP */}
                <div className="hidden lg:block">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl font-mono text-[11px] bg-slate-900/60 border border-slate-800/50 text-slate-500">
                    {ev.ip_address.length > 15 ? ev.ip_address.slice(0,13)+"…" : ev.ip_address}
                  </span>
                </div>

                {/* Time */}
                <div className="text-right shrink-0 min-w-[90px]">
                  <p className="text-sm font-semibold text-slate-200">{relativeTime(ev.login_at)}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    {new Date(ev.login_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-600">
            {Math.min((page-1)*LIMIT+1, total)}–{Math.min(page*LIMIT, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            {[
              { icon: ChevronsLeft,  fn: () => go(1),          off: page === 1          },
              { icon: ChevronLeft,   fn: () => go(page-1),     off: page === 1          },
            ].map(({ icon:I, fn, off }, i) => (
              <button key={i} onClick={fn} disabled={off}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 disabled:opacity-25 transition-all">
                <I className="h-4 w-4" />
              </button>
            ))}
            {pageNums.map((p) => (
              <button key={p} onClick={() => go(p)}
                className={cn(
                  "h-8 w-8 rounded-lg text-xs font-semibold transition-all",
                  p === page ? "bg-violet-600 text-white shadow-[0_2px_8px_rgba(124,58,237,0.35)]" : "text-slate-500 hover:text-white hover:bg-slate-800/60",
                )}>{p}</button>
            ))}
            {[
              { icon: ChevronRight,  fn: () => go(page+1),     off: page === totalPages },
              { icon: ChevronsRight, fn: () => go(totalPages), off: page === totalPages },
            ].map(({ icon:I, fn, off }, i) => (
              <button key={i} onClick={fn} disabled={off}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 disabled:opacity-25 transition-all">
                <I className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}