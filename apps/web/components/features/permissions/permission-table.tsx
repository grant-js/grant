'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { CopyCheck } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  EntityCreateNavigateButton,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import {
  getEntityTagCount,
  getPrimaryTagFromEntity,
  isSyntheticCdmEntity,
} from '@/lib/entity-list';
import { cn } from '@/lib/utils';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionActions } from './permission-actions';
import { PermissionAudit } from './permission-audit';
import { PermissionNavigationButton } from './permission-navigation-button';

export function PermissionTable() {
  const t = useTranslations('permissions');
  const tCommon = useTranslations('common');

  const limit = usePermissionsStore((state) => state.limit);
  const search = usePermissionsStore((state) => state.search);
  const permissions = usePermissionsStore((state) => state.permissions);
  const loading = usePermissionsStore((state) => state.loading);
  const hideSynthetic = usePermissionsStore((state) => state.hideSyntheticEntities);

  const visiblePermissions = hideSynthetic
    ? permissions.filter(
        (permission) => !isSyntheticCdmEntity(permission.metadata as Record<string, unknown>)
      )
    : permissions;

  const columns: DataTableColumnConfig<Permission>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (permission: Permission) => {
        const primaryTag = getPrimaryTagFromEntity(permission);
        return (
          <Avatar
            initial={permission.name.charAt(0)}
            size="md"
            className={
              primaryTag?.color
                ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                : undefined
            }
          />
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (permission: Permission) => (
        <span className="text-sm font-medium">{permission.name}</span>
      ),
    },
    {
      key: 'resource',
      header: t('table.resource'),
      width: '200px',
      render: (permission: Permission) =>
        permission.resource ? (
          <Badge variant="outline">{permission.resource.name}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'action',
      header: t('table.action'),
      width: '200px',
      render: (permission: Permission) => <Badge variant="secondary">{permission.action}</Badge>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      render: (permission: Permission) => (
        <span className="text-sm text-muted-foreground">{permission.description || '-'}</span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '120px',
      render: (permission: Permission) => (
        <Badge variant="secondary">
          {tCommon('tagCount', { count: getEntityTagCount(permission) })}
        </Badge>
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (permission: Permission) => <PermissionAudit permission={permission} />,
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (permission: Permission) => (
        <PermissionNavigationButton permission={permission} size="sm" round={false} />
      ),
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'resource', type: 'text' },
      { key: 'action', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'tags', type: 'text' },
      { key: 'audit', type: 'audit' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={visiblePermissions}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <CopyCheck />,
        title: search ? t('noSearchResults.title') : t('noPermissions.title'),
        description: search ? t('noSearchResults.description') : t('noPermissions.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="permissions"
            label={t('createDialog.trigger')}
            icon={CopyCheck}
            alwaysShowLabel
          />
        ),
      }}
      actionsColumn={{
        render: (permission) => <PermissionActions permission={permission} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
