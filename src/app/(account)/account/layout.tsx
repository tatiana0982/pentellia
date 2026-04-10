"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft, User, Key, Code2, Bell,
  Settings, ShieldAlert, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      <aside className="w-56 shrink-0 h-full flex flex-col bg-[#09090f] border-r border-white/[0.06]">

        {/* Back */}
        <div className="px-4 pt-5 pb-3 shrink-0">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
        </div>

        {/* Brand */}
        <div className="px-4 pb-4 shrink-0 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
              <Settings className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Account</p>
              <p className="text-[11px] text-slate-600">Preferences</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
          {NAV.map(group => (
            <div key={group.group}>
              {/* Group label — readable slate-400 */}
              <p className="px-2.5 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
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
                        "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150",
                        active
                          ? "bg-violet-500/10 text-white border border-violet-500/15"
                          : "text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/[0.04]",
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-violet-500" />
                      )}
                      <item.icon className={cn(
                        "h-[15px] w-[15px] shrink-0 transition-colors",
                        active ? "text-violet-400" : "text-slate-600 group-hover:text-slate-400",
                      )} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main content — full width ── */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-[#08080f]">
        <div className="w-full px-8 py-8 xl:px-12 2xl:px-16">
          {children}
        </div>
      </main>
    </div>
  );
}