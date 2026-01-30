"use client";

import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  ShieldAlert,
  Activity,
  ArrowUp,
  ScanLine,
  Target,
  LayoutTemplate,
  BarChart3,
  PieChart as PieIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// --- Types ---
interface DashboardData {
  kpi: {
    totalAssets: number;
    totalScans: number;
    activeScans: number;
    failedScans24h: number;
    openCritical: number;
    openHigh: number;
  };
  charts: {
    exposureTrend: { date: string; scans: number }[];
    riskDistribution: { name: string; value: number; fill: string }[];
  };
  recentScans: any[];
}

// --- Chart Configs ---
const trendConfig = {
  scans: { label: "Scans", color: "#8b5cf6" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<"area" | "bar">("area");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        const json = await res.json();
        if (json.success) setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) return <DashboardSkeleton />;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 bg-[#02040a] min-h-screen text-slate-200">
      {/* 1. HEADER METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Scans"
          metric={data.kpi.totalScans.toString()}
          icon={ScanLine}
          trend="+12%"
          trendType="up"
        />
        <KpiCard
          title="Active Assets"
          metric={data.kpi.totalAssets.toString()}
          icon={Target}
          trend="+3"
          trendType="up"
        />
        <KpiCard
          title="Critical Risks"
          metric={data.kpi.openCritical.toString()}
          icon={ShieldAlert}
          alert={data.kpi.openCritical > 0}
          trend="Immediate Action"
          trendType="neutral"
        />
        <KpiCard
          title="High Risks"
          metric={data.kpi.openHigh.toString()}
          icon={AlertTriangle}
          alert={data.kpi.openHigh > 0}
          trend="Needs Review"
          trendType="neutral"
        />
      </div>

      {/* 2. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A. ACTIVITY CHART */}
        <GlassCard
          title="Scan Velocity (7 Days)"
          className="lg:col-span-2"
          action={
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
              <ChartToggle
                active={chartView === "area"}
                onClick={() => setChartView("area")}
                icon={LayoutTemplate}
              />
              <ChartToggle
                active={chartView === "bar"}
                onClick={() => setChartView("bar")}
                icon={BarChart3}
              />
            </div>
          }
        >
          <div className="h-[300px] w-full mt-4">
            {data.charts.exposureTrend.length > 0 ? (
              <ChartContainer config={trendConfig} className="h-full w-full">
                {chartView === "area" ? (
                  <AreaChart data={data.charts.exposureTrend}>
                    <defs>
                      <linearGradient
                        id="fillScans"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      content={
                        <ChartTooltipContent className="bg-[#0B0C15] border-white/10" />
                      }
                    />
                    <Area
                      dataKey="scans"
                      type="monotone"
                      fill="url(#fillScans)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={data.charts.exposureTrend}>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      cursor={{ fill: "white", opacity: 0.05 }}
                      content={
                        <ChartTooltipContent className="bg-[#0B0C15] border-white/10" />
                      }
                    />
                    <Bar dataKey="scans" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ChartContainer>
            ) : (
              <EmptyState text="No activity in last 7 days" />
            )}
          </div>
        </GlassCard>

        {/* B. RISK DISTRIBUTION (PIE) */}
        <GlassCard title="Vulnerability Distribution">
          <div className="h-[300px] w-full flex flex-col items-center justify-center relative">
            {data.charts.riskDistribution.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.charts.riskDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        stroke="rgba(0,0,0,0.5)"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0B0C15",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500">
                <PieIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No vulnerabilities found yet</p>
              </div>
            )}

            {/* Center Text Overly */}
            {data.charts.riskDistribution.some((d) => d.value > 0) && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                <span className="text-2xl font-bold text-white">
                  {data.charts.riskDistribution.reduce(
                    (a, b) => a + b.value,
                    0,
                  )}
                </span>
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                  Findings
                </span>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* 3. DETAILED RECENT SCANS TABLE */}
      <GlassCard title="Recent Assessments" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase bg-white/5 text-slate-400 tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Tool / Engine</th>
                <th className="px-6 py-4">Target Scope</th>
                <th className="px-6 py-4 text-center">Risk Score</th>
                <th className="px-6 py-4 text-center">Findings</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.recentScans.length > 0 ? (
                data.recentScans.map((scan) => (
                  <tr
                    key={scan.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-white">
                          {scan.tool_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {scan.target}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {scan.status === "completed" ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-0 bg-opacity-10",
                            getRiskColor(scan.risk_score),
                          )}
                        >
                          {scan.risk_score}/100
                        </Badge>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {scan.status === "completed" ? (
                        <span className="text-white font-medium">
                          {scan.finding_count}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={scan.status}
                        date={scan.created_at}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/scans/${scan.tool_id || "unknown"}/${scan.id}`}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                          View Report <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// --- SUB COMPONENTS ---

function KpiCard({ title, metric, icon: Icon, trend, trendType, alert }: any) {
  return (
    <Card className="bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 p-6 relative overflow-hidden group hover:border-white/20 transition-all">
      <div className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        <div className="flex items-end gap-3">
          <h2
            className={cn(
              "text-3xl font-bold tracking-tight",
              alert ? "text-red-400" : "text-white",
            )}
          >
            {metric}
          </h2>
          {trend && (
            <span
              className={cn(
                "flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded mb-1",
                trendType === "up"
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-slate-400 bg-white/5",
              )}
            >
              {trendType === "up" && <ArrowUp className="h-2.5 w-2.5 mr-0.5" />}
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
    <Card
      className={cn(
        "bg-[#0B0C15]/50 backdrop-blur-md border border-white/10 shadow-sm rounded-xl overflow-hidden flex flex-col",
        className,
      )}
    >
      {title && (
        <CardHeader className="px-6 py-4 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
            {title}
          </CardTitle>
          {action && <div>{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("flex-1", noPadding ? "p-0" : "p-6")}>
        {children}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, date }: { status: string; date: string }) {
  const styles: any = {
    completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    running: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    failed: "text-red-400 bg-red-500/10 border-red-500/20",
    queued: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };

  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "running"
        ? Activity
        : status === "failed"
          ? AlertTriangle
          : Clock;

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-full capitalize gap-1.5",
          styles[status] || styles.queued,
        )}
      >
        <Icon
          className={cn("h-3 w-3", status === "running" && "animate-spin")}
        />
        {status}
      </span>
      <span className="text-[10px] text-slate-500 pl-1">
        {new Date(date).toLocaleDateString()}
      </span>
    </div>
  );
}

function ChartToggle({ active, onClick, icon: Icon }: any) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        "h-7 w-7 rounded",
        active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
      )}
    >
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
    <div className="flex-1 space-y-4 p-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-white/5 rounded-xl border border-white/5"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-[400px] bg-white/5 rounded-xl border border-white/5" />
        <div className="h-[400px] bg-white/5 rounded-xl border border-white/5" />
      </div>
    </div>
  );
}

function getRiskColor(score: number) {
  if (score >= 80) return "text-red-400 bg-red-500/10";
  if (score >= 50) return "text-orange-400 bg-orange-500/10";
  if (score >= 20) return "text-yellow-400 bg-yellow-500/10";
  return "text-blue-400 bg-blue-500/10";
}
