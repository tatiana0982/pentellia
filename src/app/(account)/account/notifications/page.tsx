"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, X,
  RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Noti {
  id: string; title: string; message: string;
  type: "info"|"success"|"error"|"warning"; is_read: boolean; created_at: string;
}

const LIMIT = 8;

const STYLE: Record<string, { Icon: any; text: string; bg: string; label: string }> = {
  success: { Icon: Check,         text: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", label: "Success" },
  error:   { Icon: X,             text: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",       label: "Alert"   },
  warning: { Icon: AlertTriangle, text: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   label: "Warning" },
  info:    { Icon: Info,          text: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",      label: "Info"    },
};

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn("h-[72px] rounded-lg bg-white/[0.03] animate-pulse", i % 2 && "opacity-60")} />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const [items,      setItems]      = useState<Noti[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [filter,     setFilter]     = useState<"all"|"unread">("all");

  const load = useCallback(async (p: number, silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res  = await fetch(`/api/dashboard/notifications?page=${p}&limit=${LIMIT}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.notifications ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      }
    } catch { toast.error("Failed to load"); }
    finally  { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const markRead = async (id: string) => {
    setItems(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
    await fetch("/api/dashboard/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    setItems(p => p.map(n => ({ ...n, is_read: true })));
    await fetch("/api/dashboard/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }),
    }).catch(() => {});
    toast.success("All marked as read");
  };

  const remove = async (id: string) => {
    setItems(p => p.filter(n => n.id !== id));
    setTotal(p => Math.max(0, p - 1));
    await fetch("/api/dashboard/notifications", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const unread = items.filter(n => !n.is_read).length;
  const shown  = filter === "unread" ? items.filter(n => !n.is_read) : items;

  const go = (p: number) => { if (p >= 1 && p <= totalPages) setPage(p); };
  const pageNums = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + i;
  }).filter(p => p >= 1 && p <= totalPages);

  return (
    <div className="w-full space-y-5 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
            <Bell className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Notifications</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {total} total · {unread} unread
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-violet-400 border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 rounded-md transition-all"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
          <button
            onClick={() => load(page, true)}
            disabled={refreshing}
            className="h-8 w-8 flex items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-md p-1 w-fit">
        {(["all", "unread"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-7 px-3 rounded text-xs font-medium transition-all capitalize",
              filter === f
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white",
            )}
          >
            {f}
            {f === "unread" && unread > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-bold">{unread}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <Skeleton /> : shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/[0.07] bg-white/[0.02] py-20 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Bell className="h-6 w-6 text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-slate-600 text-xs">Platform events appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((n) => {
            const s = STYLE[n.type] ?? STYLE.info;
            return (
              <div
                key={n.id}
                className={cn(
                  "group relative flex items-start gap-3.5 p-4 rounded-lg border transition-all duration-150",
                  n.is_read
                    ? "bg-white/[0.02] border-white/[0.05] opacity-55 hover:opacity-80"
                    : "bg-[#0d0e1a] border-white/[0.07] hover:border-white/[0.12]",
                )}
              >
                <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0 border mt-0.5", s.bg)}>
                  <s.Icon className={cn("h-3.5 w-3.5", s.text)} />
                </div>
                <div className="flex-1 min-w-0 space-y-1 pr-14">
                  <div className="flex items-start gap-2">
                    <p className={cn("text-sm font-semibold leading-snug flex-1", n.is_read ? "text-slate-400" : "text-white")}>
                      {n.title}
                    </p>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0", s.text, s.bg)}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-slate-600">
                    {new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>

                {/* Actions */}
                <div className="absolute right-3 top-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all" title="Mark read">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {!n.is_read && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-violet-500 group-hover:opacity-0 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filter === "all" && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-600">
            {Math.min((page-1)*LIMIT+1, total)}–{Math.min(page*LIMIT, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            {[
              { icon: ChevronsLeft,  action: () => go(1),        disabled: page === 1 },
              { icon: ChevronLeft,   action: () => go(page - 1), disabled: page === 1 },
            ].map(({ icon: Icon, action, disabled }, i) => (
              <button key={i} onClick={action} disabled={disabled}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-25 transition-all">
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
            {pageNums.map((p) => (
              <button key={p} onClick={() => go(p)}
                className={cn(
                  "h-7 w-7 rounded-md text-xs font-medium transition-all",
                  p === page ? "bg-violet-600 text-white" : "text-slate-500 hover:text-white hover:bg-white/5",
                )}>{p}</button>
            ))}
            {[
              { icon: ChevronRight,  action: () => go(page + 1),    disabled: page === totalPages },
              { icon: ChevronsRight, action: () => go(totalPages),  disabled: page === totalPages },
            ].map(({ icon: Icon, action, disabled }, i) => (
              <button key={i} onClick={action} disabled={disabled}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-25 transition-all">
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}