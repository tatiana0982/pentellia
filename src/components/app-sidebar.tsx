"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Package,
  FileText,
  Shield,
  FileSearch,
  Crosshair,
  Blocks,
  Settings,
  LayoutDashboard,
  LifeBuoy,
  Plus,
  ChevronRight,
  LogOut,
  Binary,
  FileCode2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/assets", icon: Package, label: "Assets" },
  { href: "/dashboard/scans", icon: Shield, label: "Scans" },
  // { href: "/dashboard/findings", icon: FileSearch, label: "Findings" },
  { href: "/dashboard/reports", icon: FileText, label: "Reports" },
  { href: "/dashboard/integrations", icon: Blocks, label: "Integrations" },
  { href: "/dashboard/c2", icon: FileCode2, label: "Arsenal" },
  { href: "/account/user-settings", icon: Settings, label: "Settings" },
];

export function AppSidebar({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  const pathname = usePathname();
  const [scanCount, setScanCount] = useState(0);

  // --- Fetch Scan Count ---
  useEffect(() => {
    const fetchScanData = async () => {
      try {
<<<<<<< HEAD
        const res = await fetch("/api/dashboard/scans?limit=100");
=======
        const res = await fetch("/api/dashboard/scanslimit=100");
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
        const data = await res.json();

        // Assuming data.scans is an array of scan objects
        if (data.success && Array.isArray(data.scans)) {
          setScanCount(data.scans.length);
        }
      } catch (error) {
        console.error("Failed to fetch scan count", error);
      }
    };

    fetchScanData();
  }, []);

  // Calculate Progress (Limit 100)
  const MAX_SCANS = 100;
  const progressValue = Math.min((scanCount / MAX_SCANS) * 100, 100);

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-white/5 transition-all duration-300 ease-in-out",
        // Glassmorphism background
        "bg-[#0B0C15]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[#0B0C15]/60",
        isSidebarOpen ? "w-64" : "w-[80px]"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Action Button */}
        <div className="p-4">
          <Button
            asChild
            className={cn(
              "group w-full border-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-[0_0_25px_rgba(124,58,237,0.5)]",
              !isSidebarOpen && "h-10 w-10 justify-center p-0"
            )}
          >
            <Link href="/dashboard/new-scan">
              <Plus
                className={cn(
                  "h-5 w-5 transition-transform group-hover:rotate-90",
                  isSidebarOpen && "mr-2"
                )}
              />
              {isSidebarOpen && <span className="font-semibold">New Scan</span>}
            </Link>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {navItems.map((item) => {
            // Strict active state check
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  !isSidebarOpen && "justify-center px-2",
                  // Hover effects
                  "hover:bg-white/5 hover:text-white",
                  // Active State styling (Gradient + Glow)
                  isActive
                    ? "bg-gradient-to-r from-violet-500/10 to-blue-500/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-white/5"
                    : "text-slate-400 border border-transparent"
                )}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]" />
                )}

                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive
                      ? "text-violet-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  )}
                />

                {isSidebarOpen && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}

                {/* Right chevron on hover (Desktop polish) */}
                {isSidebarOpen && !isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 -translate-x-2 text-slate-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Stats */}
        <div className="mt-auto border-t border-white/5 bg-[#0B0C15]/40 p-4">
          {isSidebarOpen ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent p-3">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-400">Scans Used</span>
                  <span className="font-mono text-violet-400">
                    {scanCount}/{MAX_SCANS}
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  className="h-1.5 bg-slate-800"
                  indicatorClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />
              </div>

              <Link href={"/dashboard/support"} className="flex gap-2">
                <Button
                  variant="ghost"
                  className="h-9 flex-1 justify-start text-xs text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <LifeBuoy className="mr-2 h-4 w-4" /> Support
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_#8b5cf6]" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-white"
              >
                <LifeBuoy className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
