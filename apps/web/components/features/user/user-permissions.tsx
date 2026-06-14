'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Group, Permission, Role, Tag, User } from '@grantjs/schema';
import { Key, Loader2 } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  DataTableColumnToggle,
  DetailAttachmentFilterToggle,
  FeatureModuleCard,
  FieldInfoPopover,
  Pagination,
  RefreshButton,
  ScrollBadges,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDebounce, useDetailTableColumnVisibility } from '@/hooks/common';
import { useProjectUserScope } from '@/hooks/common/use-project-user-scope';
import { useGroups } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useRoles } from '@/hooks/roles';
import { useUserPermissionMutations } from '@/hooks/users/use-user-permission-mutations';
import {
  collectAttachedPermissionIds,
  resolveDetailQueryIds,
} from '@/lib/detail-attachment-filter';
import {
  buildUserPermissionInheritanceMaps,
  computeUserPermissionRowState,
} from '@/lib/rbac-relationship-state';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

import { GroupPermissionSearch } from '../group/group-permission-search';
import {
  USER_DETAIL_CHECKBOX_COLUMN,
  USER_DETAIL_CHECKBOX_SKELETON,
  USER_DETAIL_CONTENT_COLUMN_CLASS,
  USER_DETAIL_ICON_COLUMN,
  USER_DETAIL_ICON_SKELETON,
  USER_DETAIL_LOADING_COLUMN,
  USER_DETAIL_LOADING_SKELETON,
  USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  USER_DETAIL_TEXT_COLUMN,
  UserDetailTableCheckboxCell,
  UserDetailTableIconCell,
} from './user-detail-table-layout';

interface UserPermissionsProps {
  user: User;
}

