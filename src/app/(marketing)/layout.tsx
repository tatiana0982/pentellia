
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Menu, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ShieldIcon } from '@/components/icons';

const navLinks = [
  { name: 'Product', href: '#product' },
  { name: 'Platform', href: '#platform' },
  { name: 'Modules', href: '#modules' },
  { name: 'Docs', href: '#docs' },
  { name: 'Pricing', href: '#pricing' },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <ShieldIcon className="h-6 w-6 text-cyan-400" />
              <span className="text-lg font-semibold">Pentellia</span>
            </Link>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="secondary" className="bg-slate-800 hover:bg-slate-700">
              <Link href="/dashboard">Launch dashboard</Link>
            </Button>
            <Button asChild className="bg-cyan-500 text-slate-900 hover:bg-cyan-400">
              <Link href="#demo">Book a demo</Link>
            </Button>
          </div>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-slate-950 text-white">
                <div className="flex flex-col gap-6 p-6">
                  <Link href="/" className="flex items-center gap-2">
                     <ShieldIcon className="h-6 w-6 text-cyan-400" />
                    <span className="text-lg font-semibold">Pentellia</span>
                  </Link>
                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.name}
                        href={link.href}
                        className="text-lg font-medium text-slate-300 transition-colors hover:text-white"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </nav>
                  <div className="mt-4 flex flex-col gap-3">
                    <Button asChild variant="secondary">
                      <Link href="/dashboard">Launch dashboard</Link>
                    </Button>
                    <Button asChild className="bg-cyan-500 text-slate-900 hover:bg-cyan-400">
                      <Link href="#demo">Book a demo</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-800/80">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} EncodersPro. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-cyan-400" />
            <p className="font-semibold">Pentellia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
