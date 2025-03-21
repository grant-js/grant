'use client';

import { ReactNode } from 'react';
import { DashboardNav } from '@/components/DashboardNav';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r bg-background">
        <div className="p-6">
          <DashboardNav />
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
