
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Package,
  FileText,
  ShieldCheck,
  FileSearch,
  Crosshair,
  Server,
  Users,
  Blocks,
  Settings,
  LayoutDashboard,
  Zap,
  ChevronDown,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/assets", icon: Package, label: "Assets" },
  { href: "/scans", icon: ShieldCheck, label: "Scans" },
  { href: "/findings", icon: FileSearch, label: "Findings" },
  { href: "/attack-surface", icon: Crosshair, label: "Attack Surface" },
  { href: "/handlers", icon: Server, label: "Handlers" },
];

const configItems = [
    { href: "/reports", icon: FileText, label: "Reports" },
    { href: "/robots", icon: Bot, label: "Robots" },
    { href: "/team", icon: Users, label: "Team" },
    { href: "/integrations", icon: Blocks, label: "Integrations" },
    { href: "/settings", icon: Settings, label: "Settings" },
]

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden h-full w-64 flex-col border-r border-gray-200 bg-gray-800 text-white md:flex">
      <div className="flex flex-col gap-y-6 p-4">
        <Button variant="warning" className="w-full justify-start">
            <Zap className="mr-2 h-4 w-4" />
            New scan
        </Button>
        <div>
            <span className="text-xs font-semibold uppercase text-gray-400">Workspaces</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="mt-2 w-full justify-between text-white hover:bg-gray-700 hover:text-white">
                        My Workspace
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuItem>Workspace 1</DropdownMenuItem>
                    <DropdownMenuItem>Workspace 2</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <nav className="flex-1 space-y-2 px-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white",
              { "bg-gray-900 text-white": pathname.startsWith(item.href) }
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-4 py-6">
        <span className="text-xs font-semibold uppercase text-gray-400">Configurations</span>
        <nav className="mt-2 space-y-2">
            {configItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white",
                  { "bg-gray-900 text-white": pathname.startsWith(item.href) }
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>
      </div>
    </aside>
  );
}
