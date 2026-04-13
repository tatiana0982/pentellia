"use client";

import { useRouter } from "next/navigation";
import {
  Key, Zap, Webhook, GitMerge, Code2,
  ArrowRight, Clock, Lock,
} from "lucide-react";

function Card({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden border bg-[#0d0e1a] border-white/[0.07]">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06]">
        <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 border bg-violet-500/10 border-violet-500/15">
          <Icon className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const FEATURES = [
  { icon: Key,      title: "API Key Management", desc: "Generate, rotate, and revoke keys with configurable scopes and expiry." },
  { icon: Zap,      title: "Scan Triggers",       desc: "Initiate any of the 35 supported security tools programmatically." },
  { icon: Webhook,  title: "Webhook Callbacks",   desc: "Receive HTTP callbacks on scan completion, failure, or findings threshold." },
  { icon: GitMerge, title: "CI/CD Integration",   desc: "Native support for GitHub Actions, GitLab CI, and Jenkins pipelines." },
  { icon: Code2,    title: "SDK Support",          desc: "Official TypeScript and Python SDKs with full type coverage." },
];

export default function ApiKeysPage() {
  const router = useRouter();

  return (
    <div className="w-full space-y-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">REST API</h1>
        <p className="text-sm text-slate-500 mt-0.5">Programmatic access to the Pentellia scanning platform.</p>
      </div>

      <Card title="API Access" icon={Clock}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-sm font-medium text-white">In Development</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 border border-amber-500/20 rounded px-2 py-0.5">Beta Soon</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              API key management is under active development. Once available, you will be able to create keys
              here to automate scans, retrieve findings, and integrate with your CI/CD pipeline.
              Estimated availability Q3 2026.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/support")}
            className="shrink-0 h-9 px-5 rounded-md text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all"
          >
            Request Early Access
          </button>
        </div>
      </Card>

      <Card title="Planned Capabilities" icon={Code2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 flex items-start gap-3">
                <div className="mt-0.5 h-7 w-7 rounded-md bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-slate-200">{f.title}</span>
                    <Lock className="h-3 w-3 text-slate-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Current API Surface" icon={Code2}>
        <p className="text-xs text-slate-400 leading-relaxed">
          The scan engine already exposes a structured REST API on the backend — all 35 tools are invoked
          via authenticated JSON endpoints. The API key system will surface this directly to your account
          with scoped credentials, rate limits, and usage audit logging.
        </p>
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors"
          >
            Back to Dashboard <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </Card>
    </div>
  );
}