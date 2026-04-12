"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip,
  XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  ShieldAlert, Activity, ArrowUp, ScanLine, Target,
  LayoutTemplate, BarChart3, PieChart as PieIcon,
  Zap, CheckCircle2, XCircle, Clock, Shield,
  AlertTriangle, Database, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RecentScan {
  id: string; tool_id: string; tool_name: string;
  target: string; status: string; created_at: string;
  risk_score: number; finding_count: number;
}

interface DashboardData {
  success: boolean;
  kpi: {
    totalScans: number; activeScans: number; failedScans24h: number;
    completedScans: number; totalAssets: number;
    openCritical: number; openHigh: number; totalFindings: number;
    todayCompleted: number; todayTotal: number;
  };
  scanTrend: { thisWeek: number; prevWeek: number };
  charts: {
    exposureTrend:    { date: string; scans: number }[];
    riskDistribution: { name: string; value: number; fill: string }[];
    topTargets:       { target: string; scans: number; completed: number }[];
  };
  recentScans:    RecentScan[];
  dailyRemaining: { deepScans: number; lightScans: number; reports: number } | null;
  subscription:   { planId: string; planName: string; status: string; expiresAt: string; daysLeft: number } | null;
  usage:          { deepScans: { used: number; limit: number; dailyUsed: number; dailyLimit: number }; lightScans: { used: number; limit: number; dailyUsed: number; dailyLimit: number }; reports: { used: number; limit: number; dailyUsed: number; dailyLimit: number } } | null;
  unreadNotifications: number;
  user: { firstName: string; lastName: string; email: string };
}

