"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package, FileText, Shield, Blocks, Settings, LayoutDashboard,
  LifeBuoy, Plus, ChevronRight, FileCode2, Wallet, Zap,
  AlertTriangle, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/providers/WalletProvider";

const navItems = [
  { href: "/dashboard",               icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/assets",        icon: Package,         label: "Assets" },
  { href: "/dashboard/scans",         icon: Shield,          label: "Scans" },
  { href: "/dashboard/reports",       icon: FileText,        label: "Reports" },
  { href: "/dashboard/integrations",  icon: Blocks,          label: "Integrations" },
  { href: "/dashboard/c2",            icon: FileCode2,       label: "Arsenal" },
  { href: "/account/user-settings",   icon: Settings,        label: "Settings" },
];

export function AppSidebar({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  const pathname = usePathname();
  const { balance, totalScans, isLoading } = useWallet();

  // Determine wallet state
  const isNewUser     = !isLoading && balance === 0 && totalScans === 0;
  const isEmpty       = !isLoading && balance === 0 && totalScans > 0;
  const isLow         = !isLoading && balance > 0 && balance < 20;
  const isHealthy     = !isLoading && balance >= 20;

  const MAX_REF    = 2499;
  const walletPct  = Math.min(Math.round((balance / MAX_REF) * 100), 100);

  const ringColor =
    isNewUser || isEmpty ? "#ef4444"
    : isLow              ? "#f59e0b"
    : balance < 50       ? "#a78bfa"
                         : "#10b981";

  const statusLabel =
    isNewUser   ? { text: "Add Credits",   color: "text-fuchsia-400" }
    : isEmpty   ? { text: "Wallet empty",  color: "text-red-400" }
    : isLow     ? { text: "Low balance",   color: "text-amber-400" }
    : balance < 50 ? { text: "Credits active", color: "text-violet-400" }
    : { text: "Credits healthy", color: "text-emerald-400" };

  return (
    <aside className={cn(
      "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-white/5 transition-all duration-300 ease-in-out",
      "bg-[#0B0C15]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[#0B0C15]/60",
      isSidebarOpen ? "w-64" : "w-[80px]",
    )}>
      <div className="flex h-full flex-col">

        {/* ── New Scan CTA ──────────────────────────────────────── */}
        <div className="p-4">
          <Button asChild className={cn(
            "group w-full border-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all hover:from-violet-500 hover:to-indigo-500",
            !isSidebarOpen && "h-10 w-10 justify-center p-0",
          )}>
            <Link href="/dashboard/new-scan">
              <Plus className={cn("h-5 w-5 transition-transform group-hover:rotate-90", isSidebarOpen && "mr-2")} />
              {isSidebarOpen && <span className="font-semibold">New Scan</span>}
            </Link>
          </Button>
        </div>

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "group relative flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  !isSidebarOpen && "justify-center px-2",
                  "hover:bg-white/5 hover:text-white",
                  isActive
                    ? "bg-gradient-to-r from-violet-500/10 to-blue-500/10 text-white border border-white/5"
                    : "text-slate-400 border border-transparent",
                )}>
                {isActive && <div className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]" />}
                <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300")} />
                {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                {isSidebarOpen && !isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 -translate-x-2 text-slate-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer — Wallet or Upgrade ─────────────────────────── */}
        <div className="mt-auto border-t border-white/5 bg-[#0B0C15]/40 p-4">
          {isSidebarOpen ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* ── NEW USER: Show prominent Upgrade button ── */}
              {isNewUser ? (
                <Link href="/subscription">
                  <div className="relative rounded-xl border border-fuchsia-500/30 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 p-4 overflow-hidden cursor-pointer hover:border-fuchsia-500/50 transition-all group">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" /> Get Started
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-fuchsia-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Add credits to unlock scanning & AI features
                      </p>
                      <div className="mt-3 w-full py-2 rounded-lg bg-fuchsia-600 text-white text-xs font-bold text-center shadow-[0_0_12px_rgba(217,70,239,0.3)]">
                        ⚡ Upgrade Now
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                /* ── EXISTING USER: Show wallet health widget ── */
                <Link href="/subscription">
                  <div className="rounded-xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-3 hover:border-white/15 transition-colors cursor-pointer space-y-2.5 group">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-slate-400">
                        <Wallet className="h-3.5 w-3.5" /> Wallet
                      </span>
                      <span className={cn("text-[11px] font-semibold", statusLabel.color)}>
                        {isLoading ? "…" : statusLabel.text}
                      </span>
                    </div>

                    {/* Balance display */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-white">
                        {isLoading ? "—" : `₹${balance.toFixed(2)}`}
                      </span>
                      {(isEmpty || isLow) && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse ml-1" />
                      )}
                    </div>

                    {/* Segmented bar */}
                    <div className="flex items-center gap-0.5 h-1.5 w-full rounded-full overflow-hidden bg-white/8">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i}
                          className="flex-1 h-full rounded-[1px] transition-all duration-700"
                          style={{
                            background: (i / 20) * 100 < walletPct ? ringColor : "rgba(255,255,255,0.06)",
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-600">{totalScans.toLocaleString()} scans run</span>
                      {(isEmpty || isLow) ? (
                        <span className="text-fuchsia-400 font-semibold group-hover:underline">Top up →</span>
                      ) : (
                        <span className="text-slate-500">{walletPct}% capacity</span>
                      )}
                    </div>
                  </div>
                </Link>
              )}

              <Link href="/dashboard/support" className="flex">
                <Button variant="ghost" className="h-9 flex-1 justify-start text-xs text-slate-400 hover:bg-white/5 hover:text-white">
                  <LifeBuoy className="mr-2 h-4 w-4" /> Support
                </Button>
              </Link>
            </div>
          ) : (
            /* ── Collapsed sidebar ── */
            <div className="flex flex-col items-center gap-3">
              <Link href="/subscription">
                {isNewUser ? (
                  /* New user: animated upgrade button */
                  <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(217,70,239,0.4)] animate-pulse">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  /* Existing user: wallet ring */
                  <div
                    className="h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={{ borderColor: ringColor, boxShadow: `0 0 8px ${ringColor}40` }}
                  >
                    <Wallet className="h-3.5 w-3.5" style={{ color: ringColor }} />
                  </div>
                )}
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" asChild>
                <Link href="/dashboard/support"><LifeBuoy className="h-5 w-5" /></Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}