'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Group, Role, Tag, User } from '@grantjs/schema';
import { Group as GroupIcon, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  Pagination,
  RefreshButton,
  ScrollBadges,
  Toolbar,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useRoles } from '@/hooks/roles';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

interface GroupWithInheritance extends Group {
  inheritedFromRole: string;
}

interface UserGroupsProps {
  user: User;
}

export function UserGroups({ user }: UserGroupsProps) {
  const t = useTranslations('user.groups');
  const scope = useScopeFromParams();

  const page = useUserStore((state) => state.groupsPage);
  const limit = useUserStore((state) => state.groupsLimit);
  const setPage = useUserStore((state) => state.setGroupsPage);
  const groupsRefetch = useUserStore((state) => state.groupsRefetch);
  const setGroupsRefetch = useUserStore((state) => state.setGroupsRefetch);

  const roleIds = useMemo(() => user.roles?.map((r) => r.id) || [], [user.roles]);

  const { roles, loading, error, refetch } = useRoles({
    scope: scope!,
    ids: roleIds.length > 0 ? roleIds : [],
    limit: -1,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setGroupsRefetch(handleRefetch);
    return () => setGroupsRefetch(null);
  }, [handleRefetch, setGroupsRefetch]);

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

  const paginatedGroups = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return groupsWithInheritance.slice(startIndex, endIndex);
  }, [groupsWithInheritance, page, limit]);

  const totalPages = Math.ceil(groupsWithInheritance.length / limit);

  const columns: DataTableColumnConfig<GroupWithInheritance>[] = [
    {
      key: 'icon',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: (group: GroupWithInheritance) => {
        const primaryTag = group.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <div className="flex items-center justify-center">
            <Avatar
              initial={group.name.charAt(0)}
              size="sm"
              icon={<GroupIcon className="h-3 w-3 text-muted-foreground" />}
              className={
                primaryTag
                  ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                  : undefined
              }
            />
          </div>
        );
      },
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
      width: '250px',
      render: (group: GroupWithInheritance) => (
        <span className="text-sm text-muted-foreground">
          {group.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (group: GroupWithInheritance) => (
        <ScrollBadges items={transformTagsToBadges(group.tags)} height={60} showAsRound={true} />
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

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'icon', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'tags', type: 'text' },
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <Toolbar
          items={[
            <RefreshButton
              key="refresh"
              onRefresh={groupsRefetch ?? undefined}
              loading={loading}
            />,
          ]}
        />
      </div>
      <DataTable
        data={paginatedGroups}
        columns={columns}
        loading={loading}
        emptyState={{
          icon: <Users />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
      {totalPages > 1 && (
        <div className="mt-4 border-t">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
