'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { useRoles } from '@/hooks/roles';
import { useRolesStore } from '@/stores/roles.store';

import { RoleGeneralCard } from './role-general-card';
import { RoleGroups } from './role-groups';
import { RoleMetadataCard } from './role-metadata-card';
import { RolePermissions } from './role-permissions';
import { RoleTags } from './role-tags';

export function RoleDetailViewer() {
  const t = useTranslations('role');
  const params = useParams();
  const roleId = params.roleId as string;
  const scope = useScopeFromParams();
  const setCurrentRole = useRolesStore((state) => state.setCurrentRole);

  const { roles, loading, error, refetch } = useRoles({
    scope: scope!,
    ids: [roleId],
    limit: 1,
  });

  const role = useMemo(() => roles[0], [roles]);

  useEffect(() => {
    setCurrentRole(role || null);
    return () => {
      setCurrentRole(null);
    };
  }, [role, setCurrentRole]);

  if (loading && !role) {
    return <div>{t('loading.title')}</div>;
  }

  if (error || !role) {
    return <div>{t('loading.error')}</div>;
  }

  return (
    <FeatureDetailLayout>
      <RoleGeneralCard role={role} onAfterRoleMutation={refetch} />
      <RoleMetadataCard role={role} onAfterRoleMutation={refetch} />
      <RoleGroups role={role} />
      <RolePermissions role={role} />
      <RoleTags role={role} />
    </FeatureDetailLayout>
  );
}
