'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { Shield } from 'lucide-react';

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
import { useRolesStore } from '@/stores/roles.store';

import { RoleActions } from './role-actions';
import { RoleAudit } from './role-audit';
import { RoleNavigationButton } from './role-navigation-button';

export function RoleTable() {
  const t = useTranslations('roles');
  const tCommon = useTranslations('common');

  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const roles = useRolesStore((state) => state.roles);
  const loading = useRolesStore((state) => state.loading);
  const hideSynthetic = useRolesStore((state) => state.hideSyntheticEntities);

  const visibleRoles = hideSynthetic
    ? roles.filter((role) => !isSyntheticCdmEntity(role.metadata as Record<string, unknown>))
    : roles;

  const columns: DataTableColumnConfig<Role>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (role: Role) => {
        const primaryTag = getPrimaryTagFromEntity(role);
        return (
          <Avatar
            initial={role.name.charAt(0)}
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
      width: '120px',
      render: (role: Role) => (
        <Badge variant="secondary">{t('groupCount', { count: role.groupCount ?? 0 })}</Badge>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '120px',
      render: (role: Role) => (
        <Badge variant="secondary">{tCommon('tagCount', { count: getEntityTagCount(role) })}</Badge>
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (role: Role) => <RoleAudit role={role} />,
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (role: Role) => <RoleNavigationButton role={role} size="sm" round={false} />,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'groups', type: 'text' },
      { key: 'tags', type: 'text' },
      { key: 'audit', type: 'audit' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={visibleRoles}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Shield />,
        title: search ? t('noSearchResults.title') : t('noRoles.title'),
        description: search ? t('noSearchResults.description') : t('noRoles.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="roles"
            label={t('createDialog.trigger')}
            icon={Shield}
            alwaysShowLabel
          />
        ),
      }}
      actionsColumn={{
        render: (role) => <RoleActions role={role} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