export function UserPermissions({ user }: UserPermissionsProps) {
  const t = useTranslations('user.permissions');
  const scope = useProjectUserScope();

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useUserStore((state) => state.permissionsPage);
  const limit = useUserStore((state) => state.permissionsLimit);
  const search = useUserStore((state) => state.permissionsSearch);
  const sort = useUserStore((state) => state.permissionsSort);
  const permissionsAttachmentFilter = useUserStore((state) => state.permissionsAttachmentFilter);
  const updatingPermissionId = useUserStore((state) => state.updatingPermissionId);
  const optimisticDirectPermissionIds = useUserStore(
    (state) => state.optimisticDirectPermissionIds
  );

  const setPage = useUserStore((state) => state.setPermissionsPage);
  const setSearch = useUserStore((state) => state.setPermissionsSearch);
  const setPermissionsAttachmentFilter = useUserStore(
    (state) => state.setPermissionsAttachmentFilter
  );
  const setUpdatingPermissionId = useUserStore((state) => state.setUpdatingPermissionId);
  const setOptimisticDirectPermissionIds = useUserStore(
    (state) => state.setOptimisticDirectPermissionIds
  );
  const addOptimisticDirectPermissionId = useUserStore(
    (state) => state.addOptimisticDirectPermissionId
  );
  const removeOptimisticDirectPermissionId = useUserStore(
    (state) => state.removeOptimisticDirectPermissionId
  );
  const permissionsRefetch = useUserStore((state) => state.permissionsRefetch);
  const setPermissionsRefetch = useUserStore((state) => state.setPermissionsRefetch);

  const roleIds = useMemo(() => user.roles?.map((r) => r.id) || [], [user.roles]);

  const { roles: rolesWithRelations, loading: rolesLoading } = useRoles({
    scope: scope!,
    ids: roleIds.length > 0 ? roleIds : [],
    limit: -1,
  });

  const inheritedGroupIds = useMemo(() => {
    const ids = new Set<string>();
    (rolesWithRelations ?? []).forEach((role: Role) => {
      role.groups?.forEach((group: Group) => ids.add(group.id));
    });
    user.userGroups?.forEach((ug) => ids.add(ug.groupId));
    return Array.from(ids);
  }, [rolesWithRelations, user.userGroups]);

  const { groups: groupsWithPermissions, loading: groupsLoading } = useGroups({
    scope: scope!,
    ids: inheritedGroupIds.length > 0 ? inheritedGroupIds : [],
    limit: -1,
  });

  const { inheritedFromGroupByPermissionId, inheritedFromRoleByPermissionId } = useMemo(
    () => buildUserPermissionInheritanceMaps(rolesWithRelations ?? [], groupsWithPermissions ?? []),
    [rolesWithRelations, groupsWithPermissions]
  );

  const selectedPermissionIds = useMemo(
    () =>
      collectAttachedPermissionIds(
        optimisticDirectPermissionIds,
        inheritedFromGroupByPermissionId,
        inheritedFromRoleByPermissionId
      ),
    [
      optimisticDirectPermissionIds,
      inheritedFromGroupByPermissionId,
      inheritedFromRoleByPermissionId,
    ]
  );

  const permissionQueryIds = useMemo(
    () => resolveDetailQueryIds(permissionsAttachmentFilter, selectedPermissionIds),
    [permissionsAttachmentFilter, selectedPermissionIds]
  );

  const { permissions, loading, error, totalCount, refetch } = usePermissions({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    ids: permissionQueryIds,
  });

  const { assignUserPermission, revokeUserPermission } = useUserPermissionMutations();

  useEffect(() => {
    setOptimisticDirectPermissionIds(
      new Set(user.userPermissions?.map((up) => up.permissionId) || [])
    );
  }, [user.userPermissions, setOptimisticDirectPermissionIds]);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setPermissionsRefetch(handleRefetch);
    return () => setPermissionsRefetch(null);
  }, [handleRefetch, setPermissionsRefetch]);

  const totalPages = Math.ceil(totalCount / limit);

  const getRowState = useCallback(
    (permissionId: string) =>
      computeUserPermissionRowState(permissionId, {
        directPermissionIds: optimisticDirectPermissionIds,
        inheritedFromGroupByPermissionId,
        inheritedFromRoleByPermissionId,
      }),
    [
      optimisticDirectPermissionIds,
      inheritedFromGroupByPermissionId,
      inheritedFromRoleByPermissionId,
    ]
  );

  const debouncedToggleDirectPermission = useDebounce(
    async (permissionId: string, shouldAssign: boolean) => {
      if (!user) return;

      setUpdatingPermissionId(permissionId);
      try {
        if (shouldAssign) {
          await assignUserPermission({ userId: user.id, permissionId, scope: scope! });
        } else {
          await revokeUserPermission({ userId: user.id, permissionId, scope: scope! });
        }
      } finally {
        setUpdatingPermissionId(null);
      }
    },
    300
  );

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    const rowState = getRowState(permissionId);
    if (rowState.disabled) return;

    if (checked) {
      addOptimisticDirectPermissionId(permissionId);
    } else {
      removeOptimisticDirectPermissionId(permissionId);
    }

    debouncedToggleDirectPermission(permissionId, checked);
  };

  const formatSourceLabel = (permissionId: string) => {
    const state = getRowState(permissionId);
    if (!state.source) return null;
    if (state.source.kind === 'direct' && state.source.label === 'direct') {
      return t('table.sourceDirect');
    }
    if (state.source.kind === 'inherited') {
      const fromGroup = inheritedFromGroupByPermissionId.get(permissionId);
      if (fromGroup) {
        return t('table.sourceViaGroup', { groupName: fromGroup });
      }
      return t('table.sourceViaRole', { roleName: state.source.label });
    }
    return t('table.sourceDirectAndInherited', { name: state.source.label });
  };

  const columns: DataTableColumnConfig<Permission>[] = [
    {
      key: 'checkbox',
      header: '',
      ...USER_DETAIL_CHECKBOX_COLUMN,
      render: (permission: Permission) => {
        const rowState = getRowState(permission.id);
        const checkbox = (
          <Checkbox
            checked={rowState.checked}
            onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked === true)}
            disabled={!canUpdate || rowState.disabled}
          />
        );

        if (rowState.disabled) {
          return (
            <UserDetailTableCheckboxCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{checkbox}</span>
                  </TooltipTrigger>
                  <TooltipContent>{formatSourceLabel(permission.id)}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </UserDetailTableCheckboxCell>
          );
        }

        return <UserDetailTableCheckboxCell>{checkbox}</UserDetailTableCheckboxCell>;
      },
    },
    {
      key: 'icon',
      header: '',
      ...USER_DETAIL_ICON_COLUMN,
      render: (permission: Permission) => {
        const primaryTag = permission.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <UserDetailTableIconCell>
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
          </UserDetailTableIconCell>
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (permission: Permission) => (
        <span className="text-sm font-medium">{permission.name}</span>
      ),
    },
    {
      key: 'action',
      header: t('table.action'),
      width: '200px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (permission: Permission) => (
        <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
          {permission.action}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '180px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (permission: Permission) => (
        <ScrollBadges items={transformTagsToBadges(permission.tags)} height={60} />
      ),
    },
    {
      key: 'source',
      header: t('table.source'),
      width: '200px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (permission: Permission) => {
        const label = formatSourceLabel(permission.id);
        return label ? (
          <span className="text-sm text-muted-foreground">{label}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      key: 'loading',
      header: '',
      ...USER_DETAIL_LOADING_COLUMN,
      render: (permission: Permission) =>
        updatingPermissionId === permission.id ? (
          <UserDetailTableIconCell>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </UserDetailTableIconCell>
        ) : null,
    },
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      USER_DETAIL_CHECKBOX_SKELETON,
      USER_DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'action', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'tags', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'source', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      USER_DETAIL_LOADING_SKELETON,
    ]),
    rowCount: 5,
  };

  const tableLoading = loading || rolesLoading || groupsLoading;

  if (error) {
    return (
      <FeatureModuleCard title={t('title')}>
        <p className="text-sm text-destructive">{t('error')}</p>
      </FeatureModuleCard>
    );
  }

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      titleAdornment={
        <FieldInfoPopover
          description={t('descriptionInfo')}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
      collapsible
      toolbar={
        <Toolbar
          fullWidth
          alwaysRow
          items={[
            <RefreshButton
              key="refresh"
              onRefresh={permissionsRefetch ?? undefined}
              loading={tableLoading}
              iconOnly
            />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={permissionsAttachmentFilter}
              onChange={setPermissionsAttachmentFilter}
            />,
            toolbarGrow(
              <GroupPermissionSearch key="search" search={search} onSearchChange={setSearch} grow />
            ),
            <DataTableColumnToggle
              key="columns"
              columns={columnToggleItems}
              onToggle={toggleColumn}
            />,
          ]}
        />
      }
      footer={
        totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        ) : undefined
      }
    >
      <DataTable
        data={permissions}
        columns={visibleColumns}
        loading={tableLoading}
        emptyState={{
          icon: <Key />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
