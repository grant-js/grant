'use client';

import { useMemo } from 'react';

import { useParams } from 'next/navigation';

import { useTranslations } from 'next-intl';

import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useUsers } from '@/hooks/users';

import { UserApiKeys } from './UserApiKeys';
import { UserGroups } from './UserGroups';
import { UserInfo } from './UserInfo';
import { UserPermissions } from './UserPermissions';
import { UserRoles } from './UserRoles';
import { UserTags } from './UserTags';

export function UserDetailViewer() {
  const t = useTranslations('user');
  const params = useParams();
  const userId = params.userId as string;
  const scope = useScopeFromParams();

  const { users, loading, error } = useUsers({
    scope: scope!,
    ids: [userId],
    limit: 1,
  });

  const user = useMemo(() => users[0], [users]);

  if (loading && !user) {
    return <div>{t('loading.title')}</div>;
  }

  if (error || !user) {
    return <div>{t('loading.error')}</div>;
  }

  return (
    <div className="space-y-6">
      <UserInfo user={user} />
      <div className="grid gap-6 md:grid-cols-2">
        <UserRoles userId={user.id} user={user} />
        <UserTags userId={user.id} />
      </div>
      <UserApiKeys userId={user.id} />
      <UserGroups userId={user.id} />
      <UserPermissions userId={user.id} />
    </div>
  );
}
