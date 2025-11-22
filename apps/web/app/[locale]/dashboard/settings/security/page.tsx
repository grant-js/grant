'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { ActiveSessionsList } from '@/components/settings/ActiveSessionsList';
import { AuthenticationMethodsList } from '@/components/settings/AuthenticationMethodsList';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { usePageTitle, useUserMutations } from '@/hooks';
import { useUserAuthenticationMethods } from '@/hooks/users/useUserAuthenticationMethods';
import { useUserSessions } from '@/hooks/users/useUserSessions';
import { getCurrentSessionId } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

export default function SecuritySettingsPage() {
  const t = useTranslations('settings.security');
  usePageTitle('settings.security');

  const { currentAccount } = useAuthStore();
  const { changePassword, revokeUserSession } = useUserMutations();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const userId = currentAccount?.owner?.id;

  const {
    authenticationMethods,
    loading: authMethodsLoading,
    refetch: refetchAuthMethods,
  } = useUserAuthenticationMethods(userId || '', undefined);

  const {
    sessions,
    loading: sessionsLoading,
    refetch: refetchSessions,
  } = useUserSessions(userId || '', {
    limit: 50,
  });

  const currentSessionId = useMemo(() => getCurrentSessionId(), []);

  const emailMethod = authenticationMethods.find((method) => method.provider === 'email');

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    });
    setShowChangePassword(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    await revokeUserSession(sessionId);
    refetchSessions();
  };

  if (!userId) {
    return (
      <DashboardPageLayout title={t('title')} variant="simple">
        <p className="text-muted-foreground">{t('userNotFound')}</p>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout title={t('title')} variant="simple">
      <div className="space-y-6">
        <AuthenticationMethodsList
          methods={authenticationMethods}
          loading={authMethodsLoading}
          onChangePassword={emailMethod ? () => setShowChangePassword(true) : undefined}
        />

        {showChangePassword && (
          <ChangePasswordForm
            onSubmit={handleChangePassword}
            onCancel={() => setShowChangePassword(false)}
          />
        )}

        <ActiveSessionsList
          sessions={sessions}
          loading={sessionsLoading}
          currentSessionId={currentSessionId || undefined}
          onRevokeSession={handleRevokeSession}
        />
      </div>
    </DashboardPageLayout>
  );
}
