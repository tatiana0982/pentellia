"use client";

// src/app/(account)/account/layout.tsx
// Phase 3: Domains nav item REMOVED from Security group.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User, ShieldAlert, Key, Bell, Globe2,
  CreditCard, Code2,
} from "lucide-react";

const NAV = [
  {
    group: "Profile",
    items: [
      { label: "Settings",       href: "/account/user-settings",  icon: User       },
      { label: "Notifications",  href: "/account/notifications",  icon: Bell       },
    ],
  },
  {
    group: "Security",
    items: [
      // Domains item REMOVED in Phase 3
      { label: "Password",       href: "/account/security",       icon: ShieldAlert },
      { label: "Login History",  href: "/account/login-history",  icon: Key        },
    ],
  },
  {
    group: "Developer",
    items: [
      { label: "API Keys",       href: "/account/api",            icon: Code2      },
    ],
  },
  {
    group: "Billing",
    items: [
      { label: "Subscription",   href: "/subscription",           icon: CreditCard },
    ],
  },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8 min-h-full">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <nav className="space-y-6 sticky top-0 pt-1">
          {NAV.map(group => (
            <div key={group.group}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 px-3">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          active
                            ? "bg-violet-500/15 text-violet-300 font-medium"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}