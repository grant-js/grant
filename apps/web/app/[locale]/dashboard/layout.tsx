'use client';

import { useEffect, ReactNode } from 'react';

import { EmailVerificationBanner, FullPageLoader } from '@/components/common';
import { useAccountsSync } from '@/hooks/accounts';
import { usePathname } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const {
    email,
    requiresEmailVerification,
    verificationExpiry,
    isSwitchingAccounts,
    setSwitchingAccounts,
  } = useAuthStore();

  useAccountsSync();

  useEffect(() => {
    if (isSwitchingAccounts) {
      setSwitchingAccounts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when pathname changes
  }, [pathname, setSwitchingAccounts]);

  if (isSwitchingAccounts) {
    return <FullPageLoader />;
  }

  return (
    <div className="flex min-w-0 w-full h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {requiresEmailVerification && email && (
          <EmailVerificationBanner email={email} expiresAt={verificationExpiry} />
        )}
        <div className="flex min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
