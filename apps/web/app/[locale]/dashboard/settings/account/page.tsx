'use client';

import { useMemo } from 'react';

import { AccountType } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { AccountDetailsCard } from '@/components/settings/AccountDetailsCard';
import { useAccountMutations, usePageTitle } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';

export default function AccountSettingsPage() {
  const t = useTranslations('settings.account');
  usePageTitle('settings.account');

  const { currentAccount, accounts } = useAuthStore();
  const { updateAccount } = useAccountMutations();

  // Get account data from the current account in the auth store
  const accountData = useMemo(() => {
    if (!currentAccount) {
      return { name: '', slug: '' };
    }
    return {
      name: currentAccount.name,
      slug: currentAccount.slug,
    };
  }, [currentAccount]);

  // Determine account type for display
  const accountType: 'personal' | 'organization' = useMemo(() => {
    return currentAccount?.type === AccountType.Personal ? 'personal' : 'organization';
  }, [currentAccount?.type]);

  // Check if user has a complementary account (e.g., personal has org, or org has personal)
  const hasComplementaryAccount = useMemo(() => {
    if (currentAccount?.type === AccountType.Personal) {
      return accounts.some((acc) => acc.type === AccountType.Organization);
    } else {
      return accounts.some((acc) => acc.type === AccountType.Personal);
    }
  }, [accounts, currentAccount?.type]);

  const handleAccountUpdate = async (values: { name: string; slug: string }) => {
    if (!currentAccount?.id) {
      console.error('No current account to update');
      return;
    }

    // Only send fields that have changed
    const input: { name?: string; slug?: string } = {};

    if (values.name !== currentAccount.name) {
      input.name = values.name;
    }

    if (values.slug !== currentAccount.slug) {
      input.slug = values.slug;
    }

    // Only update if something changed
    if (Object.keys(input).length === 0) {
      return;
    }

    await updateAccount({
      id: currentAccount.id,
      input,
    });
  };


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
          defaultValues={accountData}
          accountId={currentAccount.id}
          onSubmit={handleAccountUpdate}
        />
      </div>
    </DashboardPageLayout>
  );
}
