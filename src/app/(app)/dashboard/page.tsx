"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  FileText,
  Fingerprint,
  Globe,
  HardDrive,
  Loader2,
  Network,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AttackSurfaceStat = {
  label: string;
  value: string;
  trend: string;
  icon: React.ElementType;
};

type VulnerabilitySummary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type ScanActivityData = {
  scannedAssets: number;
  runningScans: number;
  waitingScans: number;
  totalAssets: number;
};

type SummaryData = {
  attackSurface: { [key: string]: string };
  vulnerabilitySummary: VulnerabilitySummary;
};

type ActivityData = {
  scanActivity: ScanActivityData;
};

const iconMap: { [key: string]: React.ElementType } = {
  "IP Addresses": Globe,
  Hostnames: Server,
  "Open Ports": Zap,
  Protocols: Network,
  Services: Radio,
  Technologies: HardDrive,
  "Exposed Assets": AlertCircle,
  "New This Week": Fingerprint,
};

const attackSurfaceOrder = [
  "IP Addresses",
  "Hostnames",
  "Open Ports",
  "Protocols",
  "Services",
  "Technologies",
  "Exposed Assets",
  "New This Week",
];

export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, activityRes] = await Promise.all([
          fetch("/api/dashboard/summary"),
          fetch("/api/dashboard/activity"),
        ]);

        if (!summaryRes.ok || !activityRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const summary = await summaryRes.json();
        const activity = await activityRes.json();

        setSummaryData(summary);
        setActivityData(activity);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard. Please refresh.",
        });
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };

    fetchData();
  }, [toast]);

  const attackSurfaceStats: AttackSurfaceStat[] = summaryData
    ? attackSurfaceOrder
        .map((label) => ({
          label,
          value:
            summaryData.attackSurface[
              label.toLowerCase().replace(/ /g, "")
            ] || "0",
          icon: iconMap[label] || Fingerprint,
          trend: "+2 from last week", // mock trend data
        }))
    : [];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const getBarHeight = (value: number, max: number) => {
    return `${Math.min(100, (value / max) * 100)}%`;
  };

  const vulnSummary = summaryData?.vulnerabilitySummary;
  const maxVuln = Math.max(
    vulnSummary?.critical || 0,
    vulnSummary?.high || 0,
    vulnSummary?.medium || 0,
    vulnSummary?.low || 0,
    1
  );

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="whats-new">What's new</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-4">
            <Select defaultValue="30">
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Link href="#" className="text-sm text-primary hover:underline">
              Workspace overview
            </Link>
          </div>
        </div>
        
        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Attack Surface Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {attackSurfaceStats.map((stat) => (
                    <Card
                      key={stat.label}
                      className="p-4 flex flex-col justify-between rounded-lg"
                    >
                      <div className="flex justify-end text-muted-foreground">
                        <stat.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-foreground">
                          {stat.value}
                        </div>
                        <p className="text-xs uppercase text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.trend}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">
                  Vulnerability summary
                </CardTitle>
                <Select defaultValue="30">
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end justify-center gap-4">
                  <div
                    style={{ height: getBarHeight(vulnSummary?.critical || 0, maxVuln) }}
                    className="w-8 rounded-t-sm bg-red-500/70"
                  />
                  <div
                    style={{ height: getBarHeight(vulnSummary?.high || 0, maxVuln) }}
                    className="w-8 rounded-t-sm bg-orange-400/70"
                  />
                  <div
                    style={{ height: getBarHeight(vulnSummary?.medium || 0, maxVuln) }}
                    className="w-8 rounded-t-sm bg-yellow-300/70"
                  />
                  <div
                    style={{ height: getBarHeight(vulnSummary?.low || 0, maxVuln) }}
                    className="w-8 rounded-t-sm bg-cyan-500/70"
                  />
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-400"></span>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-yellow-300"></span>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                    <span>Low</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Scan Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-border bg-card">
                    <div className="text-2xl font-bold text-foreground">
                      {activityData?.scanActivity.scannedAssets}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Scanned Assets</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-border bg-card">
                    <div className="text-2xl font-bold text-foreground">
                      {activityData?.scanActivity.runningScans}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Running Scans</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-border bg-card">
                    <div className="text-2xl font-bold text-foreground">
                      {activityData?.scanActivity.waitingScans}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Waiting Scans</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
