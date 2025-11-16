'use client';

import { useTranslations } from 'next-intl';

import { ProfileInformationForm } from '@/components/settings/ProfileInformationForm';
import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';

export default function ProfileSettingsPage() {
  const t = useTranslations('settings.profile');
  usePageTitle('settings.profile');

  // Mock data - will be replaced with actual data from API
  const mockProfileData = {
    name: 'John Doe',
  };

  const handleProfileUpdate = async (values: { name: string }) => {
    console.log('Profile update:', values);
    // API integration will be added later
  };

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <ProfileInformationForm defaultValues={mockProfileData} onSubmit={handleProfileUpdate} />
    </DashboardPageLayout>
  );
}
