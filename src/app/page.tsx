"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip,
  XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  ShieldAlert, Activity, ArrowUp, ScanLine, Target,
  LayoutTemplate, BarChart3, PieChart as PieIcon, Zap,
  CheckCircle2, XCircle, Clock, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RecentScan {
  id: string; tool_id: string; tool_name: string;
  target: string; status: string; created_at: string;
}

interface DashboardData {
  stats: {
    totalScans: number; activeScans: number; failedScans: number;
    weeklyScans: number; scanTrend: number | null;
    riskDistribution: { name: string; value: number }[];
    exposureTrend: { week: string; scans: number }[];
    recentScans: RecentScan[];
  };
  subscription: { planId: string; planName: string; status: string; expiresAt: string; daysLeft: number; } | null;
  usage: { deepScans: { used: number; limit: number }; lightScans: { used: number; limit: number }; reports: { used: number; limit: number }; } | null;
  unreadNotifications: number;
  user: { firstName: string; lastName: string; email: string };
}

const RISK_COLORS: Record<string, string> = {
  Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#3b82f6",
};
const trendConfig = { scans: { label: "Scans", color: "#8b5cf6" } };

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", label: "Completed" },
  running:   { icon: Activity,     color: "text-violet-400",  label: "Running"   },
  queued:    { icon: Clock,        color: "text-amber-400",   label: "Queued"    },
  failed:    { icon: XCircle,      color: "text-red-400",     label: "Failed"    },
  cancelled: { icon: XCircle,      color: "text-slate-500",   label: "Cancelled" },
};

