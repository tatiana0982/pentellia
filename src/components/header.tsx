"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useWallet } from "@/providers/WalletProvider";
import { useDomainGate } from "@/context/DomainVerificationContext";
import {
  Menu, Bell, LogOut, User, KeyRound, X, Check, Info,
  AlertTriangle, ShieldCheck, ShieldAlert, Wallet, ArrowRight, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface HeaderProps { toggleSidebar: () => void; isSidebarOpen: boolean; }

interface Notification {
  id: string; title: string; message: string;
  type: "info" | "success" | "error" | "warning";
  is_read: boolean; created_at: string;
}

const NOTI: Record<string, { icon: React.ElementType; dotColor: string; bgColor: string }> = {
  success: { icon: Check,         dotColor: "bg-emerald-500", bgColor: "bg-emerald-500/10" },
  error:   { icon: X,             dotColor: "bg-red-500",     bgColor: "bg-red-500/10"     },
  warning: { icon: AlertTriangle, dotColor: "bg-amber-500",   bgColor: "bg-amber-500/10"   },
  info:    { icon: Info,          dotColor: "bg-blue-400",    bgColor: "bg-blue-500/10"    },
};

export function Header({ toggleSidebar }: HeaderProps) {
  const { user }    = useAuth();
  const router      = useRouter();
  const { balance, isLoading: wLoading } = useWallet();
  const { hasVerifiedDomain, isLoading: dLoading } = useDomainGate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  // Profile completion
  const pct = useMemo(() => {
    if (!user) return 0;
    const checks = [!!user.firstName, !!user.lastName, !!user.email, !!user.company, !!user.role, !!user.country, !!user.timezone, hasVerifiedDomain];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [user, hasVerifiedDomain]);

  // Fetch notifications — uses is_read from API
  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/dashboard/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications ?? []);
        // Use the server-calculated unreadCount
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : data.notifications.filter((n: Notification) => !n.is_read).length);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    const onFocus  = () => fetchNotifications();
    const onRefresh = () => fetchNotifications();
    window.addEventListener("focus", onFocus);
    window.addEventListener("refresh-notifications", onRefresh);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); window.removeEventListener("refresh-notifications", onRefresh); };
  }, [fetchNotifications]);

  const markRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((p) => Math.max(0, p - 1));
    await fetch("/api/dashboard/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await fetch("/api/dashboard/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  };

  const firstName = user?.firstName || "User";
  const lastName  = user?.lastName  || "";
  const avatarUrl = user?.avatar    || "/api/users/avatar";
  const initials  = ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "U";

  const walletStatus = wLoading ? "loading" : balance === 0 ? "empty" : balance < 5 ? "low" : "ok";

  return (
    <TooltipProvider delayDuration={250}>
      <header className="fixed left-0 right-0 top-0 z-50 h-16 flex items-center justify-between px-4 lg:px-5 border-b border-slate-800/60 bg-[#09090f]/95 backdrop-blur-xl">

        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-100 hover:bg-slate-800/60 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard">
            <img src="/logo.png" alt="Pentellia" className="h-7 w-auto object-contain" />
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">

          {/* Wallet */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/subscription">
                <button className={cn(
                  "relative h-9 w-9 flex items-center justify-center rounded-lg transition-all",
                  walletStatus === "empty" ? "text-red-400 hover:bg-red-500/10"
                  : walletStatus === "low"  ? "text-amber-400 hover:bg-amber-500/10"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60",
                )}>
                  <Wallet className="h-5 w-5" />
                  {(walletStatus === "empty" || walletStatus === "low") && (
                    <span className={cn(
                      "absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full",
                      walletStatus === "empty" ? "bg-red-500 animate-pulse" : "bg-amber-500",
                    )} />
                  )}
                </button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#0d0e1a] border-slate-800 text-xs py-2 px-3 space-y-0.5">
              {walletStatus === "empty" ? <><p className="text-red-400 font-semibold">Wallet empty</p><p className="text-slate-500">Top up to continue scanning</p></> :
               walletStatus === "low"   ? <><p className="text-amber-400 font-semibold">Balance — ₹{balance.toFixed(2)}</p><p className="text-slate-500">Consider topping up</p></> :
                                          <p className="text-slate-300 font-medium">Wallet active</p>}
            </TooltipContent>
          </Tooltip>

          {/* Domain shield */}
          {!dLoading && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/account/domains">
                  <button className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-lg transition-all",
                    hasVerifiedDomain ? "text-emerald-400 hover:bg-emerald-500/10" : "text-amber-400 hover:bg-amber-500/10",
                  )}>
                    {hasVerifiedDomain ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5 animate-pulse" />}
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#0d0e1a] border-slate-800 text-xs py-2 px-3">
                {hasVerifiedDomain ? <p className="text-emerald-400 font-medium">Domain verified</p> :
                  <><p className="text-amber-400 font-semibold">No verified domain</p><p className="text-slate-400">Required to run scans</p></>}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white ring-[1.5px] ring-[#09090f]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[360px] p-0 bg-[#0d0e1a] border-slate-800/70 shadow-2xl shadow-black/70">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold">{unreadCount}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">Mark all read</button>
                  )}
                  <Link href="/account/notifications">
                    <button className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                      All <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* List */}
              <ScrollArea className="max-h-[320px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center py-10 px-4 text-center">
                    <div className="h-10 w-10 rounded-xl bg-slate-800/60 flex items-center justify-center mb-3">
                      <Bell className="h-5 w-5 text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">All clear</p>
                    <p className="text-xs text-slate-600 mt-0.5">No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/50">
                    {notifications.slice(0, 8).map((n) => {
                      const style = NOTI[n.type] ?? NOTI.info;
                      const Icon  = style.icon;
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            "group relative flex gap-3 px-4 py-3.5 hover:bg-white/[0.025] transition-colors",
                            n.is_read && "opacity-50",
                          )}
                        >
                          <div className={cn("mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0", style.bgColor)}>
                            <Icon className="h-3.5 w-3.5 text-current" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5 pr-4">
                            <p className="text-[13px] font-semibold text-slate-100 leading-snug">{n.title}</p>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-slate-600">
                              {new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                            </p>
                          </div>
                          {!n.is_read && (
                            <>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-violet-500 group-hover:opacity-0 transition-opacity" />
                              <button
                                onClick={(e) => markRead(n.id, e)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-800/60">
                  <Link href="/account/notifications">
                    <button className="w-full text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5 py-1 transition-colors">
                      View all notifications <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-slate-800 mx-1" />

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-800/50 transition-all group">
                <div className="relative flex items-center justify-center h-8 w-8">
                  <svg className="h-full w-full -rotate-90 absolute" viewBox="0 0 36 36">
                    <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <path
                      className={pct === 100 ? "text-emerald-500" : "text-violet-600"}
                      strokeDasharray={`${pct}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    />
                  </svg>
                  <Avatar className="h-6 w-6 border border-slate-700">
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-violet-900/60 text-[10px] font-bold text-violet-200">{initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-semibold text-slate-200 leading-none">{firstName}</p>
                  {pct < 100 && <p className="text-[10px] text-slate-600 mt-0.5">{pct}% profile</p>}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 hidden sm:block transition-colors" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-[#0d0e1a] border-slate-800/70 shadow-2xl shadow-black/70 p-1.5">
              <div className="px-3 py-2.5 mb-1">
                <p className="text-sm font-semibold text-white truncate">{firstName} {lastName}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-slate-800/60" />
              <Link href="/account/user-settings">
                <DropdownMenuItem className="cursor-pointer focus:bg-slate-800/60 rounded-lg py-2.5 gap-2.5 mt-0.5">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-300">Profile Settings</span>
                  {pct < 100 && <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">{pct}%</span>}
                </DropdownMenuItem>
              </Link>
              <Link href="/account/domains">
                <DropdownMenuItem className="cursor-pointer focus:bg-slate-800/60 rounded-lg py-2.5 gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-300">Domains</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/account/api">
                <DropdownMenuItem className="cursor-pointer focus:bg-slate-800/60 rounded-lg py-2.5 gap-2.5">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-300">API Keys</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-slate-800/60 my-1" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300 rounded-lg py-2.5 gap-2.5">
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}