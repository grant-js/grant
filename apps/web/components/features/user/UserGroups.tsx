'use client';

import { useMemo } from 'react';

import { Group, Role, User } from '@logusgraphics/grant-schema';
import { Group as GroupIcon, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useRoles } from '@/hooks/roles';

interface GroupWithInheritance extends Group {
  inheritedFromRole: string;
}

interface UserGroupsProps {
  user: User;
}

export function UserGroups({ user }: UserGroupsProps) {
  const t = useTranslations('user.groups');
  const scope = useScopeFromParams();

  const roleIds = useMemo(() => user.roles?.map((r) => r.id) || [], [user.roles]);

  const { roles, loading, error } = useRoles({
    scope: scope!,
    ids: roleIds.length > 0 ? roleIds : [],
    limit: -1,
  });

  const groupsWithInheritance = useMemo<GroupWithInheritance[]>(() => {
    if (!roles || roles.length === 0) return [];

    const groupMap = new Map<string, GroupWithInheritance>();

    roles.forEach((role: Role) => {
      role.groups?.forEach((group: Group) => {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, {
            ...group,
            inheritedFromRole: role.name,
          });
        }
      });
    });

    return Array.from(groupMap.values());
  }, [roles]);

  const columns: ColumnConfig<GroupWithInheritance>[] = [
    {
      key: 'icon',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: () => (
        <div className="flex items-center justify-center">
          <GroupIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (group: GroupWithInheritance) => (
        <span className="text-sm font-medium">{group.name}</span>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '300px',
      render: (group: GroupWithInheritance) => (
        <span className="text-sm text-muted-foreground">
          {group.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'inheritedFrom',
      header: t('table.inheritedFrom'),
      width: '200px',
      render: (group: GroupWithInheritance) => (
        <span className="text-sm text-muted-foreground">{group.inheritedFromRole}</span>
      ),
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'icon', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'inheritedFrom', type: 'text' },
    ],
    rowCount: 5,
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <p className="text-sm text-destructive">{t('error')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
      <DataTable
        data={groupsWithInheritance}
        columns={columns}
        loading={loading}
        emptyState={{
          icon: <Users className="h-12 w-12" />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </div>
  );
}
