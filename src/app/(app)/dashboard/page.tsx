
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
import { Activity, AlertTriangle, FileWarning, Target, Bot, ShieldAlert, FileText, Server, Users, Blocks, Settings, Network, Globe, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

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


const vulnerabilitiesBySeverityData = [
    { severity: 'Low', count: 18, fill: 'hsl(var(--chart-1))' },
    { severity: 'Medium', count: 12, fill: 'hsl(var(--chart-2))' },
    { severity: 'High', count: 5, fill: 'hsl(var(--chart-3))' },
    { severity: 'Critical', count: 8, fill: 'hsl(var(--destructive))' },
];

const vulnerabilitiesBySeverityConfig = {
    count: {
        label: "Count"
    },
    low: {
        label: "Low",
        color: "hsl(var(--chart-1))"
    },
    medium: {
        label: "Medium",
        color: "hsl(var(--chart-2))"
    },
    high: {
        label: "High",
        color: "hsl(var(--chart-3))"
    },
    critical: {
        label: "Critical",
        color: "hsl(var(--destructive))"
    }
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard 
          title="Open Critical Findings" 
          metric="8"
          delta="+2"
          deltaType="increase"
          icon={AlertTriangle}
        />
        <KpiCard 
          title="New Assets (7d)" 
          metric="20"
          delta="+5.2%"
          deltaType="increase"
          icon={Target}
        />
        <KpiCard 
          title="Stale Findings (>90d)" 
          metric="14"
          delta="-3"
          deltaType="decrease"
          icon={FileWarning}
        />
        <KpiCard 
          title="Scans Failed (24h)" 
          metric="1"
          delta="+1"
          deltaType="increase"
          icon={ShieldAlert}
        />
         <KpiCard
            title="IP Addresses"
            metric="9"
            delta="+1"
            deltaType="increase"
            icon={Network}
        />
        <KpiCard
            title="Hostnames"
            metric="17"
            delta="+1"
            deltaType="increase"
            icon={Globe}
        />
        <KpiCard
            title="Open Ports"
            metric="34"
            delta="+3"
            deltaType="increase"
            icon={DoorOpen}
        />
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Vulnerabilities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">43</div>
                <p className="text-xs text-muted-foreground">+5 from yesterday</p>
                <div className="mt-2 h-16 w-full">
                    <ChartContainer config={vulnerabilitiesBySeverityConfig} className="h-full w-full">
                        <BarChart
                          accessibilityLayer
                          data={vulnerabilitiesBySeverityData}
                          layout="vertical"
                          margin={{ top: 15, right: 0, left: -20, bottom: 0 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="severity"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                tick={false}
                            />
                            <Bar dataKey="count" radius={4} barSize={8}>
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Exposure Trend</CardTitle>
            <CardDescription>Vulnerabilities discovered over the last 14 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full p-2">
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
                  <defs>
                    <linearGradient id="fillVulnerabilities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
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
                    fill="url(#fillVulnerabilities)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Attack Surface Summary</CardTitle>
                 <CardDescription>Key components of your digital footprint.</CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-2 gap-4 text-sm'>
              <SummaryItem label="IP Addresses" value="1" />
              <SummaryItem label="Hostnames" value="1" />
              <SummaryItem label="Open Ports" value="1" />
              <SummaryItem label="Protocols" value="1" />
              <SummaryItem label="Services" value="0" />
              <SummaryItem label="Technologies" value="9" />
            </CardContent>
        </Card>
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
                <tr className="hover:bg-accent transition-colors">
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
    deltaType: 'increase' | 'decrease';
    icon: React.ElementType;
}

function KpiCard({ title, metric, delta, deltaType, icon: Icon }: KpiCardProps) {
    const deltaColor = deltaType === 'increase' ? 'text-destructive' : 'text-success';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{metric}</div>
                <p className={`text-xs text-muted-foreground`}>
                    <span className={deltaColor}>{delta}</span> from yesterday
                </p>
            </CardContent>
        </Card>
    );
}

type SummaryItemProps = {
    label: string;
    value: string;
}

function SummaryItem({label, value}: SummaryItemProps) {
    return (
        <div className="flex justify-between items-baseline p-2 rounded-md hover:bg-accent">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground">{value}</span>
        </div>
    )
}
