
'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {ChartConfig} from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const exposureTrendData = [
  {date: '2024-07-01', vulnerabilities: 21, critical: 5, newAssets: 2, riskScore: 45},
  {date: '2024-07-02', vulnerabilities: 23, critical: 6, newAssets: 1, riskScore: 48},
  {date: '2024-07-03', vulnerabilities: 22, critical: 5, newAssets: 3, riskScore: 47},
  {date: '2024-07-04', vulnerabilities: 25, critical: 7, newAssets: 0, riskScore: 51},
  {date: '2024-07-05', vulnerabilities: 24, critical: 6, newAssets: 2, riskScore: 50},
  {date: '2024-07-06', vulnerabilities: 28, critical: 8, newAssets: 1, riskScore: 55},
  {date: '2024-07-07', vulnerabilities: 26, critical: 7, newAssets: 4, riskScore: 52},
];

const complianceTrendData = [
  { month: "Jan", coverage: 75 },
  { month: "Feb", coverage: 78 },
  { month: "Mar", coverage: 82 },
  { month: "Apr", coverage: 80 },
  { month: "May", coverage: 85 },
  { month: "Jun", coverage: 88 },
];


const chartConfig = {
  vulnerabilities: { label: 'Vulnerabilities', color: 'hsl(var(--primary))' },
  critical: { label: 'Critical', color: 'hsl(var(--destructive))' },
  high: { label: 'High', color: 'hsl(var(--warning))' },
  medium: { label: 'Medium', color: 'hsl(var(--secondary))' },
  low: { label: 'Low', color: 'hsl(var(--muted-foreground))' },
  newAssets: { label: 'New Assets', color: 'hsl(var(--secondary))' },
  riskScore: { label: 'Risk Score', color: 'hsl(var(--warning))' },
  coverage: { label: 'Coverage', color: 'hsl(var(--primary))' },
  count: { label: 'Count' },
} satisfies ChartConfig;

const findingsTrendData = [
    { period: 'Previous 7 Days', critical: 12, high: 34 },
    { period: 'Last 24 Hours', critical: 8, high: 21 },
];

const assetRiskData = [
    { risk: 'high', assets: 15, fill: 'var(--color-high)' },
    { risk: 'medium', assets: 45, fill: 'var(--color-medium)' },
    { risk: 'low', assets: 120, fill: 'var(--color-low)' },
]

