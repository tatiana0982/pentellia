
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/assets', icon: Package, label: 'Assets' },
  { href: '/scans', icon: ShieldCheck, label: 'Scans' },
  { href: '/findings', icon: FileSearch, label: 'Findings' },
  { href: '/attack-surface', icon: Crosshair, label: 'Attack Surface' },
  { href: '/handlers', icon: Server, label: 'Handlers' },
];

const configItems = [
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/robots', icon: Bot, label: 'Robots' },
  { href: '/team', icon: Users, label: 'Team' },
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
        <div className="p-3">
          <Button
            className={cn(
                'w-full justify-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90',
                !isSidebarOpen && 'h-10 w-10 p-0'
                )}
          >
            <Zap className="h-4 w-4" />
            {isSidebarOpen && <span className="ml-2">New scan</span>}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          <div>
            {isSidebarOpen && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Workspaces
              </p>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground',
                    !isSidebarOpen && 'justify-center'
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  {isSidebarOpen && (
                    <>
                      <span className="ml-2">My Workspace</span>
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem>Workspace 1</DropdownMenuItem>
                <DropdownMenuItem>Workspace 2</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground',
                  !isSidebarOpen && 'justify-center',
                  pathname.startsWith(item.href)
                    ? 'bg-accent font-medium text-foreground'
                    : ''
                )}
              >
                <item.icon className="h-5 w-5" />
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div>
            {isSidebarOpen && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Configurations
              </p>
            )}
            <nav className="space-y-1 text-sm">
              {configItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground',
                    !isSidebarOpen && 'justify-center',
                     pathname.startsWith(item.href) ? 'bg-accent font-medium text-foreground' : ''
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {isSidebarOpen && <span className="ml-3">{item.label}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}
