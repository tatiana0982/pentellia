
'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { Activity, AlertTriangle, FileWarning, Target, ShieldAlert, Network, Globe, DoorOpen, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const exposureTrendData = [
  {date: '2024-07-01', vulnerabilities: 21},
  {date: '2024-07-02', vulnerabilities: 23},
  {date: '2024-07-03', vulnerabilities: 22},
  {date: '2024-07-04', vulnerabilities: 25},
  {date: '2024-07-05', vulnerabilities: 24},
  {date: '2024-07-06', vulnerabilities: 28},
  {date: '2024-07-07', vulnerabilities: 26},
];

const exposureTrendConfig = {
  vulnerabilities: {
    label: 'Vulnerabilities',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <KpiCard 
          title="Open Critical Findings" 
          metric="8"
          delta="+2"
          deltaType="increase"
        />
        <KpiCard 
          title="New Assets (7d)" 
          metric="20"
          delta="+5"
          deltaType="increase"
        />
        <KpiCard 
          title="Stale Findings (>90d)" 
          metric="14"
          delta="-3"
          deltaType="decrease"
        />
        <KpiCard 
          title="Scans Failed (24h)" 
          metric="1"
          delta="+1"
          deltaType="increase"
        />
         <KpiCard
            title="IP Addresses"
            metric="12"
            delta="+1"
            deltaType="increase"
        />
        <KpiCard
            title="Hostnames"
            metric="31"
            delta="+3"
            deltaType="increase"
        />
      </div>
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Exposure Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] w-full p-2">
              <ChartContainer config={exposureTrendConfig} className="h-full w-full">
                <AreaChart
                  accessibilityLayer
                  data={exposureTrendData.concat(exposureTrendData.map(d => ({...d, date: `2024-07-${parseInt(d.date.split('-')[2]) + 7}`})))}
                  margin={{
                    left: -20,
                    right: 20,
                    top: 10,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={30}
                    />
                  <Tooltip
                    cursor={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="vulnerabilities"
                    type="natural"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.4}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <KpiCard title="Open Ports" metric="34" delta="+3" deltaType="increase" />
             <KpiCard title="Vulnerabilities" metric="43" delta="+5" deltaType="increase" />
             <KpiCard title="Services" metric="18" delta="-1" deltaType="decrease" />
             <KpiCard title="Technologies" metric="29" delta="+2" deltaType="increase" />
             <KpiCard title="Exposed Assets" metric="2" delta="0" deltaType="neutral" />
             <KpiCard title="New This Week" metric="7" delta="+1" deltaType="increase" />
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Latest Scans</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-hidden border border-border rounded-lg">
            <table className="w-full text-sm">
                <thead className="bg-white/5">
                <tr className='border-b-0'>
                    <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Tool</th>
                    <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Target</th>
                    <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Workspace</th>
                    <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Start date</th>
                    <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-right font-semibold text-muted-foreground">View</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-border">
                <tr className="transition-colors">
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
                    <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium text-success">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        Completed
                    </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                    <Button variant='link' className='p-0 h-auto text-primary'>View status</Button>
                    </td>
                </tr>
                </tbody>
            </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

type KpiCardProps = {
    title: string;
    metric: string;
    delta: string;
    deltaType: 'increase' | 'decrease' | 'neutral';
}

function KpiCard({ title, metric, delta, deltaType }: KpiCardProps) {
    const isIncrease = deltaType === 'increase';
    const isDecrease = deltaType === 'decrease';
    // For cybersecurity, an increase in findings/assets is often negative (destructive), and a decrease is positive (success).
    const deltaColor = isIncrease ? 'text-destructive' : isDecrease ? 'text-success' : 'text-muted-foreground';
    const DeltaIcon = isIncrease ? ArrowUp : isDecrease ? ArrowDown : null;

    return (
        <Card>
            <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex items-baseline gap-2">
                <div className="text-2xl font-bold">{metric}</div>
                {delta !== "0" && DeltaIcon && (
                    <div className={cn("flex items-center gap-1 text-xs", deltaColor)}>
                        <DeltaIcon className="h-3 w-3" />
                        <span>{delta.replace(/[+-]/g, '')}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
