'use client';

import { useTranslations } from 'next-intl';

interface UserRolesProps {
  userId: string;
}

export function UserRoles({ userId }: UserRolesProps) {
  const t = useTranslations('user.roles');
  // TODO: Implement user roles display
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('empty')}</p>
    </div>
  );
}
