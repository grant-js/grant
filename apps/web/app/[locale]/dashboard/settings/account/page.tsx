'use client';

import { useMemo } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { AccountDetailsCard } from '@/components/settings/AccountDetailsCard';
import { usePageTitle } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';

export default function AccountSettingsPage() {
  const t = useTranslations('settings.account');
  usePageTitle('settings.account');

  const { getCurrentAccount, accounts } = useAuthStore();
  const currentAccount = getCurrentAccount();

  const accountType: 'personal' | 'organization' = useMemo(() => {
    return currentAccount?.type === AccountType.Personal ? 'personal' : 'organization';
  }, [currentAccount?.type]);

  const hasComplementaryAccount = useMemo(() => {
    if (currentAccount?.type === AccountType.Personal) {
      return accounts.some((acc) => acc.type === AccountType.Organization);
    } else {
      return accounts.some((acc) => acc.type === AccountType.Personal);
    }
  }, [accounts, currentAccount?.type]);

  if (!currentAccount) {
    return (
      <DashboardPageLayout title={t('title')} variant="simple">
        <div className="text-center text-muted-foreground">Loading account data...</div>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <div className="space-y-6">
        <AccountDetailsCard
          accountType={accountType}
          hasComplementaryAccount={hasComplementaryAccount}
          accountCount={accounts.length}
        />
      </div>
    </DashboardPageLayout>
  );
}
