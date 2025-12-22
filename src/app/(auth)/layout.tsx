import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldIcon } from '@/components/icons';
import LottiePlayer from '@/components/lottie-player';
import animationData from '@/lib/cyber-animation.json';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <ShieldIcon className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-semibold">Pentellia</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto flex h-full items-center justify-center px-4 py-12 md:px-6">
          <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2">
            {/* Left Column: Animation */}
            <div className="hidden md:flex flex-col items-center justify-center text-center">
               <LottiePlayer animationData={animationData} />
               <div className="mt-8">
                  <h1 className="text-3xl font-bold tracking-tight text-white">Continuous Attack Surface Monitoring</h1>
                  <p className="mt-4 text-slate-400">Identify, analyze, and secure your digital footprint with Pentellia's AI-powered platform. Built for enterprise security teams.</p>
               </div>
            </div>

            {/* Right Column: Auth Form */}
            <div className="w-full">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
