'use client';

import { useMemo } from 'react';

import { useApolloClient } from '@apollo/client/react';
import { useTranslations } from 'next-intl';

import { SettingProfileInformationForm } from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { evictAuthCache } from '@/hooks/auth';
import { usePageTitle } from '@/hooks/common';
import { useMyMutations } from '@/hooks/me';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfileSettingsPage() {
  const t = useTranslations('settings.profile');
  usePageTitle('settings.profile');

  const { uploadMyUserPicture, updateMyUser } = useMyMutations();
  const { getCurrentAccount } = useAuthStore();
  const currentAccount = getCurrentAccount();
  const apolloClient = useApolloClient();

  const userData = useMemo(() => {
    return currentAccount?.owner || null;
  }, [currentAccount?.owner]);

  const defaultValues = useMemo(() => {
    if (!userData) {
      return { name: '' };
    }
    return {
      name: userData.name,
    };
  }, [userData]);

  const handleProfileUpdate = async (values: { name: string }) => {
    if (!userData) {
      return;
    }

    await updateMyUser({ name: values.name });
    evictAuthCache(apolloClient.cache);
  };

  const handleUploadPicture = async (file: string, filename: string, contentType: string) => {
    if (!userData) {
      return;
    }

    await uploadMyUserPicture({
      file,
      filename,
      contentType,
    });
    evictAuthCache(apolloClient.cache);
  };

  if (!userData) {
    return (
      <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
        <div className="text-muted-foreground">
          <p>{t('notifications.userNotFound')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <SettingProfileInformationForm
        defaultValues={defaultValues}
        onSubmit={handleProfileUpdate}
        onUploadPicture={handleUploadPicture}
        currentPictureUrl={userData.pictureUrl || undefined}
        currentPictureUpdatedAt={
          userData.updatedAt
            ? userData.updatedAt instanceof Date
              ? userData.updatedAt.toISOString()
              : String(userData.updatedAt)
            : undefined
        }
      />
    </DashboardLayout>
  );
}
