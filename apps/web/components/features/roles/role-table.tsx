'use client';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Role, Tag } from '@grantjs/schema';
import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  ScrollBadges,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useRolesStore } from '@/stores/roles.store';

import { RoleActions } from './role-actions';
import { RoleAudit } from './role-audit';
import { RoleCreateDialog } from './role-create-dialog';

export function RoleTable() {
  const t = useTranslations('roles');

  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const roles = useRolesStore((state) => state.roles);
  const loading = useRolesStore((state) => state.loading);

  const transformGroupsToBadges = (role: Role) => {
    return (role.groups || []).map((group) => ({
      id: group.id,
      label: group.name,
      className: group.tags?.find((tag: Tag) => tag.isPrimary)?.color
        ? getTagBorderClasses(group.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor)
        : undefined,
    }));
  };

  const columns: DataTableColumnConfig<Role>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (role: Role) => (
        <Avatar
          initial={role.name.charAt(0)}
          size="md"
          className={
            role.tags?.find((tag: Tag) => tag.isPrimary)?.color
              ? cn(
                  'border-2',
                  getTagBorderClasses(
                    role.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor
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
      render: (role: Role) => <span className="text-sm font-medium">{role.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      render: (role: Role) => (
        <span className="text-sm text-muted-foreground">
          {role.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'groups',
      header: t('form.groups'),
      width: '200px',
      render: (role: Role) => <ScrollBadges items={transformGroupsToBadges(role)} height={60} />,
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (role: Role) => (
        <ScrollBadges items={transformTagsToBadges(role.tags)} height={60} showAsRound={true} />
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (role: Role) => <RoleAudit role={role} />,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'groups', type: 'list' },
      { key: 'tags', type: 'list' },
      { key: 'audit', type: 'audit' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={roles}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Shield />,
        title: search ? t('noSearchResults.title') : t('noRoles.title'),
        description: search ? t('noSearchResults.description') : t('noRoles.description'),
        action: search ? undefined : <RoleCreateDialog />,
      }}
      actionsColumn={{
        render: (role) => <RoleActions role={role} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
