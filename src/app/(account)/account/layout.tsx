"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  CreditCard,
  FileText,
  History,
  ShieldCheck,
  Key,
  Code2,
  Settings,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

// Define the sidebar structure
const sidebarItems = [
  {
    title: "User settings",
    items: [{ label: "Overview", href: "/account/user-settings", icon: User }],
  },
  {
    title: "Security",
    items: [
      { label: "Login history", href: "/account/login-history", icon: Key },
    ],
  },
  {
    title: "API",
    items: [{ label: "REST API", href: "/account/api", icon: Code2 }],
  },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row  gap-6 p-6 md:p-8 font-sans text-slate-200">
      {/* --- Settings Sidebar --- */}
      <aside className="w-full md:w-64 flex-none fixed flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* 'Back to Product' Header Link */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Settings Title */}
        <div className="flex items-center gap-2 px-2 pt-2 border-t border-white/5">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <Settings className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Account</h2>
            <p className="text-xs text-slate-500">Manage your preferences</p>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-6">
          {sidebarItems.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-violet-600/10 text-violet-300 border border-violet-500/20"
                          : "text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-violet-400" : "text-slate-500",
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 ml-64  overflow-y-auto custom-scrollbar rounded-2xl">
        {children}
      </main>
    </div>
  );
}
