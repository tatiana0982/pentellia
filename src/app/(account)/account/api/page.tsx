"use client";

import { useRouter } from "next/navigation";
import { Key, MessageSquare, Construction, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApiKeysPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col space-y-8 font-sans text-slate-200">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Key className="h-6 w-6 text-indigo-400" />
          API Keys
        </h1>
        <p className="text-sm text-slate-400">
          Programmatic access to the Pentellia scanning platform.
        </p>
      </div>

      {/* Coming soon card */}
      <div className="max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-[#0B0C15] overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-violet-600 to-indigo-600" />

          <div className="p-8 flex flex-col items-center text-center space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Construction className="h-8 w-8 text-indigo-400" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">API Access — Coming Soon</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                Programmatic API access is currently under development. Once available, you will be able to
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

            <div className="pt-2 flex flex-col gap-2.5 w-full max-w-xs">
              <Button
                onClick={() => router.push("/dashboard/support")}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Request Early Access
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="w-full text-slate-400 hover:text-white hover:bg-white/5"
              >
                Back to Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}