'use client';

import { ReactNode } from 'react';

import { EmailVerificationBanner } from '@/components/common';
import { useAccountsSync } from '@/hooks/accounts';
import { useAuthStore } from '@/stores/auth.store';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { email, requiresEmailVerification, verificationExpiry } = useAuthStore();

  useAccountsSync();

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {requiresEmailVerification && email && (
          <EmailVerificationBanner email={email} expiresAt={verificationExpiry} />
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
