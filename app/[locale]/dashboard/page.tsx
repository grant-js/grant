'use client';

import { redirect } from 'next/navigation';
import { useLocale } from 'next-intl';

import { useAuth } from '@/hooks/auth';
import { getRedirectPath } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const currentLocale = useLocale();
  const { currentAccount } = useAuthStore();
  const { logout } = useAuth({ disableAutoRedirect: true });

  if (currentAccount) {
    const redirectTo = getRedirectPath(currentAccount.type, currentAccount.id, currentLocale);
    redirect(redirectTo);
  } else {
    logout();
  }
}
