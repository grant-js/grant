'use client';

import { useMemo } from 'react';

import { Group, Permission, Role, User } from '@logusgraphics/grant-schema';
import { Key } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroups } from '@/hooks/groups';
import { useRoles } from '@/hooks/roles';

interface PermissionWithInheritance extends Permission {
  inheritedFromGroup: string;
}

interface UserPermissionsProps {
  user: User;
}

export function UserPermissions({ user }: UserPermissionsProps) {
  const t = useTranslations('user.permissions');
  const scope = useScopeFromParams();

  const roleIds = useMemo(() => user.roles?.map((r) => r.id) || [], [user.roles]);

  const { roles: rolesWithGroups, loading: rolesLoading } = useRoles({
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
  } = useGroups({
    scope: scope!,
    ids: groupIds.length > 0 ? groupIds : [],
    limit: -1,
  });

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

  const loading = rolesLoading || groupsLoading;

  const columns: ColumnConfig<PermissionWithInheritance>[] = [
    {
      key: 'icon',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: () => (
        <div className="flex items-center justify-center">
          <Key className="h-4 w-4 text-muted-foreground" />
        </div>
      ),
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
      key: 'inheritedFrom',
      header: t('table.inheritedFrom'),
      width: '200px',
      render: (permission: PermissionWithInheritance) => (
        <span className="text-sm text-muted-foreground">{permission.inheritedFromGroup}</span>
      ),
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'icon', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'action', type: 'text' },
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
        data={permissionsWithInheritance}
        columns={columns}
        loading={loading}
        emptyState={{
          icon: <Key className="h-12 w-12" />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </div>
  );
}