const vulnerabilityAgeData = [
    { age: '> 30d', count: 18 },
    { age: '> 60d', count: 9 },
    { age: '> 90d', count: 3 },
]

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className='text-base font-semibold'>Exposure KPIs</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4">
             <KpiCard title="Open Critical Findings" metric="8" delta="+2" deltaType="increase" />
             <KpiCard title="Vulnerabilities" metric="43" delta="+5" deltaType="increase" />
             <KpiCard title="Open Ports" metric="34" delta="+3" deltaType="increase" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base font-semibold'>Asset KPIs</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard title="IP Addresses" metric="12" delta="+1" deltaType="increase" />
              <KpiCard title="Hostnames" metric="31" delta="+3" deltaType="increase" />
              <KpiCard title="Technologies" metric="29" delta="+2" deltaType="increase" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base font-semibold'>Operational KPIs</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard title="Scans Failed (24h)" metric="1" delta="+1" deltaType="increase" />
              <KpiCard title="Scan Freshness" metric="3d" delta="-1d" deltaType="decrease" invertDeltaColor/>
              <KpiCard title="New Assets (7d)" metric="20" delta="+5" deltaType="increase" />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Security Posture & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatusIndicator label="Operational Status" value="Live" status="ok" />
            <StatusIndicator label="Scan Coverage" value="94%" status="ok" />
            <StatusIndicator label="NIST CSF Alignment" value="Partial" status="warning" />
            <StatusIndicator label="SLA Health" value="At Risk" status="danger" />

            <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">Control Coverage Trend</p>
                <div className="h-[40px]">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <AreaChart accessibilityLayer data={complianceTrendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillCoverage" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" hideLabel />}
                            />
                            <Area dataKey="coverage" type="natural" fill="url(#fillCoverage)" stroke="hsl(var(--primary))" stackId="a" />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </div>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <Tabs defaultValue="critical" className="h-full w-full">
              <CardHeader className='flex-row items-center justify-between'>
                 <CardTitle>Analytics</CardTitle>
                 <TabsList className="grid w-auto grid-cols-4 h-9">
                    <TabsTrigger value="vulnerabilities" className='text-xs px-2'>Vulnerabilities</TabsTrigger>
                    <TabsTrigger value="critical" className='text-xs px-2'>Critical</TabsTrigger>
                    <TabsTrigger value="assets" className='text-xs px-2'>New Assets</TabsTrigger>
                    <TabsTrigger value="risk" className='text-xs px-2'>Risk Score</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="h-[250px] w-full p-2 pt-4">
                <TabsContent value="vulnerabilities" className='h-full w-full m-0'>
                    <AnalyticsChart dataKey="vulnerabilities" />
                </TabsContent>
                <TabsContent value="critical" className='h-full w-full m-0'>
                    <AnalyticsChart dataKey="critical" />
                </TabsContent>
                <TabsContent value="assets" className='h-full w-full m-0'>
                    <AnalyticsChart dataKey="newAssets" />
                </TabsContent>
                <TabsContent value="risk" className='h-full w-full m-0'>
                    <AnalyticsChart dataKey="riskScore" />
                </TabsContent>
              </CardContent>
            </Tabs>
        </Card>
        
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Comparative Risk Signals</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className='flex flex-col gap-2'>
                    <p className='text-sm text-muted-foreground font-medium'>Findings Trend</p>
                    <div className='h-[200px] w-full'>
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <BarChart data={findingsTrendData} accessibilityLayer margin={{left: -20, right: 20}}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 12}} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} />
                                <Tooltip cursor={{fill: 'hsl(var(--accent))'}} content={<ChartTooltipContent />} />
                                <Legend content={<ChartLegendContent />} />
                                <Bar dataKey="critical" stackId="a" fill="var(--color-critical)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="high" stackId="a" fill="var(--color-high)" radius={[0, 0, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>
                 <div className='flex flex-col gap-2'>
                    <p className='text-sm text-muted-foreground font-medium'>Asset Risk Distribution</p>
                    <div className='h-[200px] w-full flex items-center justify-center'>
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <PieChart>
                                <Tooltip content={<ChartTooltipContent nameKey="assets" hideLabel />} />
                                <Pie data={assetRiskData} dataKey="assets" nameKey='risk' innerRadius={50} outerRadius={80} >
                                     <Legend content={<ChartLegendContent />} />
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </div>
                </div>
                <div className='flex flex-col gap-2'>
                    <p className='text-sm text-muted-foreground font-medium'>Open Vulnerability Age</p>
                    <div className='h-[200px] w-full'>
                         <ChartContainer config={chartConfig} className="w-full h-full">
                            <BarChart data={vulnerabilityAgeData} accessibilityLayer margin={{left: -20, right: 20}}>
                                 <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                                <XAxis dataKey="age" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 12}} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} />
                                <Tooltip cursor={{fill: 'hsl(var(--accent))'}} content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-medium)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>
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
                <tr className="transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-secondary-foreground">
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
                    <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium text-success-foreground bg-success/10 border border-success/20">
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

function AnalyticsChart({ dataKey }: { dataKey: keyof typeof chartConfig }) {
    const color = chartConfig[dataKey].color;
    return (
        <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
                accessibilityLayer
                data={exposureTrendData}
                margin={{ left: 12, right: 12, top: 10, bottom: 10, }}
            >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    tick={{fontSize: 12}}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} tick={{fontSize: 12}} />
                <Tooltip
                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                    dataKey={dataKey}
                    type="natural"
                    fill={color}
                    fillOpacity={0.4}
                    stroke={color}
                    strokeWidth={2}
                />
            </AreaChart>
        </ChartContainer>
    )
}

type KpiCardProps = {
    title: string;
    metric: string;
    delta: string;
    deltaType: 'increase' | 'decrease' | 'neutral';
    invertDeltaColor?: boolean;
}

function KpiCard({ title, metric, delta, deltaType, invertDeltaColor = false }: KpiCardProps) {
    const isIncrease = deltaType === 'increase';
    const isDecrease = deltaType === 'decrease';
    
    let colorClass;
    if (invertDeltaColor) {
        colorClass = isIncrease ? 'text-success' : isDecrease ? 'text-destructive' : 'text-muted-foreground';
    } else {
        colorClass = isIncrease ? 'text-destructive' : isDecrease ? 'text-success' : 'text-muted-foreground';
    }

    const DeltaIcon = isIncrease ? ArrowUp : isDecrease ? ArrowDown : null;

    return (
        <Card className='flex flex-col justify-between'>
            <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex items-baseline justify-between">
                <div className="text-2xl font-bold">{metric}</div>
                {delta !== "0" && DeltaIcon && (
                    <div className={cn("flex items-center gap-1 text-xs", colorClass)}>
                        <DeltaIcon className="h-3 w-3" />
                        <span>{delta.replace(/[+-]/g, '')}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

type StatusIndicatorProps = {
    label: string;
    value: string;
    status: 'ok' | 'warning' | 'danger';
};

function StatusIndicator({ label, value, status }: StatusIndicatorProps) {
    const statusColor = {
        ok: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-destructive',
    };

    return (
        <div className="flex flex-col gap-2 p-4 rounded-lg bg-card border border-border">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', statusColor[status])} />
                <span className="text-lg font-semibold">{value}</span>
            </div>
        </div>
    );
}
    

    


