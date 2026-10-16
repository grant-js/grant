'use client';

import { useEffect } from 'react';

import { useIsAccountless } from '@/hooks/accounts';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ACCOUNTLESS_HOME } from '@/lib/accountless';
import { useAuthStore } from '@/stores/auth.store';

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const accountsLoaded = useAuthStore((state) => state.accountsLoaded);
  const isAccountless = useIsAccountless();

  useEffect(() => {
    const hub = '/dashboard/settings';
    const normalized = pathname.replace(/\/$/, '') || '/';
    if (normalized !== hub) return;
    // Wait until the server has said whether there is an account to show.
    if (!accountsLoaded) return;
    router.replace(isAccountless ? ACCOUNTLESS_HOME : '/dashboard/settings/account');
  }, [accountsLoaded, isAccountless, pathname, router]);

  return null;
}
