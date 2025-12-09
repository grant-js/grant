'use client';

import { useTranslations } from 'next-intl';

interface UserPermissionsProps {
  userId: string;
}

export function UserPermissions({ userId }: UserPermissionsProps) {
  const t = useTranslations('user.permissions');
  // TODO: Implement user permissions display (through groups)
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
    </div>
  );
}
