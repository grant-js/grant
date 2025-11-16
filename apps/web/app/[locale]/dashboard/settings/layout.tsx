'use client';

import { SettingsNav } from '@/components/navigation/SettingsNav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex h-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r bg-background sticky top-[calc(3.5rem+1px)] h-[calc(100vh-3.5rem-1px)]">
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <SettingsNav />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1">{children}</div>
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SettingsNav />
        </div>
      </div>
    </div>
  );
}
