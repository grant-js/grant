'use client';

import { useMemo } from 'react';

import { useApolloClient } from '@apollo/client/react';
import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { ProfileInformationForm } from '@/components/settings/ProfileInformationForm';
import { usePageTitle, useUserMutations } from '@/hooks';
import { evictMeCache } from '@/hooks/auth/cache';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfileSettingsPage() {
  const t = useTranslations('settings.profile');
  usePageTitle('settings.profile');

  const { updateUser, uploadUserPicture } = useUserMutations();
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

    await updateUser(userData.id, { name: values.name });
    evictMeCache(apolloClient.cache);
  };

  const handleUploadPicture = async (file: string, filename: string, contentType: string) => {
    if (!userData) {
      return;
    }

    await uploadUserPicture({
      userId: userData.id,
      file,
      filename,
      contentType,
    });
    evictMeCache(apolloClient.cache);
  };

  if (!userData) {
    return (
      <DashboardPageLayout title={t('title')} variant="simple">
        <div className="text-muted-foreground">
          <p>{t('notifications.userNotFound')}</p>
        </div>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <ProfileInformationForm
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
    </DashboardPageLayout>
  );
}
