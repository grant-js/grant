'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout, FeatureDetailSkeleton } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissions } from '@/hooks/permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionConditionCard } from './permission-condition-card';
import { PermissionGeneralCard } from './permission-general-card';
import { PermissionTags } from './permission-tags';

export function PermissionDetailViewer() {
  const t = useTranslations('permission');
  const params = useParams();
  const permissionId = params.permissionId as string;
  const scope = useScopeFromParams();
  const setCurrentPermission = usePermissionsStore((state) => state.setCurrentPermission);

  const { permissions, loading, error, refetch } = usePermissions({
    scope: scope!,
    ids: [permissionId],
    limit: 1,
  });

  const permission = useMemo(() => permissions[0], [permissions]);

  useEffect(() => {
    setCurrentPermission(permission || null);
    return () => {
      setCurrentPermission(null);
    };
  }, [permission, setCurrentPermission]);

  if (loading && !permission) {
    return (
      <FeatureDetailSkeleton
        cards={[
          { showAvatar: true, showFooter: true, rows: 4 },
          { variant: 'json', showFooter: true },
          { variant: 'table', rows: 3, showToolbar: true },
        ]}
      />
    );
  }

  if (error || !permission) {
    return <div>{t('loading.error')}</div>;
  }

  return (
    <FeatureDetailLayout>
      <PermissionGeneralCard permission={permission} onAfterPermissionMutation={refetch} />
      <PermissionConditionCard permission={permission} onAfterPermissionMutation={refetch} />
      <PermissionTags permission={permission} />
    </FeatureDetailLayout>
  );
}
