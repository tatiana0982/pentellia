
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarProvider,
  Sidebar,
  SidebarRail,
} from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen bg-background">
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <div className="flex-1 flex flex-col transition-all ease-in-out duration-300 lg:pl-12 group-data-[state=expanded]/sidebar-wrapper:lg:pl-[260px]">
          <Header />
          <main className="flex-1 mx-auto w-full max-w-7xl p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
