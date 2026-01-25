'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Group, Permission, Role, Tag, User } from '@grantjs/schema';
import { Key } from 'lucide-react';
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
import { useGroups } from '@/hooks/groups';
import { useRoles } from '@/hooks/roles';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

interface PermissionWithInheritance extends Permission {
  inheritedFromGroup: string;
}

interface UserPermissionsProps {
  user: User;
}

export function UserPermissions({ user }: UserPermissionsProps) {
  const t = useTranslations('user.permissions');
  const scope = useScopeFromParams();

  const page = useUserStore((state) => state.permissionsPage);
  const limit = useUserStore((state) => state.permissionsLimit);
  const setPage = useUserStore((state) => state.setPermissionsPage);
  const permissionsRefetch = useUserStore((state) => state.permissionsRefetch);
  const setPermissionsRefetch = useUserStore((state) => state.setPermissionsRefetch);

  const roleIds = useMemo(() => user.roles?.map((r) => r.id) || [], [user.roles]);

  const {
    roles: rolesWithGroups,
    loading: rolesLoading,
    refetch: refetchRoles,
  } = useRoles({
    scope: scope!,
    ids: roleIds.length > 0 ? roleIds : [],
    limit: -1,
  });

  const groupIds = useMemo(() => {
    if (!rolesWithGroups || rolesWithGroups.length === 0) return [];
    const ids = new Set<string>();
    rolesWithGroups.forEach((role: Role) => {
      role.groups?.forEach((group: Group) => {
        ids.add(group.id);
      });
    });
    return Array.from(ids);
  }, [rolesWithGroups]);

  const {
    groups,
    loading: groupsLoading,
    error,
    refetch: refetchGroups,
  } = useGroups({
    scope: scope!,
    ids: groupIds.length > 0 ? groupIds : [],
    limit: -1,
  });

  const handleRefetch = useCallback(() => {
    refetchRoles();
    refetchGroups();
  }, [refetchRoles, refetchGroups]);

  useEffect(() => {
    setPermissionsRefetch(handleRefetch);
    return () => setPermissionsRefetch(null);
  }, [handleRefetch, setPermissionsRefetch]);

  const permissionsWithInheritance = useMemo<PermissionWithInheritance[]>(() => {
    if (!groups || groups.length === 0) return [];

    const permissionMap = new Map<string, PermissionWithInheritance>();

    groups.forEach((group: Group) => {
      group.permissions?.forEach((permission: Permission) => {
        if (!permissionMap.has(permission.id)) {
          permissionMap.set(permission.id, {
            ...permission,
            inheritedFromGroup: group.name,
          });
        }
      });
    });

    return Array.from(permissionMap.values());
  }, [groups]);

  const paginatedPermissions = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return permissionsWithInheritance.slice(startIndex, endIndex);
  }, [permissionsWithInheritance, page, limit]);

  const totalPages = Math.ceil(permissionsWithInheritance.length / limit);

  const loading = rolesLoading || groupsLoading;

  const columns: DataTableColumnConfig<PermissionWithInheritance>[] = [
    {
      key: 'icon',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: (permission: PermissionWithInheritance) => {
        const primaryTag = permission.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <div className="flex items-center justify-center">
            <Avatar
              initial={permission.name.charAt(0)}
              size="sm"
              icon={<Key className="h-3 w-3 text-muted-foreground" />}
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
      render: (permission: PermissionWithInheritance) => (
        <span className="text-sm font-medium">{permission.name}</span>
      ),
    },
    {
      key: 'action',
      header: t('table.action'),
      width: '200px',
      render: (permission: PermissionWithInheritance) => (
        <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
          {permission.action}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (permission: PermissionWithInheritance) => (
        <ScrollBadges
          items={transformTagsToBadges(permission.tags)}
          height={60}
          showAsRound={true}
        />
      ),
    },
    {
      key: 'inheritedFrom',
      header: t('table.inheritedFrom'),
      width: '200px',
      render: (permission: PermissionWithInheritance) => (
        <span className="text-sm text-muted-foreground">{permission.inheritedFromGroup}</span>
      ),
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'icon', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'action', type: 'text' },
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
              onRefresh={permissionsRefetch ?? undefined}
              loading={loading}
            />,
          ]}
        />
      </div>
      <DataTable
        data={paginatedPermissions}
        columns={columns}
        loading={loading}
        emptyState={{
          icon: <Key />,
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
