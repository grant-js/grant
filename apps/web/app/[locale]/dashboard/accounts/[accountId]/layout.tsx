'use client';

import { useEffect } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { useLocale } from 'next-intl';

import { PersonalWorkspaceNav } from '@/components/navigation/PersonalWorkspaceNav';
import { useAuthStore } from '@/stores/auth.store';

interface PersonalWorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function PersonalWorkspaceLayout({ children }: PersonalWorkspaceLayoutProps) {
  const { currentAccount, loading } = useAuthStore();
  const currentLocale = useLocale();

  useEffect(() => {
    if (loading) return;
    if (currentAccount && currentAccount.type === AccountType.Organization) {
      window.location.href = `/${currentLocale}/dashboard/organizations`;
    }
  }, [currentLocale, currentAccount, loading]);

  return (
    <div className="flex h-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r bg-background sticky top-[calc(3.5rem+1px)] h-[calc(100vh-3.5rem-1px)]">
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <PersonalWorkspaceNav />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1">{children}</div>
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden large-screen-hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <PersonalWorkspaceNav />
        </div>
      </div>
    </div>
  );
}
