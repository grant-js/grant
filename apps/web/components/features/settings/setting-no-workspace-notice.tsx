'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Shown to a user who is signed in without an account on a closed install: the console has
 * nothing of theirs beyond their own settings and project memberships, and says why.
 */
export function SettingNoWorkspaceNotice() {
  const t = useTranslations('settings.projectMemberships.noWorkspace');

  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription>{t('description')}</AlertDescription>
    </Alert>
  );
}
