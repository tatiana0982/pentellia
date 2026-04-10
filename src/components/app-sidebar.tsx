"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package, FileText, Shield, Blocks, Settings, LayoutDashboard,
  LifeBuoy, Plus, ChevronRight, FileCode2, Zap, ArrowUpRight,
  CreditCard, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/providers/WalletProvider";

const navItems = [
  { href: "/dashboard",              icon: LayoutDashboard, label: "Dashboard"    },
  { href: "/dashboard/assets",       icon: Package,         label: "Assets"       },
  { href: "/dashboard/scans",        icon: Shield,          label: "Scans"        },
  { href: "/dashboard/reports",      icon: FileText,        label: "Reports"      },
  { href: "/dashboard/integrations", icon: Blocks,          label: "Integrations" },
  { href: "/dashboard/c2",           icon: FileCode2,       label: "Arsenal"      },
  { href: "/account/user-settings",  icon: Settings,        label: "Settings"     },
];

export function AppSidebar({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  const pathname = usePathname();
  const { subscription, isLoading } = useWallet();

  const hasActivePlan = !isLoading && !!subscription && subscription.status === "active";
  const daysLeft      = subscription?.daysLeft ?? 0;
  const isExpiring    = hasActivePlan && daysLeft <= 3;
  const planShortName = subscription?.planName?.replace("Pentellia ", "") ?? "";

  // Purple-only palette — no green
  const barColor = !hasActivePlan ? "#ef4444"
    : isExpiring ? "#f59e0b"
    : "#8b5cf6";

  return (
    <aside className={cn(
      "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-white/5 transition-all duration-300 ease-in-out",
      "bg-[#0B0C15]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[#0B0C15]/60",
      isSidebarOpen ? "w-64" : "w-[80px]",
    )}>
      <div className="flex h-full flex-col">

        {/* ── New Scan CTA ── */}
        <div className="p-4">
          <Link
            href="/dashboard/new-scan"
            className={cn(
              "group flex items-center justify-center w-full rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_2px_12px_rgba(124,58,237,0.25)] transition-all hover:from-violet-500 hover:to-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              isSidebarOpen ? "h-10 px-4" : "h-10 w-10 p-0",
            )}
          >
            <Plus className={cn("pointer-events-none h-5 w-5 transition-transform group-hover:rotate-90", isSidebarOpen && "mr-2")} />
            {isSidebarOpen && <span className="pointer-events-none font-semibold">New Scan</span>}
          </Link>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {navItems.map(item => {
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  !isSidebarOpen && "justify-center px-2",
                  isActive
                    ? "bg-violet-500/10 text-white border border-violet-500/20"
                    : "text-slate-400 border border-transparent hover:bg-white/[0.04] hover:text-slate-200",
                )}
              >
                {isActive && (
                  <div className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-violet-500" />
                )}
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300",
                )} />
                {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                {isSidebarOpen && !isActive && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 -translate-x-1 text-slate-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer — Subscription widget ── */}
        <div className="mt-auto border-t border-white/[0.06] bg-[#0B0C15]/40 p-4">
          {isSidebarOpen ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {!hasActivePlan ? (
                <Link href="/subscription">
                  <div className="relative rounded-lg border border-violet-500/25 bg-gradient-to-br from-violet-600/15 to-indigo-600/8 p-3.5 cursor-pointer hover:border-violet-500/40 transition-all group overflow-hidden">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Get Started
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                      Subscribe to unlock scanning tools
                    </p>
                    <div className="w-full py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold text-center transition-colors">
                      View Plans
                    </div>
                  </div>
                </Link>
              ) : (
                <Link href="/subscription">
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 hover:bg-white/[0.05] transition-colors cursor-pointer space-y-2 group">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <CreditCard className="h-3 w-3" /> Plan
                      </span>
                      <span className={cn(
                        "text-[11px] font-semibold",
                        isExpiring ? "text-amber-400" : "text-violet-400",
                      )}>
                        {isLoading ? "…" : isExpiring ? "Expiring" : "Active"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{planShortName}</span>
                      {isExpiring && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />}
                    </div>

                    <div className="h-[2px] w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, Math.round((daysLeft / 30) * 100))}%`,
                          background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-600">{daysLeft} days left</span>
                      {isExpiring ? (
                        <span className="text-violet-400 font-medium group-hover:underline">Renew →</span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-slate-600">
                          <CheckCircle2 className="h-3 w-3 text-violet-500" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )}

              <Link href="/dashboard/support" className="flex">
                <Button variant="ghost" className="h-8 flex-1 justify-start text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300">
                  <LifeBuoy className="mr-2 h-3.5 w-3.5" /> Support
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Link href="/subscription">
                {!hasActivePlan ? (
                  <div className="h-9 w-9 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center hover:bg-violet-600/30 transition-colors">
                    <Zap className="h-4 w-4 text-violet-400" />
                  </div>
                ) : (
                  <div
                    className="h-8 w-8 rounded-md border flex items-center justify-center transition-colors hover:bg-white/5"
                    style={{ borderColor: `${barColor}40` }}
                  >
                    <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                )}
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" asChild>
                <Link href="/dashboard/support"><LifeBuoy className="h-4 w-4" /></Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}