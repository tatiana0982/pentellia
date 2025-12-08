
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const attackSurfaceStats = [
  { label: "IP Addresses", value: "1,234" },
  { label: "Hostnames", value: "567" },
  { label: "Open Ports", value: "8,910" },
  { label: "Protocols", value: "12" },
  { label: "Services", value: "345" },
  { label: "Technologies", value: "67" },
  { label: "Exposed Assets", value: "89" },
];

const scanActivityStats = [
  { label: "Scanned assets", current: 3, total: 5 },
  { label: "Running scans", current: 1, total: 2 },
  { label: "Waiting scans", current: 0, total: 1 },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whats-new">What's new</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Attack Surface Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {attackSurfaceStats.map((stat) => (
                    <Card key={stat.label}>
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground text-center">
                          {stat.label}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-48 rounded-md bg-muted flex items-center justify-center">
                   <div className="flex items-end h-full w-full p-4 gap-2">
                      <Skeleton className="h-3/4 w-1/4 bg-gray-400" />
                      <Skeleton className="h-1/2 w-1/4 bg-gray-400" />
                      <Skeleton className="h-full w-1/4 bg-gray-400" />
                      <Skeleton className="h-2/3 w-1/4 bg-gray-400" />
                   </div>
                </div>
                <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <span>Low</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Scan Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                {scanActivityStats.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center gap-2">
                    <div className="w-32 h-32 rounded-full border-4 border-primary flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold">{stat.current}</div>
                      <div className="text-sm text-muted-foreground">/ {stat.total}</div>
                    </div>
                    <p className="font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
