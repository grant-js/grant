'use client';

import { useEffect, useMemo } from 'react';

import { useParams } from 'next/navigation';

import { useTranslations } from 'next-intl';

import { ApiKeys } from '@/components/features/api-keys';
import { useScopeFromParams } from '@/hooks/common';
import { useUsers } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { UserGroups } from './user-groups';
import { UserInfo } from './user-info';
import { UserPermissions } from './user-permissions';
import { UserRoles } from './user-roles';
import { UserTags } from './user-tags';

export function UserDetailViewer() {
  const t = useTranslations('user');
  const params = useParams();
  const userId = params.userId as string;
  const scope = useScopeFromParams();
  const setCurrentUser = useUsersStore((state) => state.setCurrentUser);

  const { users, loading, error } = useUsers({
    scope: scope!,
    ids: [userId],
    limit: 1,
  });

  const user = useMemo(() => users[0], [users]);

  useEffect(() => {
    setCurrentUser(user || null);
    return () => {
      setCurrentUser(null);
    };
  }, [user, setCurrentUser]);

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
        <UserRoles user={user} />
        <UserTags user={user} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <UserGroups user={user} />
        <UserPermissions user={user} />
      </div>
      <ApiKeys />
    </div>
  );
}
