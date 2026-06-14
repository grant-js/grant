'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Permission, Role, Tag } from '@grantjs/schema';
import { Key, Loader2 } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  DataTableColumnToggle,
  DETAIL_CHECKBOX_COLUMN,
  DETAIL_CHECKBOX_SKELETON,
  DETAIL_CONTENT_COLUMN_CLASS,
  DETAIL_ICON_COLUMN,
  DETAIL_ICON_SKELETON,
  DETAIL_LOADING_COLUMN,
  DETAIL_LOADING_SKELETON,
  DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  DETAIL_TEXT_COLUMN,
  DetailAttachmentFilterToggle,
  DetailTableCheckboxCell,
  DetailTableIconCell,
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
import { useScopeFromParams } from '@/hooks/common';
import { useGroups } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useRolePermissionMutations } from '@/hooks/roles/use-role-permission-mutations';
import {
  collectRoleAttachedPermissionIds,
  resolveDetailQueryIds,
} from '@/lib/detail-attachment-filter';
import {
  buildRolePermissionInheritanceMap,
  computeRolePermissionRowState,
} from '@/lib/rbac-relationship-state';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useRoleStore } from '@/stores/role.store';

import { GroupPermissionSearch } from '../group/group-permission-search';

interface RolePermissionsProps {
  role: Role;
}

export function RolePermissions({ role }: RolePermissionsProps) {
  const t = useTranslations('role.permissions');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useRoleStore((state) => state.permissionsPage);
  const limit = useRoleStore((state) => state.permissionsLimit);
  const search = useRoleStore((state) => state.permissionsSearch);
  const sort = useRoleStore((state) => state.permissionsSort);
  const permissionsAttachmentFilter = useRoleStore((state) => state.permissionsAttachmentFilter);
  const updatingPermissionId = useRoleStore((state) => state.updatingPermissionId);
  const optimisticDirectPermissionIds = useRoleStore(
    (state) => state.optimisticDirectPermissionIds
  );

  const setPage = useRoleStore((state) => state.setPermissionsPage);
  const setSearch = useRoleStore((state) => state.setPermissionsSearch);
  const setPermissionsAttachmentFilter = useRoleStore(
    (state) => state.setPermissionsAttachmentFilter
  );
  const setUpdatingPermissionId = useRoleStore((state) => state.setUpdatingPermissionId);
  const setOptimisticDirectPermissionIds = useRoleStore(
    (state) => state.setOptimisticDirectPermissionIds
  );
  const addOptimisticDirectPermissionId = useRoleStore(
    (state) => state.addOptimisticDirectPermissionId
  );
  const removeOptimisticDirectPermissionId = useRoleStore(
    (state) => state.removeOptimisticDirectPermissionId
  );
  const permissionsRefetch = useRoleStore((state) => state.permissionsRefetch);
  const setPermissionsRefetch = useRoleStore((state) => state.setPermissionsRefetch);

  const groupIds = useMemo(() => role.groups?.map((g) => g.id) || [], [role.groups]);

  const { groups: groupsWithPermissions, loading: groupsLoading } = useGroups({
    scope: scope!,
    ids: groupIds.length > 0 ? groupIds : [],
    limit: -1,
  });

  const inheritedFromGroupByPermissionId = useMemo(
    () => buildRolePermissionInheritanceMap(groupsWithPermissions ?? []),
    [groupsWithPermissions]
  );

  const selectedPermissionIds = useMemo(
    () =>
      collectRoleAttachedPermissionIds(
        optimisticDirectPermissionIds,
        inheritedFromGroupByPermissionId
      ),
    [optimisticDirectPermissionIds, inheritedFromGroupByPermissionId]
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

  const { assignRolePermission, revokeRolePermission } = useRolePermissionMutations();

  useEffect(() => {
    setOptimisticDirectPermissionIds(
      new Set(role.rolePermissions?.map((rp) => rp.permissionId) || [])
    );
  }, [role.rolePermissions, setOptimisticDirectPermissionIds]);

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
      computeRolePermissionRowState(permissionId, {
        directPermissionIds: optimisticDirectPermissionIds,
        inheritedFromGroupByPermissionId,
      }),
    [optimisticDirectPermissionIds, inheritedFromGroupByPermissionId]
  );

  const debouncedToggleDirectPermission = useDebounce(
    async (permissionId: string, shouldAssign: boolean) => {
      setUpdatingPermissionId(permissionId);
      try {
        if (shouldAssign) {
          await assignRolePermission({ roleId: role.id, permissionId, scope: scope! });
        } else {
          await revokeRolePermission({ roleId: role.id, permissionId, scope: scope! });
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
      return t('table.sourceViaGroup', { groupName: state.source.label });
    }
    return t('table.sourceDirectAndViaGroup', { groupName: state.source.label });
  };

  const columns: DataTableColumnConfig<Permission>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
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
            <DetailTableCheckboxCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{checkbox}</span>
                  </TooltipTrigger>
                  <TooltipContent>{formatSourceLabel(permission.id)}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DetailTableCheckboxCell>
          );
        }

        return <DetailTableCheckboxCell>{checkbox}</DetailTableCheckboxCell>;
      },
    },
    {
      key: 'icon',
      header: '',
      ...DETAIL_ICON_COLUMN,
      render: (permission: Permission) => {
        const primaryTag = permission.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <DetailTableIconCell>
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
          </DetailTableIconCell>
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (permission: Permission) => (
        <span className="text-sm font-medium">{permission.name}</span>
      ),
    },
    {
      key: 'action',
      header: t('table.action'),
      width: '200px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
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
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (permission: Permission) => (
        <ScrollBadges items={transformTagsToBadges(permission.tags)} height={60} />
      ),
    },
    {
      key: 'source',
      header: t('table.source'),
      width: '200px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
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
      ...DETAIL_LOADING_COLUMN,
      render: (permission: Permission) =>
        updatingPermissionId === permission.id ? (
          <DetailTableIconCell>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </DetailTableIconCell>
        ) : null,
    },
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      DETAIL_CHECKBOX_SKELETON,
      DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'action', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'tags', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'source', type: 'text', ...DETAIL_TEXT_COLUMN },
      DETAIL_LOADING_SKELETON,
    ]),
    rowCount: 5,
  };

  const tableLoading = loading || groupsLoading;

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
          description={t('description')}
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
