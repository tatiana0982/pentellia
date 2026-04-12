"use client";

import { useRouter } from "next/navigation";
import { Key, MessageSquare, Construction, ArrowRight, Lock } from "lucide-react";

export default function ApiKeysPage() {
  const router = useRouter();

  return (
    <div className="w-full space-y-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">API Keys</h1>
        <p className="text-sm text-slate-500 mt-0.5">Programmatic access to the Pentellia scanning platform.</p>
      </div>

      <div className="max-w-xl">
        <div className="rounded-lg border border-white/[0.07] bg-[#0d0e1a] overflow-hidden">
          <div className="h-[2px] w-full bg-gradient-to-r from-violet-600 to-indigo-500" />

          <div className="p-8 flex flex-col items-center text-center space-y-5">
            <div className="h-14 w-14 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
              <Construction className="h-7 w-7 text-violet-400" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white mb-2">API Access — Coming Soon</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                Programmatic API access is under development. Once available, you will be able to
                create API keys here to automate scans, retrieve findings, and integrate with your CI/CD pipeline.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              {[
                "Trigger scans programmatically",
                "Retrieve findings via REST API",
                "Webhook callbacks on scan completion",
                "CI/CD pipeline integration",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 text-xs text-slate-400 text-left">
                  <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  {feature}
                </div>
              ))}
            </div>

            <div className="pt-1 flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={() => router.push("/dashboard/support")}
                className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                Request Early Access
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full h-9 flex items-center justify-center gap-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-all"
              >
                Back to Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
