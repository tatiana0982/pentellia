
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <AppSidebar />
      <div className="flex flex-col md:pl-64">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
