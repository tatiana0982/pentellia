
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/assets', icon: Package, label: 'Assets' },
  { href: '/scans', icon: Shield, label: 'Scans' },
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
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4 text-sm">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center rounded-md px-3 py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                    !isSidebarOpen && 'justify-center',
                    isActive && 'text-foreground bg-accent'
                  )}
                >
                   {isActive && (
                    <div className="absolute left-0 top-[15%] h-[70%] w-0.5 bg-primary" />
                  )}
                  <item.icon className={cn(
                      'h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground',
                      isActive && 'text-primary'
                      )}
                   />
                  {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
                </Link>
              );
            })}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto flex flex-col gap-2 p-3 border-t border-border">
          {isSidebarOpen && (
              <div className="p-2 rounded-lg bg-accent/30 border border-border">
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                      <span className='font-medium text-foreground'>Scans</span>
                      <span>1/3 Free Scans</span>
                  </div>
                  <Progress value={(1/3) * 100} className="h-1.5"/>
              </div>
          )}
           <Link
                href='/support'
                className={cn(
                  'group relative flex items-center rounded-md px-3 py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-sm',
                  !isSidebarOpen && 'justify-center'
                )}
              >
                <LifeBuoy className='h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground' />
                {isSidebarOpen && <span className="ml-3 font-medium">Help & Support</span>}
            </Link>
            <Button variant='outline' size='sm' className='w-full'>
                <Star className='mr-2 h-4 w-4 text-primary'/>
                Upgrade
            </Button>
        </div>
      </div>
    </aside>
  );
}
