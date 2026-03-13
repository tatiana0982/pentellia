"use client";

import React from "react";
import {
  Server,
  Globe,
  Cloud,
  Code,
  ShieldAlert,
  CheckCircle2,
  Activity,
  Layers,
  Clock,
  XCircle,
  Database,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AssetDiscoveryReport({ data }: { data: any }) {
  // Gracefully handle nested 'result' key if backend wraps it
  const resultData = data.assets ? data : data.result || {};

  const summary = resultData.summary || {};
  const phases = resultData.phases || [];
  const assets = resultData.assets || [];
  const assetsByType = resultData.assets_by_type || {};

  // Total metrics
  const totalAssets = summary.total_assets || resultData.total_assets || 0;
  const riskyAssets = summary.risky_assets || 0;
  const phasesRun = summary.phases_run || phases.length || 0;
  const phasesConfirmed = summary.phases_confirmed || 0;

  const getAssetIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("domain")) return <Globe className="h-4 w-4 text-blue-400" />;
    if (t.includes("port") || t.includes("ip")) return <Server className="h-4 w-4 text-emerald-400" />;
    if (t.includes("api") || t.includes("url")) return <Code className="h-4 w-4 text-fuchsia-400" />;
    if (t.includes("cloud") || t.includes("bucket") || t.includes("azure")) return <Cloud className="h-4 w-4 text-cyan-400" />;
    return <Database className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <KpiCard
          label="Total Assets Found"
          value={totalAssets}
          icon={Target}
          color="blue"
        />
        <KpiCard
          label="Risky Assets"
          value={riskyAssets}
          icon={ShieldAlert}
          color="orange"
        />
        <KpiCard
          label="Phases Executed"
          value={phasesRun}
          icon={Layers}
          color="violet"
        />
        <KpiCard
          label="Manual Confirmations"
          value={phasesConfirmed}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* 2. Execution Phases Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-fuchsia-400" /> Discovery Phases
        </h3>
        {phases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {phases.map((phase: any, idx: number) => (
              <Card key={idx} className="bg-[#0B0C15] border-white/10 shadow-sm relative overflow-hidden group hover:border-white/20 transition-all">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 font-mono text-xs">
                        P{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200 capitalize">
                          {phase.phase.replace(/_/g, " ")}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {phase.discoverers_run?.join(", ")}
                        </span>
                      </div>
                    </div>
                    {phase.user_confirmed ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Confirmed</Badge>
                    ) : phase.skipped_reason ? (
                      <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">Skipped</Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Auto-Run</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Assets Found</span>
                      <span className="text-lg font-semibold text-white">{phase.assets_found || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Duration</span>
                      <span className="text-sm font-medium text-slate-300 mt-1">{phase.duration_seconds?.toFixed(1)}s</span>
                    </div>
                    {phase.skipped_reason && (
                      <div className="flex flex-col flex-1 text-right">
                         <span className="text-[10px] text-red-400 uppercase tracking-widest">Reason</span>
                         <span className="text-xs text-slate-400 truncate mt-1">{phase.skipped_reason}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-slate-500 bg-white/[0.01]">
            No phase execution data available.
          </div>
        )}
      </div>

      {/* 3. Discovered Assets Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-400" /> Asset Inventory
        </h3>
        
        <Card className="bg-[#0B0C15] border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-4 w-[140px]">Asset Type</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {assets.length > 0 ? (
                  assets.map((asset: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getAssetIcon(asset.asset_type)}
                          <span className="text-xs uppercase tracking-wide text-slate-400">
                            {asset.asset_type.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-white break-all">
                        {asset.value}
                        {asset.risk_indicators?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {asset.risk_indicators.map((r: string) => (
                              <Badge key={r} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] px-1.5 py-0">
                                {r.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {asset.source || "Orchestrator"}
                      </td>
                      <td className="px-6 py-4">
                        {asset.scannable ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Scannable</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">Unreachable</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                       <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto mb-2" />
                       No external assets were discovered beyond the root target.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  );
}

// Sub-component
function KpiCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    orange: "text-orange-400 border-orange-500/20 bg-orange-500/5",
    violet: "text-violet-400 border-violet-500/20 bg-violet-500/5",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  };

  return (
    <div className={cn("p-5 rounded-xl border flex flex-col justify-center", colors[color])}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
      </div>
      <span className="text-3xl font-black">{value}</span>
    </div>
  );
}