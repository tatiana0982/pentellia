
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
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Top section title */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your security posture.
        </p>
      </div>

      {/* Attack surface summary */}
      <section className="mb-8">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7 lg:gap-8">
        {/* Vulnerability Summary Chart */}
        <div className="lg:col-span-4">
          <div className="flex items-center justify-between mb-4 h-8">
            <h2 className="text-lg font-semibold text-foreground">
              Vulnerability Summary
            </h2>
            <span className="text-xs text-muted-foreground">
              Workspace overview – last 14 days
            </span>
          </div>
          <div className="bg-card rounded-lg shadow-soft border border-border p-4 h-[350px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 10,
                  bottom: 10,
                }}
              >
                <defs>
                  <linearGradient id="fillLow" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--secondary))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--secondary))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
                  fillOpacity={0.4}
                  stroke="hsl(var(--secondary))"
                  stackId="a"
                />
                <Area
                  dataKey="low"
                  type="natural"
                  fill="url(#fillLow)"
                  fillOpacity={0.4}
                  stroke="hsl(var(--primary))"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* Scan activity */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4 h-8">
            <h2 className="text-lg font-semibold text-foreground">
              Scan Activity
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
            <ActivityCard title="Running scans" value="0" total="2" />
            <ActivityCard title="Waiting scans" value="0" total="25" />
            <ActivityCard title="Scanned assets" value="0" total="5" />
            <ActivityCard title="Added assets" value="1" total="100" />
          </div>
        </div>
      </div>

      {/* Latest scans table */}
      <section className="pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Latest Scans
          </h2>
          <button className="text-sm text-primary hover:underline">
            View scans
          </button>
        </div>

        <div className="bg-card rounded-lg shadow-soft border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Tool</th>
                <th className="px-6 py-3 text-left font-medium">Target</th>
                <th className="px-6 py-3 text-left font-medium">Workspace</th>
                <th className="px-6 py-3 text-left font-medium">Start date</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">View</th>
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

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({label, value}: SummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card p-4 shadow-soft">
      {/* Gradient Border */}
      <div
        className="absolute inset-[-2px] -z-10 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#7C5CFF_0%,#121826_50%,#7C5CFF_100%)] opacity-20 group-hover:opacity-50 transition-opacity duration-300"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-card" />
      
      <div className="relative z-10 flex flex-col justify-between h-full">
        <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          {label}
        </span>
        <span className="mt-6 text-3xl font-medium text-primary">{value}</span>
      </div>
    </div>
  );
}

type ActivityCardProps = {
  title: string;
  value: string;
  total: string;
};

function ActivityCard({title, value, total}: ActivityCardProps) {
  const percentage = (parseInt(value) / parseInt(total)) * 100;
  return (
    <div className="bg-card rounded-lg shadow-soft border border-border p-4 flex flex-col h-full">
      <span className="text-sm text-muted-foreground mb-2">{title}</span>

      <div className="flex items-center justify-center flex-1 my-4">
        <div className="relative h-24 w-24">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle
              className="text-border/50"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
            />
            <circle
              className="text-primary"
              strokeWidth="8"
              strokeDasharray="264"
              strokeDashoffset={264 - (264 * percentage) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-medium text-foreground">
              {value}
            </span>
            <span className="text-xs text-muted-foreground">/ {total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type LegendDotProps = {
  color: string;
  label: string;
};

function LegendDot({color, label}: LegendDotProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 rounded-full"
        style={{backgroundColor: color}}
      />
      <span>{label}</span>
    </div>
  );
}
