"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useWallet } from "@/providers/WalletProvider";
import {
  Menu, Bell, LogOut, User, KeyRound, X, Check, Info,
  AlertTriangle, ShieldCheck, ArrowRight, ChevronDown,
  CreditCard, Zap, Clock,
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
  success: { icon: Check,         dotColor: "bg-violet-500", bgColor: "bg-violet-500/10" },
  error:   { icon: X,             dotColor: "bg-red-500",    bgColor: "bg-red-500/10"    },
  warning: { icon: AlertTriangle, dotColor: "bg-amber-500",  bgColor: "bg-amber-500/10"  },
  info:    { icon: Info,          dotColor: "bg-blue-400",   bgColor: "bg-blue-500/10"   },
};

export function Header({ toggleSidebar }: HeaderProps) {
  const { user } = useAuth();
  const router   = useRouter();
  const { subscription, isLoading: wLoading } = useWallet();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [mounted,       setMounted]       = useState(false);
  useEffect(() => setMounted(true), []);

  const hasActivePlan  = !wLoading && !!subscription && subscription.status === "active";
  const daysLeft       = subscription?.daysLeft ?? 0;
  const isExpiringSoon = hasActivePlan && daysLeft <= 3;

  // Profile completion (no emerald — violet at 100%)
  const pct = useMemo(() => {
    if (!user) return 0;
    const checks = [!!user.firstName, !!user.lastName, !!user.email, !!user.company, !!user.role, !!user.country, !!user.timezone];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/dashboard/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : (data.notifications ?? []).filter((n: Notification) => !n.is_read).length,
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id      = setInterval(fetchNotifications, 30_000);
    const onFocus = () => fetchNotifications();
    const onRefresh = () => fetchNotifications();
    window.addEventListener("focus",                 onFocus);
    window.addEventListener("refresh-notifications", onRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus",                 onFocus);
      window.removeEventListener("refresh-notifications", onRefresh);
    };
  }, [fetchNotifications]);

  const markRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(p => Math.max(0, p - 1));
    await fetch("/api/dashboard/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications(p => p.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await fetch("/api/dashboard/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const firstName  = user?.firstName || "User";
  const lastName   = user?.lastName  || "";
  const avatarUrl  = user?.avatar    || "/api/users/avatar";
  const initials   = ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "U";

  // Only unread shown in dropdown
  const dropdownNotifications = notifications.filter(n => !n.is_read).slice(0, 6);

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
            <img src="/logo.png" alt="Pentellia" className="w-[140px] object-contain" />
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">

          {/* Subscription status pill */}
          {!wLoading && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/subscription">
                  <button className={cn(
                    "flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all",
                    !hasActivePlan
                      ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white shadow-[0_2px_12px_rgba(124,58,237,0.3)]"
                      : isExpiringSoon
                      ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20"
                      : "bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20",
                  )}>
                    {!hasActivePlan ? (
                      <><Zap className="h-3.5 w-3.5" /><span className="hidden sm:inline">Subscribe</span></>
                    ) : isExpiringSoon ? (
                      <><Clock className="h-3.5 w-3.5" /><span className="hidden sm:inline">{daysLeft}d left</span></>
                    ) : (
                      <><ShieldCheck className="h-3.5 w-3.5" /><span className="hidden sm:inline">{subscription?.planName?.replace("Pentellia ", "") ?? "Elite"}</span></>
                    )}
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#0d0e1a] border-slate-800 text-xs py-2 px-3">
                {!hasActivePlan ? (
                  <><p className="font-semibold text-fuchsia-400">No active subscription</p><p className="text-slate-500 mt-0.5">Subscribe to start scanning</p></>
                ) : isExpiringSoon ? (
                  <><p className="font-semibold text-amber-400">Plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</p><p className="text-slate-500 mt-0.5">Click to renew</p></>
                ) : (
                  <><p className="font-semibold text-violet-300">{subscription?.planName}</p><p className="text-slate-500 mt-0.5">{daysLeft} days remaining</p></>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Notifications — ONLY unread shown in dropdown */}
          {mounted && (
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
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                        Mark all read
                      </button>
                    )}
                    <Link href="/account/notifications">
                      <button className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                        All <ArrowRight className="h-3 w-3" />
                      </button>
                    </Link>
                  </div>
                </div>

                <ScrollArea className="max-h-[300px] overflow-hidden">
                  {dropdownNotifications.length === 0 ? (
                    <div className="flex flex-col items-center py-8 px-4 text-center">
                      <div className="h-9 w-9 rounded-lg bg-slate-800/60 flex items-center justify-center mb-2.5">
                        <Bell className="h-4 w-4 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">All caught up</p>
                      <p className="text-xs text-slate-600 mt-0.5">No unread notifications</p>
                      <Link href="/account/notifications">
                        <button className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                          View notification history →
                        </button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/50">
                      {dropdownNotifications.map(n => {
                        const style = NOTI[n.type] ?? NOTI.info;
                        const Icon  = style.icon;
                        return (
                          <div
                            key={n.id}
                            className="group relative flex gap-3 px-4 py-3.5 hover:bg-white/[0.025] transition-colors"
                          >
                            <div className={cn("mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0 border border-white/5", style.bgColor)}>
                              <Icon className="h-3.5 w-3.5 text-current" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5 pr-6">
                              <p className="text-[13px] font-semibold text-slate-100 leading-snug">{n.title}</p>
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-slate-600">
                                {new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                              </p>
                            </div>
                            {/* Unread dot / dismiss */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-violet-500 group-hover:opacity-0 transition-opacity" />
                            <button
                              onClick={e => markRead(n.id, e)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="px-4 py-2.5 border-t border-slate-800/60">
                  <Link href="/account/notifications">
                    <button className="w-full text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5 py-1 transition-colors">
                      View all notifications <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="h-5 w-px bg-slate-800 mx-1" />

          {/* Profile dropdown — no green ring, clean violet */}
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-800/50 transition-all group">
                  <div className="relative flex items-center justify-center h-8 w-8">
                    {/* Subtle violet progress ring */}
                    <svg className="h-full w-full -rotate-90 absolute" viewBox="0 0 36 36">
                      <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                      <path
                        className="text-violet-500"
                        strokeDasharray={`${pct}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      />
                    </svg>
                    <Avatar className="h-6 w-6">
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
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800/60 rounded-md py-2.5 gap-2.5 mt-0.5">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-300">Profile Settings</span>
                    {pct < 100 && (
                      <span className="ml-auto text-[10px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">{pct}%</span>
                    )}
                  </DropdownMenuItem>
                </Link>
                <Link href="/account/api">
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800/60 rounded-md py-2.5 gap-2.5">
                    <KeyRound className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-300">API Keys</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/subscription">
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800/60 rounded-md py-2.5 gap-2.5">
                    <CreditCard className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-300">Subscription</span>
                    {!hasActivePlan && (
                      <span className="ml-auto text-[10px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">Subscribe</span>
                    )}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-slate-800/60 my-1" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300 rounded-md py-2.5 gap-2.5"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}