
'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {ChartConfig} from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BrainCircuit } from 'lucide-react';

const chartData = [
  {date: '2024-07-01', low: 1, medium: 2, high: 0, critical: 1},
  {date: '2024-07-02', low: 2, medium: 3, high: 1, critical: 0},
  {date: '2024-07-03', low: 3, medium: 1, high: 2, critical: 1},
  {date: '2024-07-04', low: 2, medium: 4, high: 1, critical: 0},
  {date: '2024-07-05', low: 4, medium: 2, high: 3, critical: 1},
  {date: '2024-07-06', low: 3, medium: 3, high: 2, critical: 0},
  {date: '2024-07-07', low: 5, medium: 4, high: 1, critical: 2},
  {date: '2024-07-08', low: 4, medium: 3, high: 2, critical: 1},
  {date: '2024-07-09', low: 6, medium: 5, high: 3, critical: 0},
  {date: '2024-07-10', low: 5, medium: 4, high: 2, critical: 1},
  {date: '2024-07-11', low: 7, medium: 6, high: 4, critical: 2},
  {date: '2024-07-12', low: 6, medium: 5, high: 3, critical: 1},
  {date: '2024-07-13', low: 8, medium: 7, high: 5, critical: 2},
  {date: '2024-07-14', low: 7, medium: 6, high: 4, critical: 3},
];

const chartConfig = {
  vulnerabilities: {
    label: 'Vulnerabilities',
  },
  low: {
    label: 'Low',
    color: 'hsl(var(--chart-1))',
  },
  medium: {
    label: 'Medium',
    color: 'hsl(var(--chart-2))',
  },
  high: {
    label: 'High',
    color: 'hsl(var(--chart-3))',
  },
  critical: {
    label: 'Critical',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      {/* Top section title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Security Posture Snapshot</h1>
        <p className="text-muted-foreground">
          An overview of your organization's attack surface and risk exposure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8">
        {/* Exposure Trend Chart */}
        <div className="lg:col-span-3 xl:col-span-3 bg-card rounded-lg shadow-soft border border-border transition-transform duration-200 hover:-translate-y-1">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
              <div className='flex items-center gap-4 h-8'>
                <h2 className="text-lg font-semibold text-foreground">
                  Exposure Trend
                </h2>
                <span className="text-xs font-semibold uppercase tracking-wider bg-accent text-accent-foreground/80 px-2 py-1 rounded-full">AI Insight</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Last 14 days
              </span>
            </div>
            <div className='p-4 h-[350px]'>
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: -20,
                  right: 20,
                  top: 10,
                  bottom: 10,
                }}
              >
                <defs>
                  <linearGradient id="fillLow" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-4))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-4))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                />
                 <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={30}
                  />
                <Tooltip
                  cursor={{stroke: 'hsl(var(--border))', strokeWidth: 2}}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="medium"
                  type="natural"
                  fill="url(#fillMedium)"
                  fillOpacity={0.5}
                  stroke="hsl(var(--chart-2))"
                  stackId="a"
                />
                <Area
                  dataKey="low"
                  type="natural"
                  fill="url(#fillLow)"
                  fillOpacity={0.5}
                  stroke="hsl(var(--chart-1))"
                  stackId="a"
                />
                 <Area
                  dataKey="high"
                  type="natural"
                  fill="url(#fillHigh)"
                  fillOpacity={0.4}
                  stroke="hsl(var(--chart-3))"
                  stackId="a"
                />
                <Area
                  dataKey="critical"
                  type="natural"
                  fill="url(#fillCritical)"
                  fillOpacity={0.4}
                  stroke="hsl(var(--chart-4))"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
            </div>
        </div>
        
        {/* Active Risk Signals */}
        <div className="lg:col-span-1 xl:col-span-1 space-y-8">
            <AiInsightCard />
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                    Active Risk Signals
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-4">
                    <ActivityCard title="Running scans" value="0" />
                    <ActivityCard title="Waiting scans" value="0" />
                    <ActivityCard title="Scanned assets" value="0" />
                    <ActivityCard title="New assets" value="1" />
                </div>
            </div>
        </div>
      </div>
      
      {/* Attack surface summary */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Attack Surface Summary
        </h2>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 xl:grid-cols-6">
          <SummaryCard label="IP ADDRESS" value="1" />
          <SummaryCard label="HOSTNAME" value="1" />
          <SummaryCard label="PORT" value="1" />
          <SummaryCard label="PROTOCOL" value="1" />
          <SummaryCard label="SERVICES" value="0" />
          <SummaryCard label="TECHNOLOGIES" value="9" />
        </div>
      </section>

      {/* Latest scans table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Latest Scans
          </h2>
          <button className="text-sm text-primary hover:underline">
            View all scans
          </button>
        </div>

        <div className="bg-card rounded-lg shadow-soft border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Tool</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Workspace</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Start date</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-secondary">
                  Website Scanner
                </td>
                <td className="px-6 py-4 text-foreground/80">
                  https://www.gohighlevel.com/78486a1
                </td>
                <td className="px-6 py-4 text-foreground/80">My Workspace</td>
                <td className="px-6 py-4 text-foreground/80">
                  Oct 30, 2025 – 20:20
                </td>
                <td className="px-6 py-4">
                   <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success border border-success/20">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Completed
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-primary hover:underline">
                    View status
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* --- Small components to keep things clean --- */

function AiInsightCard() {
    return (
        <div className="relative overflow-hidden rounded-lg bg-card p-4 shadow-soft border border-primary/20 transition-transform duration-200 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-card to-card" />
            <div className="relative">
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                    </div>
                    <div className='flex-1'>
                        <h3 className="text-md font-semibold text-foreground">Potential Risk Cluster Detected</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            An unusual concentration of medium-severity findings has been identified on assets related to the 'legacy-api' tag.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({label, value}: SummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card p-4 shadow-soft border border-border transition-transform duration-200 hover:-translate-y-1">
      <div className="relative z-10 flex flex-col justify-between h-full">
        <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          {label}
        </span>
        <span className="mt-6 text-4xl font-semibold text-primary">{value}</span>
      </div>
    </div>
  );
}

type ActivityCardProps = {
  title: string;
  value: string;
};

function ActivityCard({title, value}: ActivityCardProps) {
  return (
    <div className="bg-card rounded-lg shadow-soft border border-border p-4 flex flex-col h-full transition-transform duration-200 hover:-translate-y-1">
      <span className="text-sm text-muted-foreground mb-2">{title}</span>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-4xl font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

    