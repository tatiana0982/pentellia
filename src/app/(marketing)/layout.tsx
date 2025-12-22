
'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <ShieldIcon className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Pentellia</span>
          </Link>
          <div className="ml-auto">
            <Button variant="dark">
              Book a Demo
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <footer className="border-t border-border/80">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Pentellia, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-primary" />
            <p className="font-semibold text-foreground">Pentellia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
