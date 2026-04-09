"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package, FileText, Shield, Blocks, Settings, LayoutDashboard,
  LifeBuoy, Plus, ChevronRight, FileCode2, CreditCard,
  Zap, CheckCircle2, Clock,
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

  const hasActivePlan   = !isLoading && !!subscription && subscription.status === "active";
  const isExpiringSoon  = hasActivePlan && (subscription?.daysLeft ?? 99) <= 3;
  const planShortName   = subscription?.planName?.replace("Pentellia ", "") ?? "";

  return (
    <aside className={cn(
      "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-white/5 transition-all duration-300 ease-in-out",
      "bg-[#0B0C15]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[#0B0C15]/60",
      isSidebarOpen ? "w-64" : "w-[80px]",
    )}>
      <div className="flex h-full flex-col">

        {/* New Scan CTA */}
        <div className="p-4">
          <Link href="/dashboard/new-scan">
            <Button className={cn(
              "w-full bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all",
              isSidebarOpen ? "justify-start gap-2 px-4" : "justify-center px-0",
            )}>
              <Plus className="h-4 w-4 shrink-0" />
              {isSidebarOpen && <span>New Scan</span>}
            </Button>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  isActive
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5",
                  !isSidebarOpen && "justify-center px-0",
                )}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  {isSidebarOpen && <span>{item.label}</span>}
                  {isSidebarOpen && isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-violet-400" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Subscription widget */}
        {isSidebarOpen && (
          <div className="p-4 border-t border-white/5">
            {isLoading ? (
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ) : !hasActivePlan ? (
              /* No subscription — upgrade prompt */
              <Link href="/subscription">
                <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 cursor-pointer hover:bg-fuchsia-500/10 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3.5 w-3.5 text-fuchsia-400" />
                    <span className="text-xs font-bold text-fuchsia-300">No Active Plan</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">Subscribe to start scanning</p>
                  <div className="text-[10px] font-bold text-fuchsia-400 flex items-center gap-1">
                    View Plans <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            ) : (
              /* Active subscription */
              <Link href="/subscription">
                <div className={cn(
                  "rounded-xl border p-3 cursor-pointer transition-all",
                  isExpiringSoon
                    ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
                    : "border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10",
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {isExpiringSoon
                      ? <Clock className="h-3.5 w-3.5 text-amber-400" />
                      : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    }
                    <span className={cn(
                      "text-xs font-bold",
                      isExpiringSoon ? "text-amber-300" : "text-emerald-300",
                    )}>
                      {planShortName}
                    </span>
                  </div>
                  <p className={cn(
                    "text-[10px]",
                    isExpiringSoon ? "text-amber-400/70" : "text-slate-500",
                  )}>
                    {isExpiringSoon
                      ? `Expires in ${subscription?.daysLeft} day${subscription?.daysLeft !== 1 ? "s" : ""}`
                      : `${subscription?.daysLeft} days remaining`
                    }
                  </p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Support link */}
        <div className={cn("p-3 border-t border-white/5", !isSidebarOpen && "flex justify-center")}>
          <Link href="/dashboard/support">
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all cursor-pointer",
              !isSidebarOpen && "justify-center px-0",
            )}>
              <LifeBuoy className="h-4 w-4 shrink-0" />
              {isSidebarOpen && <span>Support</span>}
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}