export default function DashboardPage() {
  // Use null to distinguish "loading" from "loaded with empty data"
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [chartView, setChartView] = useState<"area" | "bar">("area");
  const router = useRouter();

  const loadData = useCallback(() => {
    fetch("/api/dashboard/init")
      .then(r => r.json())
      .then(json => { if (json.success) setData(json); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("dashboard-refresh", loadData);
    return () => window.removeEventListener("dashboard-refresh", loadData);
  }, [loadData]);

  // Show skeleton only on first load
  if (loading) return <DashboardSkeleton />;

  const { stats, subscription, usage } = data ?? {
    stats: { totalScans: 0, activeScans: 0, failedScans: 0, weeklyScans: 0, scanTrend: null, riskDistribution: [], exposureTrend: [], recentScans: [] },
    subscription: null, usage: null,
  };

  const scanTrendLabel = stats.scanTrend == null ? null : stats.scanTrend === 0 ? "No change" : stats.scanTrend > 0 ? `+${stats.scanTrend}%` : `${stats.scanTrend}%`;
  const scanTrendType  = !stats.scanTrend ? "neutral" : stats.scanTrend > 0 ? "up" : "down";
  const chartData      = (stats.exposureTrend ?? []).map(d => ({ date: d.week, scans: d.scans }));
  const riskData       = (stats.riskDistribution ?? []).filter(d => d.value > 0).map(d => ({ ...d, fill: RISK_COLORS[d.name] ?? "#8b5cf6" }));
  const recentScans    = stats.recentScans ?? [];

  return (
    <div className="px-8 pt-6 pb-10 space-y-6 text-slate-200">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Scans"  metric={stats.totalScans.toString()}  icon={ScanLine}    trend={scanTrendLabel} trendType={scanTrendType} />
        <KpiCard title="Active Scans" metric={stats.activeScans.toString()} icon={Target}      trend={null} trendType="neutral" />
        <KpiCard title="Failed (24h)" metric={stats.failedScans.toString()} icon={ShieldAlert} alert={stats.failedScans > 0} trend={stats.failedScans > 0 ? "Check logs" : "All clear"} trendType="neutral" />
        <Card className="bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 p-6 relative overflow-hidden group hover:border-white/20 transition-all">
          <div className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 text-slate-400"><Zap className="h-5 w-5" /></div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Plan</p>
            {subscription ? (
              <>
                <h2 className="text-lg font-bold text-white leading-tight">{subscription.planName.replace("Pentellia ", "")}</h2>
                <p className={cn("text-xs font-medium", subscription.daysLeft <= 3 ? "text-red-400" : "text-slate-400")}>
                  {subscription.daysLeft > 0 ? `${subscription.daysLeft} days left` : "Expired"}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-500">No Plan</h2>
                <Link href="/subscription" className="text-xs text-violet-400 hover:text-violet-300">Subscribe →</Link>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Usage bars */}
      {usage && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Deep Scans",  ...usage.deepScans  },
            { label: "Light Scans", ...usage.lightScans },
            { label: "Reports",     ...usage.reports    },
          ].map(u => (
            <div key={u.label} className="rounded-lg border border-white/[0.07] bg-[#0B0C15]/40 p-4">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{u.label}</span>
                <span className="font-mono text-slate-200">{u.used}<span className="text-slate-600">/{u.limit}</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700",
                    u.limit > 0 && u.used / u.limit >= 0.9 ? "bg-red-500"
                    : u.limit > 0 && u.used / u.limit >= 0.7 ? "bg-amber-500"
                    : "bg-violet-500")}
                  style={{ width: u.limit > 0 ? `${Math.min(100, Math.round((u.used / u.limit) * 100))}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard title="Scan Velocity" className="lg:col-span-2"
          action={
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
              <ChartToggle active={chartView === "area"} onClick={() => setChartView("area")} icon={LayoutTemplate} />
              <ChartToggle active={chartView === "bar"}  onClick={() => setChartView("bar")}  icon={BarChart3} />
            </div>
          }
        >
          <div className="h-[280px] w-full mt-4">
            {chartData.length > 0 ? (
              <ChartContainer config={trendConfig} className="h-full w-full">
                {chartView === "area" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="fillScans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent className="bg-[#0B0C15] border-white/10" />} />
                    <Area dataKey="scans" type="monotone" fill="url(#fillScans)" stroke="#8b5cf6" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "white", opacity: 0.05 }} content={<ChartTooltipContent className="bg-[#0B0C15] border-white/10" />} />
                    <Bar dataKey="scans" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ChartContainer>
            ) : (
              <EmptyState text="Run your first scan to see activity" />
            )}
          </div>
        </GlassCard>

        {/* Risk Distribution — only populated after scans with findings */}
        <GlassCard title="Risk Distribution">
          <div className="h-[280px] w-full flex flex-col items-center justify-center relative">
            {riskData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value">
                      {riskData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0B0C15", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} itemStyle={{ color: "#fff" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                  <span className="text-2xl font-bold text-white">{riskData.reduce((a, b) => a + b.value, 0)}</span>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider mt-0.5">Findings</span>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 space-y-3">
                <PieIcon className="w-10 h-10 mx-auto opacity-20" />
                <div>
                  <p className="text-xs font-medium text-slate-400">No findings yet</p>
                  <p className="text-[11px] text-slate-600 mt-1">Complete a scan to see results</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Recent Assessments — live data */}
      <GlassCard title="Recent Assessments" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase bg-white/[0.03] text-slate-500 tracking-wider font-semibold border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-3.5">Tool</th>
                <th className="px-6 py-3.5">Target</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentScans.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <ScanLine className="h-8 w-8 opacity-20" />
                      <span className="text-xs">No scans yet.</span>
                      <Link href="/dashboard/new-scan" className="text-xs text-violet-400 hover:text-violet-300 font-medium">Start your first scan →</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                recentScans.map(scan => {
                  const sc = STATUS_CONFIG[scan.status] ?? STATUS_CONFIG.queued;
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={scan.id}
                      onClick={() => router.push(`/dashboard/scans/${scan.tool_id || "unknown"}/${scan.id}`)}
                      className="hover:bg-white/[0.025] transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-violet-500/10 border border-violet-500/10 flex items-center justify-center shrink-0">
                            <Zap className="h-3.5 w-3.5 text-violet-400" />
                          </div>
                          <span className="font-medium text-slate-200 text-sm">{scan.tool_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-300 bg-white/5 px-2 py-1 rounded">{scan.target}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", sc.color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-violet-400 transition-colors group-hover:text-slate-300">
                          View <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {recentScans.length > 0 && (
            <div className="px-6 py-3 border-t border-white/[0.04] flex justify-end">
              <Link href="/dashboard/scans" className="text-xs text-slate-500 hover:text-violet-400 transition-colors">
                View all scans →
              </Link>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function KpiCard({ title, metric, icon: Icon, trend, trendType, alert }: any) {
  return (
    <Card className="bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 p-6 relative overflow-hidden group hover:border-white/20 transition-all">
      <div className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="flex items-end gap-3">
          <h2 className={cn("text-3xl font-bold tracking-tight", alert ? "text-red-400" : "text-white")}>{metric}</h2>
          {trend && (
            <span className={cn("flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded mb-1",
              trendType === "up"   ? "text-violet-400 bg-violet-500/10"
              : trendType === "down" ? "text-red-400 bg-red-500/10"
              : "text-slate-400 bg-white/5")}>
              {trendType === "up"   && <ArrowUp className="h-2.5 w-2.5 mr-0.5" />}
              {trendType === "down" && <ArrowUp className="h-2.5 w-2.5 mr-0.5 rotate-180" />}
              {trend}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function GlassCard({ children, title, className, noPadding, action }: any) {
  return (
    <Card className={cn("bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 shadow-sm rounded-lg overflow-hidden flex flex-col", className)}>
      {title && (
        <CardHeader className="px-6 py-4 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</CardTitle>
          {action && <div>{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("flex-1", noPadding ? "p-0" : "p-6")}>{children}</CardContent>
    </Card>
  );
}

function ChartToggle({ active, onClick, icon: Icon }: any) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className={cn("h-7 w-7 rounded", active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white")}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 space-y-2">
      <Activity className="h-8 w-8 opacity-20" />
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-8 pt-6 pb-10 space-y-5 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/[0.04] rounded-lg border border-white/[0.06]" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-white/[0.04] rounded-lg border border-white/[0.06]" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-[360px] bg-white/[0.04] rounded-lg border border-white/[0.06]" />
        <div className="h-[360px] bg-white/[0.04] rounded-lg border border-white/[0.06]" />
      </div>
      <div className="h-64 bg-white/[0.04] rounded-lg border border-white/[0.06]" />
    </div>
  );
}