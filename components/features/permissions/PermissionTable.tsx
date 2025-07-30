'use client';

import { Key, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScrollBadges } from '@/components/common';
import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { Permission } from '@/graphql/generated/types';
import { getTagBorderColorClasses } from '@/lib/tag-colors';
import { transformTagsToBadges } from '@/lib/tag-utils';

import { CreatePermissionDialog } from './CreatePermissionDialog';
import { PermissionActions } from './PermissionActions';
import { PermissionAudit } from './PermissionAudit';

interface PermissionTableProps {
  limit: number;
  permissions: Permission[];
  loading: boolean;
  search: string;
  onEditClick: (permission: Permission) => void;
  onDeleteClick: (permission: Permission) => void;
}

export function PermissionTable({
  limit,
  permissions,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: PermissionTableProps) {
  const t = useTranslations('permissions');

  const columns: ColumnConfig<Permission>[] = [
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
            permission.tags?.[0]?.color
              ? `border-2 ${getTagBorderColorClasses(permission.tags[0].color)}`
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
      key: 'action',
      header: t('table.action'),
      width: '200px',
      render: (permission: Permission) => (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-muted text-muted-foreground">
          {permission.action}
        </span>
      ),
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
          title=""
          icon={<Tags className="h-3 w-3" />}
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

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
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
        icon: <Key className="h-12 w-12" />,
        title: search ? t('noSearchResults.title') : t('noPermissions.title'),
        description: search ? t('noSearchResults.description') : t('noPermissions.description'),
        action: search ? undefined : <CreatePermissionDialog />,
      }}
      actionsColumn={{
        render: (permission) => (
          <PermissionActions
            permission={permission}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
          />
        ),
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
