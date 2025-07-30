'use client';

import { Shield, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScrollBadges } from '@/components/common';
import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { Role } from '@/graphql/generated/types';
import { getTagBorderColorClasses } from '@/lib/tag-colors';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { useRolesStore } from '@/stores/roles.store';

import { CreateRoleDialog } from './CreateRoleDialog';
import { RoleActions } from './RoleActions';
import { RoleAudit } from './RoleAudit';

export function RoleTable() {
  const t = useTranslations('roles');

  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const roles = useRolesStore((state) => state.roles);
  const loading = useRolesStore((state) => state.loading);

  const transformGroupsToBadges = (role: Role) => {
    return (role.groups || []).map((group) => ({
      id: group.id,
      label: group.name,
      className: group.tags?.length ? getTagBorderColorClasses(group.tags[0].color) : undefined,
    }));
  };

  const columns: ColumnConfig<Role>[] = [
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
            role.tags?.[0]?.color
              ? `border-2 ${getTagBorderColorClasses(role.tags[0].color)}`
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
      render: (role: Role) => (
        <ScrollBadges
          items={transformGroupsToBadges(role)}
          title=""
          icon={<Shield className="h-3 w-3" />}
          height={60}
        />
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (role: Role) => (
        <ScrollBadges
          items={transformTagsToBadges(role.tags)}
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
      render: (role: Role) => <RoleAudit role={role} />,
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
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
        icon: <Shield className="h-12 w-12" />,
        title: search ? t('noSearchResults.title') : t('noRoles.title'),
        description: search ? t('noSearchResults.description') : t('noRoles.description'),
        action: search ? undefined : <CreateRoleDialog />,
      }}
      actionsColumn={{
        render: (role) => <RoleActions role={role} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
