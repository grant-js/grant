'use client';

import { User } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

interface UserGroupsProps {
  user: User;
}

export function UserGroups({ user: _user }: UserGroupsProps) {
  const t = useTranslations('user.groups');
  // TODO: Implement user groups display (through roles)
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
    </div>
  );
}
