import { ReactNode } from 'react';

import { DashboardToolbar } from './DashboardToolbar';

interface DashboardPageLayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'simple';
}

export function DashboardPageLayout({
  title,
  actions,
  children,
  footer,
  variant = 'default',
}: DashboardPageLayoutProps) {
  if (variant === 'simple') {
    return (
      <div className="space-y-8 p-4">
        <DashboardToolbar title={title} actions={actions} />
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem-1px)]">
      {/* Sticky Header */}
      <div className="sticky top-[calc(3.5rem+1px)] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4">
          <DashboardToolbar title={title} actions={actions} />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 max-w-screen">{children}</div>

      {/* Sticky Footer */}
      {footer && (
        <div className="sticky bottom-[3.3rem] md:bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
          {footer}
        </div>
      )}
    </div>
  );
}
