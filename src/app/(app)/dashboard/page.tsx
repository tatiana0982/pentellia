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

import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
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
import Link from "next/link";

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
          value: summaryData.attackSurface[label.toLowerCase().replace(/ /g, '')] || '0',
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

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <Tabs defaultValue="overview" className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="whats-new">What's new</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
          </Tabs>
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
            <Link href="#" className="text-sm text-blue-600 hover:underline">
                Workspace overview
            </Link>
          </div>
      </div>

      <TabsContent value="overview" className="mt-0 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Attack Surface Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {attackSurfaceStats.map((stat) => (
                  <Card key={stat.label} className="min-h-[140px] bg-white border-gray-200 p-4 flex flex-col justify-between rounded-lg">
                      <div>
                        <div className="text-cyan-600">
                          <stat.icon className="h-6 w-6" />
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-blue-600">
                          {stat.value}
                        </div>
                        <p className="text-xs uppercase text-gray-500">
                          {stat.label}
                        </p>
                        <p className="text-xs text-gray-400">
                          {stat.trend}
                        </p>
                      </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
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
                     <div style={{height: `${Math.min(100, (summaryData?.vulnerabilitySummary.critical || 0) * 10)}%`, backgroundColor: 'var(--color-critical)'}} className="w-8 rounded-t-sm" />
                     <div style={{height: `${Math.min(100, (summaryData?.vulnerabilitySummary.high || 0) * 5)}%`, backgroundColor: 'var(--color-high)'}} className="w-8 rounded-t-sm" />
                     <div style={{height: `${Math.min(100, (summaryData?.vulnerabilitySummary.medium || 0) * 2)}%`, backgroundColor: 'var(--color-medium)'}} className="w-8 rounded-t-sm" />
                     <div style={{height: `${Math.min(100, (summaryData?.vulnerabilitySummary.low || 0) * 1)}%`, backgroundColor: 'var(--color-low)'}} className="w-8 rounded-t-sm" />
                </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{backgroundColor: 'var(--color-critical)'}}></span>
                  <span>Critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{backgroundColor: 'var(--color-high)'}}></span>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{backgroundColor: 'var(--color-medium)'}}></span>
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{backgroundColor: 'var(--color-low)'}}></span>
                  <span>Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Scan Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                    <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-blue-200 bg-white">
                        <div className="text-2xl font-bold text-blue-600">{activityData?.scanActivity.scannedAssets}</div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Scanned Assets</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-blue-200 bg-white">
                        <div className="text-2xl font-bold text-blue-600">{activityData?.scanActivity.runningScans}</div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Running Scans</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-blue-200 bg-white">
                        <div className="text-2xl font-bold text-blue-600">{activityData?.scanActivity.waitingScans}</div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Waiting Scans</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
}

    