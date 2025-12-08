import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarProvider,
  Sidebar,
} from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen dark">
        <div className="hidden lg:flex">
            <Sidebar>
                <AppSidebar />
            </Sidebar>
        </div>
        <div className="flex-1 lg:pl-[260px]">
          <Header />
          <main className="mx-auto w-full max-w-6xl p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
