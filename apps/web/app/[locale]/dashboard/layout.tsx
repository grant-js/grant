'use client';

import { ReactNode, useEffect } from 'react';

import { EmailVerificationBanner, FullPageLoader } from '@/components/common';
import { useAccountsSync, useIsAccountless } from '@/hooks/accounts';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ACCOUNTLESS_HOME, isAccountlessAllowedPath } from '@/lib/accountless';
import { useAuthStore } from '@/stores/auth.store';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    email,
    requiresEmailVerification,
    verificationExpiry,
    isSwitchingAccounts,
    setSwitchingAccounts,
  } = useAuthStore();

  useAccountsSync();

  // Signed in without an account (closed install): only user-scoped pages are reachable.
  // Everything account-scoped is refused by the API too; this keeps the console from
  // offering it.
  const isAccountless = useIsAccountless();
  const redirectingAccountless = isAccountless && !isAccountlessAllowedPath(pathname);

  useEffect(() => {
    if (redirectingAccountless) {
      router.replace(ACCOUNTLESS_HOME);
    }
  }, [redirectingAccountless, router]);

  useEffect(() => {
    if (isSwitchingAccounts) {
      setSwitchingAccounts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when pathname changes
  }, [pathname, setSwitchingAccounts]);

  if (isSwitchingAccounts || redirectingAccountless) {
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
