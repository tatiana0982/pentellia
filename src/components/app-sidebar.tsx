
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  FileText,
  ShieldCheck,
  FileSearch,
  Crosshair,
  Users,
  Blocks,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/assets', icon: Package, label: 'Assets' },
  { href: '/scans', icon: ShieldCheck, label: 'Scans' },
  { href: '/findings', icon: FileSearch, label: 'Findings' },
  { href: '/attack-surface', icon: Crosshair, label: 'Attack Surface' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/integrations', icon: Blocks, label: 'Integrations' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed top-16 z-30 h-[calc(100vh-4rem)] bg-card text-foreground border-r border-border transition-all duration-300',
        isSidebarOpen ? 'w-64' : 'w-[70px]'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                    !isSidebarOpen && 'justify-center',
                    isActive && 'text-foreground bg-accent'
                  )}
                >
                   {isActive && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  )}
                  <item.icon className={cn(
                      'h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground',
                      isActive && 'text-primary'
                      )}
                   />
                  {isSidebarOpen && <span className="ml-3">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
