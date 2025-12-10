
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/header';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="h-screen bg-[#F5F7FB]">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex pt-16 h-full">
        <AppSidebar isSidebarOpen={isSidebarOpen} />
        <main
          className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 transition-all duration-300 ${
            isSidebarOpen ? 'ml-64' : 'ml-[70px]'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
