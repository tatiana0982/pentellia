"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { DomainVerificationProvider } from "@/context/DomainVerificationContext";
import { useDomainGate } from "@/context/DomainVerificationContext";
import { WalletProvider } from "@/providers/WalletProvider";
import { ShieldAlert, ArrowRight, X } from "lucide-react";

function UnverifiedBanner() {
  const { hasVerifiedDomain, isLoading } = useDomainGate();
  const [dismissed, setDismissed] = useState(false);
  if (isLoading || hasVerifiedDomain || dismissed) return null;

  return (
    <div className="mx-4 mt-4 mb-0 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
      <p className="text-xs text-amber-200/80 flex-1">
        <span className="font-semibold text-amber-300">Domain not verified.</span>{" "}
        Verify your domain to unlock all security scanning tools.
      </p>
      <Link
        href="/account/domains"
        className="flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-white transition-colors shrink-0"
      >
        Verify now <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md text-amber-500/60 hover:text-amber-300 hover:bg-amber-500/10 transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function InnerLayout({
  children,
  path,
  isSidebarOpen,
  toggleSidebar,
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
        <main
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out h-full overflow-y-auto",
            isSidebarOpen ? "ml-64" : "ml-[80px]",
          )}
        >
          <UnverifiedBanner />
          <div
            className={`${
              path.includes("scans") ? " " : "p-8"
            } animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-full`}
          >
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
      <DomainVerificationProvider>
        <InnerLayout
          path={path}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen((p) => !p)}
        >
          {children}
        </InnerLayout>
      </DomainVerificationProvider>
    </WalletProvider>
  );
}