'use client';

import { useTranslations } from 'next-intl';

import { AccountInformationForm } from '@/components/settings/AccountInformationForm';
import { AccountTypeCard } from '@/components/settings/AccountTypeCard';
import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function AccountSettingsPage() {
  const t = useTranslations('settings.account');
  usePageTitle('settings.account');

  // Mock data - will be replaced with actual data from API
  const mockAccountData = {
    name: 'My Account',
    slug: 'my-account',
  };

  const mockAccountType: 'personal' | 'organization' = 'personal';
  const mockHasComplementaryAccount = false;

  const handleAccountUpdate = async (values: { name: string; slug: string }) => {
    console.log('Account update:', values);
    // API integration will be added later
  };

  const handleCreateComplementaryAccount = () => {
    console.log('Create complementary account');
    // Navigation to account creation will be added later
  };

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <div className="space-y-6">
        <AccountInformationForm defaultValues={mockAccountData} onSubmit={handleAccountUpdate} />
        <AccountTypeCard
          accountType={mockAccountType}
          hasComplementaryAccount={mockHasComplementaryAccount}
          onCreateComplementaryAccount={handleCreateComplementaryAccount}
        />
      </div>
    </DashboardPageLayout>
  );
}
