import { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { CurrentProjectSync } from './current-project-sync';
import { DashboardToolbar } from './dashboard-toolbar';

interface DashboardLayoutProps {
  title: string;
  sidebar?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'simple';
}

export function DashboardLayout({
  sidebar,
  actions,
  children,
  footer,
  variant = 'default',
}: DashboardLayoutProps) {
  if (variant === 'simple') {
    return (
      <SidebarProvider>
        {sidebar ? sidebar : null}
        <SidebarInset>
          <CurrentProjectSync />
          <div className="space-y-8 p-4">
            <DashboardToolbar actions={actions} />
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      {sidebar ? sidebar : null}
      <SidebarInset>
        <CurrentProjectSync />
        <div className="flex min-w-0 flex-col min-h-[calc(100vh-3.5rem-1px)]">
          {/* Sticky Header */}
          <div className="sticky top-[calc(3.5rem+1px)] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="p-4">
              <DashboardToolbar actions={actions} />
            </div>
          </div>

          {/* Content Area: min-w-0 so flex child doesn't expand to table width; overflow-x-hidden so horizontal scroll is only on the table */}
          <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden overflow-y-auto">
            {children}
          </div>

          {/* Sticky Footer */}
          {footer && (
            <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
              {footer}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
