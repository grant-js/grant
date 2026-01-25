'use client';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Permission, Tag } from '@grantjs/schema';
import { Key } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  ScrollBadges,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionActions } from './permission-actions';
import { PermissionAudit } from './permission-audit';
import { PermissionCreateDialog } from './permission-create-dialog';

export function PermissionTable() {
  const t = useTranslations('permissions');

  const limit = usePermissionsStore((state) => state.limit);
  const search = usePermissionsStore((state) => state.search);
  const permissions = usePermissionsStore((state) => state.permissions);
  const loading = usePermissionsStore((state) => state.loading);

  const columns: DataTableColumnConfig<Permission>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (permission: Permission) => (
        <Avatar
          initial={permission.name.charAt(0)}
          size="md"
          className={
            permission.tags?.find((tag: Tag) => tag.isPrimary)?.color
              ? cn(
                  'border-2',
                  getTagBorderClasses(
                    permission.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor
                  )
                )
              : undefined
          }
        />
      ),
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
      width: '200px',
      render: (permission: Permission) => (
        <ScrollBadges
          items={transformTagsToBadges(permission.tags)}
          height={60}
          showAsRound={true}
        />
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (permission: Permission) => <PermissionAudit permission={permission} />,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'resource', type: 'text' },
      { key: 'action', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'tags', type: 'list' },
      { key: 'audit', type: 'audit' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={permissions}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Key />,
        title: search ? t('noSearchResults.title') : t('noPermissions.title'),
        description: search ? t('noSearchResults.description') : t('noPermissions.description'),
        action: search ? undefined : <PermissionCreateDialog />,
      }}
      actionsColumn={{
        render: (permission) => <PermissionActions permission={permission} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
