
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto flex flex-1 items-center justify-center py-12">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Left Column: Visual/Marketing */}
          <div className="hidden md:flex flex-col items-center justify-center text-center">
             <div className="mt-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Continuous Attack Surface Monitoring</h1>
                <p className="mt-4 text-muted-foreground">Identify, analyze, and secure your digital footprint with Pentellia's AI-powered platform. Built for enterprise security teams.</p>
             </div>
          </div>

          {/* Right Column: Auth Form */}
          <div className="w-full">{children}</div>
        </div>
    </div>
  );
}
