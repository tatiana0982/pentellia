
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const attackSurfaceStats = [
  { label: "IP ADDRESS", value: 1 },
  { label: "HOSTNAME", value: 1 },
  { label: "PORT", value: 1 },
  { label: "PROTOCOL", value: 1 },
  { label: "SERVICES", value: 0 },
  { label: "TECHNOLOGIES", value: 9 },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
      </div>
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whats-new">What's new</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-0 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Attack surface summary</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {attackSurfaceStats.map((stat) => (
                <Card key={stat.label} className="bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium uppercase text-gray-500">
                      {stat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
             <h2 className="text-lg font-semibold text-gray-700 mb-4">Scan activity</h2>
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                 <Card className="bg-white shadow-sm">
                     <CardHeader>
                         <CardTitle className="text-sm font-medium text-gray-500">Scanned assets</CardTitle>
                     </CardHeader>
                     <CardContent className="flex flex-col items-center justify-center">
                         <div className="relative h-32 w-32">
                             <svg className="h-full w-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-gray-200" strokeWidth="2"></circle>
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-cyan-500" strokeWidth="2" strokeDasharray="100" strokeDashoffset="100" style={{strokeDashoffset: `calc(100 - (100 * 0) / 100)`}}></circle>
                             </svg>
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-2xl font-bold text-gray-800">0 / 5</span>
                             </div>
                         </div>
                     </CardContent>
                 </Card>
                 <Card className="bg-white shadow-sm">
                     <CardHeader>
                         <CardTitle className="text-sm font-medium text-gray-500">Running scans</CardTitle>
                     </CardHeader>
                     <CardContent className="flex flex-col items-center justify-center">
                         <div className="relative h-32 w-32">
                              <svg className="h-full w-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-gray-200" strokeWidth="2"></circle>
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-cyan-500" strokeWidth="2" strokeDasharray="100" strokeDashoffset="100" style={{strokeDashoffset: `calc(100 - (100 * 0) / 100)`}}></circle>
                             </svg>
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-2xl font-bold text-gray-800">0 / 2</span>
                             </div>
                         </div>
                     </CardContent>
                 </Card>
                 <Card className="bg-white shadow-sm">
                     <CardHeader>
                         <CardTitle className="text-sm font-medium text-gray-500">Waiting scans</CardTitle>
                     </CardHeader>
                     <CardContent className="flex flex-col items-center justify-center">
                         <div className="relative h-32 w-32">
                             <svg className="h-full w-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-gray-200" strokeWidth="2"></circle>
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-cyan-500" strokeWidth="2" strokeDasharray="100" strokeDashoffset="100" style={{strokeDashoffset: `calc(100 - (100 * 0) / 100)`}}></circle>
                              </svg>
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-2xl font-bold text-gray-800">0 / 25</span>
                             </div>
                         </div>
                     </CardContent>
                 </Card>
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
