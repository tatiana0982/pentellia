"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft, User, Key, Code2, Bell,
  Settings, ShieldAlert, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Phase 3: Domains item removed. Structure preserved from original.
const NAV = [
  {
    group: "User Settings",
    items: [{ label: "Overview", href: "/account/user-settings", icon: User }],
  },
  {
    group: "Security",
    items: [
      { label: "Password",      href: "/account/security",      icon: ShieldAlert },
      { label: "Login History", href: "/account/login-history", icon: Key         },
    ],
  },
  {
    group: "Activity",
    items: [{ label: "Notifications", href: "/account/notifications", icon: Bell }],
  },
  {
    group: "API",
    items: [{ label: "REST API", href: "/account/api", icon: Code2 }],
  },
  {
    group: "Billing",
    items: [{ label: "Subscription", href: "/subscription", icon: CreditCard }],
  },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full bg-[#08080f] overflow-hidden font-sans">

      {/* ── Left sidebar ── */}
      <aside className="w-64 shrink-0 h-full flex flex-col bg-[#0a0a13] border-r border-slate-800/50">

        {/* Back to dashboard */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="px-5 pb-5 shrink-0 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/15 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Settings className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Account</p>
              <p className="text-[11px] text-slate-600">Preferences</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV.map(group => (
            <div key={group.group}>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-violet-500/10 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50",
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-violet-400" : "text-slate-600 group-hover:text-slate-300",
                      )} />
                      <span className="truncate flex-1">{item.label}</span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_#8b5cf6] shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-[#08080f]">
        <div className="h-full px-8 py-8 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}