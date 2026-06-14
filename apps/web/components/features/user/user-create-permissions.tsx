'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Group, Permission, PermissionSortableField, Role, SortOrder, Tag } from '@grantjs/schema';
import { Key } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

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
import { useDetailTableColumnVisibility } from '@/hooks/common';
import { useProjectUserScope } from '@/hooks/common/use-project-user-scope';
import { useGroups } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useRoles } from '@/hooks/roles';
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

import { GroupPermissionSearch } from '../group/group-permission-search';
import type { UserCreateFormValues } from '../users/user-types';
import {
  USER_DETAIL_CHECKBOX_COLUMN,
  USER_DETAIL_CHECKBOX_SKELETON,
  USER_DETAIL_CONTENT_COLUMN_CLASS,
  USER_DETAIL_ICON_COLUMN,
  USER_DETAIL_ICON_SKELETON,
  USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  USER_DETAIL_TEXT_COLUMN,
  UserDetailTableCheckboxCell,
  UserDetailTableIconCell,
} from './user-detail-table-layout';

const CREATE_USER_ATTACHMENT_PAGE_LIMIT = 10;

export function UserCreatePermissions() {
  const t = useTranslations('user.permissions');
  const scope = useProjectUserScope();
  const form = useFormContext<UserCreateFormValues>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [permissionsAttachmentFilter, setPermissionsAttachmentFilter] = useState<
    'all' | 'selected'
  >('all');

  const selectedRoleIds = form.watch('roleIds') ?? [];
  const directGroupIdsArray = form.watch('groupIds') ?? [];
  const directPermissionIdsArray = form.watch('permissionIds') ?? [];

  const directPermissionIds = useMemo(
    () => new Set(directPermissionIdsArray),
    [directPermissionIdsArray]
  );

  const { roles: rolesWithRelations, loading: rolesLoading } = useRoles({
    scope: scope!,
    ids: selectedRoleIds.length > 0 ? selectedRoleIds : [],
    limit: -1,
  });

  const inheritedGroupIds = useMemo(() => {
    const ids = new Set<string>(directGroupIdsArray);
    (rolesWithRelations ?? []).forEach((role: Role) => {
      role.groups?.forEach((group: Group) => ids.add(group.id));
    });
    return Array.from(ids);
  }, [rolesWithRelations, directGroupIdsArray]);

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
        directPermissionIds,
        inheritedFromGroupByPermissionId,
        inheritedFromRoleByPermissionId
      ),
    [directPermissionIds, inheritedFromGroupByPermissionId, inheritedFromRoleByPermissionId]
  );

  const permissionQueryIds = useMemo(
    () => resolveDetailQueryIds(permissionsAttachmentFilter, selectedPermissionIds),
    [permissionsAttachmentFilter, selectedPermissionIds]
  );

  const { permissions, loading, error, totalCount, refetch } = usePermissions({
    scope: scope!,
    page,
    limit: CREATE_USER_ATTACHMENT_PAGE_LIMIT,
    search,
    sort: { field: PermissionSortableField.Name, order: SortOrder.Asc },
    ids: permissionQueryIds,
  });

  const totalPages = Math.ceil(totalCount / CREATE_USER_ATTACHMENT_PAGE_LIMIT);

  const getRowState = useCallback(
    (permissionId: string) =>
      computeUserPermissionRowState(permissionId, {
        directPermissionIds,
        inheritedFromGroupByPermissionId,
        inheritedFromRoleByPermissionId,
      }),
    [directPermissionIds, inheritedFromGroupByPermissionId, inheritedFromRoleByPermissionId]
  );

  const handlePermissionToggle = useCallback(
    (permissionId: string, checked: boolean) => {
      const rowState = getRowState(permissionId);
      if (rowState.disabled) return;

      const currentDirectIds = form.getValues('permissionIds') ?? [];
      const nextDirectIds = checked
        ? [...currentDirectIds, permissionId]
        : currentDirectIds.filter((id) => id !== permissionId);

      form.setValue('permissionIds', nextDirectIds, { shouldDirty: true });
    },
    [form, getRowState]
  );

  const formatSourceLabel = useCallback(
    (permissionId: string) => {
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
    },
    [getRowState, inheritedFromGroupByPermissionId, t]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

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
            disabled={rowState.disabled}
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
    ]),
    rowCount: 5,
  };

  const tableLoading = loading || rolesLoading || groupsLoading;

  if (!scope) {
    return null;
  }

  if (error) {
    return (
      <FeatureModuleCard title={t('title')} collapsible>
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
              onRefresh={() => refetch()}
              loading={tableLoading}
              iconOnly
            />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={permissionsAttachmentFilter}
              onChange={setPermissionsAttachmentFilter}
            />,
            toolbarGrow(
              <GroupPermissionSearch
                key="search"
                search={search}
                onSearchChange={handleSearchChange}
                grow
              />
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
