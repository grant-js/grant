'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ApiKeys } from '@/components/features/api-keys';
import { FeatureDetailLayout } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { useUsers } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { UserGeneralCard } from './user-general-card';
import { UserGroups } from './user-groups';
import { UserMetadataCard } from './user-metadata-card';
import { UserPermissions } from './user-permissions';
import { UserRoles } from './user-roles';
import { UserTags } from './user-tags';

export function UserDetailViewer() {
  const t = useTranslations('user');
  const params = useParams();
  const userId = params.userId as string;
  const scope = useScopeFromParams();
  const setCurrentUser = useUsersStore((state) => state.setCurrentUser);

  const { users, loading, error, refetch } = useUsers({
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
    <FeatureDetailLayout>
      <UserGeneralCard user={user} onAfterUserMutation={refetch} />
      <UserMetadataCard user={user} onAfterUserMutation={refetch} />
      <UserRoles user={user} />
      <UserGroups user={user} />
      <UserPermissions user={user} />
      <ApiKeys />
      <UserTags user={user} />
    </FeatureDetailLayout>
  );
}
