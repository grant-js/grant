'use client';

import { User } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

interface UserInfoProps {
  user: User;
}

export function UserInfo({ user }: UserInfoProps) {
  const t = useTranslations('user.info');

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-2xl font-semibold">{user.name}</h2>
      <p className="text-sm text-muted-foreground">
        {t('userId')}: {user.id}
      </p>
      <p className="text-sm text-muted-foreground">
        {t('created')}: {new Date(user.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
