'use client';

import { useMemo } from 'react';

import { AccountType } from '@grantjs/schema';
import { useTranslations } from 'next-intl';

import { SettingAccountDetailsCard } from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
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
      <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
        <div className="text-center text-muted-foreground">Loading account data...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <div className="space-y-6">
        <SettingAccountDetailsCard
          accountType={accountType}
          hasComplementaryAccount={hasComplementaryAccount}
          accountCount={accounts.length}
        />
      </div>
    </DashboardLayout>
  );
}
