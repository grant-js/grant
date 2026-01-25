'use client';

import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useLocale, useTranslations } from 'next-intl';

import {
  SettingActiveSessionsList,
  SettingAuthenticationMethodsList,
  SettingPasswordChangeForm,
} from '@/components/features/settings';
import { DashboardLayout } from '@/components/layout';
import { SettingsSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';
import { useMyMutations, useMyUserAuthenticationMethods, useMyUserSessions } from '@/hooks/me';
import { getCurrentSessionId } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useMeStore } from '@/stores/me.store';

export default function SecuritySettingsPage() {
  const t = useTranslations('settings.security');
  usePageTitle('settings.security');

  const { accessToken, clearAuth } = useAuthStore();
  const { changeMyPassword, revokeMyUserSession } = useMyMutations();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const router = useRouter();
  const locale = useLocale();

  const { authenticationMethods, loading: authMethodsLoading } = useMyUserAuthenticationMethods();

  const sessionsLimit = useMeStore((state) => state.sessionsLimit);

  const {
    sessions,
    loading: sessionsLoading,
    totalCount,
    refetch: refetchSessions,
  } = useMyUserSessions();

  const currentSessionId = useMemo(() => getCurrentSessionId(accessToken!), [accessToken]);

  const emailMethod = authenticationMethods.find((method) => method.provider === 'email');

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    await changeMyPassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    });
    setShowChangePassword(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    await revokeMyUserSession(sessionId);
    if (currentSessionId === sessionId) {
      clearAuth();
      router.push(`/${locale}/auth/login`);
    } else {
      refetchSessions();
    }
  };

  return (
    <DashboardLayout title={t('title')} variant="simple" sidebar={<SettingsSidebar />}>
      <div className="space-y-6">
        <SettingAuthenticationMethodsList
          loading={authMethodsLoading}
          onChangePassword={emailMethod ? () => setShowChangePassword(true) : undefined}
        />

        {showChangePassword && (
          <SettingPasswordChangeForm
            onSubmit={handleChangePassword}
            onCancel={() => setShowChangePassword(false)}
          />
        )}

        <SettingActiveSessionsList
          sessions={sessions}
          loading={sessionsLoading}
          currentSessionId={currentSessionId || undefined}
          onRevokeSession={handleRevokeSession}
          onRefresh={refetchSessions}
          totalCount={totalCount}
          limit={sessionsLimit}
        />
      </div>
    </DashboardLayout>
  );
}
