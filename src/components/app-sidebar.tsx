
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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useMemo } from 'react';

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
  const userAvatar = useMemo(
    () => PlaceHolderImages.find((img) => img.id === 'user-avatar'),
    []
  );

  return (
    <aside
      className={cn(
        'fixed top-16 z-30 h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 border-r border-slate-800 transition-all duration-300',
        isSidebarOpen ? 'w-64' : 'w-[70px]'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="p-3">
          <Button
            variant="warning"
            className="w-full justify-center text-sm font-semibold text-slate-900 hover:bg-yellow-300"
          >
            <Zap className="h-4 w-4" />
            {isSidebarOpen && <span className="ml-2">New scan</span>}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          <div>
            {isSidebarOpen && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Workspaces
              </p>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-white hover:bg-slate-700 hover:text-white',
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
                  'flex items-center rounded px-3 py-2 text-slate-300 hover:bg-slate-800',
                  !isSidebarOpen && 'justify-center',
                  pathname.startsWith(item.href)
                    ? 'bg-slate-800 font-medium text-white'
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
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Configurations
              </p>
            )}
            <nav className="space-y-1 text-sm">
              {configItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded px-3 py-2 text-slate-300 hover:bg-slate-800',
                    !isSidebarOpen && 'justify-center',
                     pathname.startsWith(item.href) ? 'bg-slate-800 font-medium text-white' : ''
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {isSidebarOpen && <span className="ml-3">{item.label}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-auto p-3">
          <div className="flex items-center justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={userAvatar?.imageUrl}
                alt={userAvatar?.description}
                data-ai-hint={userAvatar?.imageHint}
              />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </aside>
  );
}