const trendConfig = { scans: { label: "Scans", color: "#8b5cf6" } };
const STATUS_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", label: "Completed" },
  running:   { icon: Activity,     color: "text-violet-400",  label: "Running"   },
  queued:    { icon: Clock,        color: "text-amber-400",   label: "Queued"    },
  failed:    { icon: XCircle,      color: "text-red-400",     label: "Failed"    },
  cancelled: { icon: XCircle,      color: "text-slate-500",   label: "Cancelled" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [chartView, setChartView] = useState<"area" | "bar">("area");

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

  if (loading || !data) return <DashboardSkeleton />;

  const kpi         = data.kpi ?? { totalScans: 0, activeScans: 0, failedScans24h: 0, completedScans: 0, totalAssets: 0, openCritical: 0, openHigh: 0, totalFindings: 0, todayCompleted: 0, todayTotal: 0 };
  const scanTrend   = data.scanTrend ?? { thisWeek: 0, prevWeek: 0 };
  const charts      = data.charts ?? { exposureTrend: [], riskDistribution: [], topTargets: [] };
  const recentScans = data.recentScans ?? [];
  const { subscription, usage, dailyRemaining } = data;

  const trendPct       = scanTrend.prevWeek === 0 ? null : Math.round(((scanTrend.thisWeek - scanTrend.prevWeek) / scanTrend.prevWeek) * 100);
  const scanTrendLabel = trendPct == null ? null : trendPct === 0 ? "No change" : trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`;
  const scanTrendType  = !trendPct ? "neutral" : trendPct > 0 ? "up" : "down";
  const chartData      = (charts.exposureTrend ?? []).map(d => ({ date: d.date.slice(5), scans: d.scans }));
  const riskData       = (charts.riskDistribution ?? []).filter(d => d.value > 0);
  const topTargets     = charts.topTargets ?? [];
  const totalFindings  = kpi.totalFindings || riskData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="px-6 pt-6 pb-10 space-y-5 text-slate-200">

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Scans"  metric={kpi.totalScans.toString()}    icon={ScanLine}    trend={scanTrendLabel} trendType={scanTrendType} />
        <KpiCard title="Active Scans" metric={kpi.activeScans.toString()}   icon={Activity}    pulse={kpi.activeScans > 0} />
        <KpiCard title="Failed (24h)" metric={kpi.failedScans24h.toString()} icon={ShieldAlert} alert={kpi.failedScans24h > 0} trend={kpi.failedScans24h > 0 ? "Review logs" : "All clear"} trendType="neutral" />
        <Card className="bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 p-5 relative overflow-hidden hover:border-white/20 transition-all">
          <div className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 text-slate-400"><Zap className="h-5 w-5" /></div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Plan</p>
          {subscription ? (
            <>
              <h2 className="text-xl font-bold text-white">{subscription.planName.replace("Pentellia ", "")}</h2>
              <p className={cn("text-xs mt-1", subscription.daysLeft <= 3 ? "text-red-400" : "text-slate-400")}>
                {subscription.daysLeft > 0 ? `${subscription.daysLeft} days left` : "Expired"}
              </p>
            </>
          ) : (
            <Link href="/subscription" className="text-xs text-violet-400 hover:text-violet-300 font-medium mt-2 block">Subscribe →</Link>
          )}
        </Card>
      </div>

      {/* ── Security Findings KPIs ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniKpi label="Critical" value={kpi.openCritical} color="text-red-400"    bg="bg-red-500/[0.08]"    icon={AlertTriangle} />
        <MiniKpi label="High"     value={kpi.openHigh}    color="text-orange-400" bg="bg-orange-500/[0.08]" icon={ShieldAlert} />
        <MiniKpi label="Total Findings" value={totalFindings}  color="text-amber-400"  bg="bg-amber-500/[0.08]"  icon={Shield} />
        <MiniKpi label="Assets"   value={kpi.totalAssets}  color="text-violet-400" bg="bg-violet-500/[0.08]" icon={Database} />
      </div>

      {/* ── Usage + Today's Quota ─────────────────────────────────── */}
      {usage && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className={cn("h-full rounded-full transition-all duration-700",
                  u.limit > 0 && u.used / u.limit >= 0.9 ? "bg-red-500" : u.limit > 0 && u.used / u.limit >= 0.7 ? "bg-amber-500" : "bg-violet-500")}
                  style={{ width: u.limit > 0 ? `${Math.min(100, Math.round((u.used / u.limit) * 100))}%` : "0%" }} />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">{u.dailyUsed}/{u.dailyLimit} today</p>
            </div>
          ))}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.05] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Today</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-slate-400">Scans run</span><span className="font-mono text-white">{kpi.todayTotal}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Completed</span><span className="font-mono text-emerald-400">{kpi.todayCompleted}</span></div>
              {dailyRemaining && (
                <div className="flex justify-between text-xs pt-1.5 border-t border-white/5">
                  <span className="text-slate-400">Deep left</span>
                  <span className={cn("font-mono font-semibold", dailyRemaining.deepScans === 0 ? "text-red-400" : "text-violet-300")}>{dailyRemaining.deepScans}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassCard title="Scan Velocity (7 days)" className="lg:col-span-2"
          action={
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
              <ChartToggle active={chartView === "area"} onClick={() => setChartView("area")} icon={LayoutTemplate} />
              <ChartToggle active={chartView === "bar"}  onClick={() => setChartView("bar")}  icon={BarChart3} />
            </div>
          }
        >
          <div className="h-[210px] w-full mt-2">
            {chartData.some(d => d.scans > 0) ? (
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
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent className="bg-[#0B0C15] border-white/10" />} />
                    <Area dataKey="scans" type="monotone" fill="url(#fillScans)" stroke="#8b5cf6" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "white", opacity: 0.05 }} content={<ChartTooltipContent className="bg-[#0B0C15] border-white/10" />} />
                    <Bar dataKey="scans" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ChartContainer>
            ) : <EmptyChart text="Run your first scan to see activity" />}
          </div>
        </GlassCard>

        <GlassCard title="Risk Distribution">
          <div className="h-[210px] flex flex-col items-center justify-center relative mt-1">
            {riskData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="44%" innerRadius={50} outerRadius={68} paddingAngle={3} dataKey="value">
                      {riskData.map((e, i) => <Cell key={i} fill={e.fill} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0B0C15", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }} />
                    <Legend verticalAlign="bottom" height={26} iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-xl font-bold text-white">{totalFindings}</span>
                  <span className="text-[9px] text-slate-500 block uppercase tracking-wider mt-0.5">Findings</span>
                </div>
              </>
            ) : (
              <div className="text-center space-y-2">
                <PieIcon className="w-9 h-9 mx-auto text-slate-600 opacity-30" />
                <p className="text-xs text-slate-400">No findings yet</p>
                <p className="text-[11px] text-slate-600">Complete a scan to see results</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Top Targets + Recent Assessments ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassCard title="Top Targets">
          <div className="space-y-3.5 mt-1">
            {topTargets.length === 0 ? (
              <EmptyChart text="No targets yet" />
            ) : topTargets.map((t, i) => {
              const pct = Math.round((t.completed / Math.max(t.scans, 1)) * 100);
              return (
                <div key={t.target} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-600 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-mono text-slate-300 truncate max-w-[130px]">{t.target}</span>
                      <span className="text-slate-500 shrink-0 ml-1">{t.scans}x</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard title="Recent Assessments" className="lg:col-span-2" noPadding>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase bg-white/[0.03] text-slate-500 tracking-wider border-b border-white/[0.06]">
              <tr>
                <th className="px-5 py-3 text-left">Tool</th>
                <th className="px-5 py-3 text-left">Target</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Findings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentScans.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <ScanLine className="h-7 w-7 opacity-20" />
                    <span className="text-xs">No scans yet.</span>
                  </div>
                </td></tr>
              ) : recentScans.map(scan => {
                const sc = STATUS_CFG[scan.status] ?? STATUS_CFG.queued;
                const StatusIcon = sc.icon;
                return (
                  <tr key={scan.id}
                    onClick={() => router.push(`/dashboard/scans/${scan.tool_id || "unknown"}/${scan.id}`)}
                    className="hover:bg-white/[0.025] cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-200">{scan.tool_name}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] text-slate-300 bg-white/5 px-2 py-0.5 rounded">{scan.target}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", sc.color)}>
                        <StatusIcon className="h-3 w-3" />{sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {scan.finding_count > 0
                        ? <span className="text-xs font-mono font-semibold text-amber-400">{scan.finding_count}</span>
                        : <span className="text-xs text-slate-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recentScans.length > 0 && (
            <div className="px-5 py-3 border-t border-white/[0.04]">
              <Link href="/dashboard/scans" className="text-xs text-slate-500 hover:text-violet-400 transition-colors">View all scans →</Link>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function KpiCard({ title, metric, icon: Icon, trend, trendType, alert, pulse }: any) {
  return (
    <Card className="bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 p-5 relative overflow-hidden hover:border-white/20 transition-all">
      <div className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 text-slate-400">
        <Icon className={cn("h-5 w-5", pulse && "animate-pulse text-violet-400")} />
      </div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      <div className="flex items-end gap-2 mt-2">
        <h2 className={cn("text-3xl font-bold tracking-tight", alert ? "text-red-400" : "text-white")}>{metric}</h2>
        {trend && (
          <span className={cn("flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded mb-0.5",
            trendType === "up" ? "text-violet-400 bg-violet-500/10" : trendType === "down" ? "text-red-400 bg-red-500/10" : "text-slate-400 bg-white/5")}>
            {trendType === "up"   && <ArrowUp className="h-2.5 w-2.5 mr-0.5" />}
            {trendType === "down" && <ArrowUp className="h-2.5 w-2.5 mr-0.5 rotate-180" />}
            {trend}
          </span>
        )}
      </div>
    </Card>
  );
}

function MiniKpi({ label, value, color, bg, icon: Icon }: any) {
  return (
    <div className={cn("rounded-lg border border-white/[0.06] p-4 flex items-center gap-3", bg)}>
      <div className={cn("p-2 rounded-lg bg-black/20", color)}><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={cn("text-lg font-bold", color)}>{value}</p>
      </div>
    </div>
  );
}

function GlassCard({ children, title, className, noPadding, action }: any) {
  return (
    <Card className={cn("bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 shadow-sm rounded-lg overflow-hidden flex flex-col", className)}>
      {title && (
        <CardHeader className="px-5 py-4 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</CardTitle>
          {action && <div>{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("flex-1", noPadding ? "p-0" : "p-5")}>{children}</CardContent>
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

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-2 min-h-[100px]">
      <Activity className="h-7 w-7 opacity-20" />
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-6 pt-6 pb-10 space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-white/[0.04] rounded-lg border border-white/[0.06]"/>)}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-16 bg-white/[0.04] rounded-lg border border-white/[0.06]"/>)}</div>
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-16 bg-white/[0.04] rounded-lg border border-white/[0.06]"/>)}</div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 h-[280px] bg-white/[0.04] rounded-lg border border-white/[0.06]"/>
        <div className="h-[280px] bg-white/[0.04] rounded-lg border border-white/[0.06]"/>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="h-56 bg-white/[0.04] rounded-lg border border-white/[0.06]"/>
        <div className="col-span-2 h-56 bg-white/[0.04] rounded-lg border border-white/[0.06]"/>
      </div>
    </div>
  );
}
