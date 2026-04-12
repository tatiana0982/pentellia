"use client";

// src/app/(app)/layout.tsx

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { WalletProvider, useWallet } from "@/providers/WalletProvider";
import { AlertTriangle, ArrowRight, X, Clock } from "lucide-react";

// ── Subscription expiry banner ─────────────────────────────────────────
function SubscriptionBanner() {
  const { subscription, isLoading } = useWallet();
  const [dismissed, setDismissed] = useState(false);
  // Use wallet context data - avoids duplicate wallet-summary API call
  const data = { subscription };

  if (isLoading || !data || dismissed) return null;

  if (!data.subscription) {
    return (
      <div className="mx-4 mt-4 mb-0 rounded-lg border border-violet-500/25 bg-violet-500/[0.07] px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-violet-400 shrink-0" />
        <p className="text-xs text-violet-200/80 flex-1">
          <span className="font-semibold text-violet-300">No active subscription.</span>{" "}
          Subscribe to a plan to start scanning.
        </p>
        <Link href="/subscription" className="flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-white transition-colors shrink-0">
          View Plans <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button onClick={() => setDismissed(true)} className="p-1 text-violet-500/60 hover:text-violet-300 shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const daysLeft  = data.subscription.daysLeft ?? 0;
  if (daysLeft > 3) return null;
  const isExpired = daysLeft === 0;

  return (
    <div className={cn(
      "mx-4 mt-4 mb-0 rounded-lg border px-4 py-3 flex items-center gap-3",
      isExpired ? "border-red-500/25 bg-red-500/[0.07]" : "border-amber-500/25 bg-amber-500/[0.07]",
    )}>
      <Clock className={cn("h-4 w-4 shrink-0", isExpired ? "text-red-400" : "text-amber-400")} />
      <p className={cn("text-xs flex-1", isExpired ? "text-red-200/80" : "text-amber-200/80")}>
        {isExpired ? (
          <><span className="font-semibold text-red-300">Subscription expired.</span> Renew to continue scanning.</>
        ) : (
          <><span className={cn("font-semibold", "text-amber-300")}>Plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}.</span> Renew to avoid interruption.</>
        )}
      </p>
      <Link href="/subscription" className={cn("flex items-center gap-1 text-xs font-semibold transition-colors shrink-0", isExpired ? "text-red-300 hover:text-white" : "text-amber-300 hover:text-white")}>
        Renew <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      {!isExpired && (
        <button onClick={() => setDismissed(true)} className="p-1 text-amber-500/60 hover:text-amber-300 shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function InnerLayout({
  children, path, isSidebarOpen, toggleSidebar,
}: {
  children: ReactNode;
  path: string;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}) {
  return (
    <div className="relative h-screen w-full bg-[#05050A] font-sans text-slate-200 selection:bg-violet-500/30 overflow-hidden flex flex-col">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen" />
      </div>

      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

      <div className="relative z-10 flex h-full pt-16">
        <AppSidebar isSidebarOpen={isSidebarOpen} />

        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out h-full overflow-y-auto",
          isSidebarOpen ? "ml-64" : "ml-[80px]",
        )}>
          <SubscriptionBanner />

          {/* Pages own their padding — layout provides structure only */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <WalletProvider>
      <InnerLayout
        path={path}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(p => !p)}
      >
        {children}
      </InnerLayout>
    </WalletProvider>
  );
}
