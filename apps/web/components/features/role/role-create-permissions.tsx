'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Permission, PermissionSortableField, SortOrder, Tag } from '@grantjs/schema';
import { Key } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

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
import { useDetailTableColumnVisibility, useScopeFromParams } from '@/hooks/common';
import { useGroups } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
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

import { GroupPermissionSearch } from '../group/group-permission-search';
import type { RoleCreateFormValues } from '../roles/role-types';

const CREATE_ROLE_ATTACHMENT_PAGE_LIMIT = 10;

export function RoleCreatePermissions() {
  const t = useTranslations('role.permissions');
  const scope = useScopeFromParams();
  const form = useFormContext<RoleCreateFormValues>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [permissionsAttachmentFilter, setPermissionsAttachmentFilter] = useState<
    'all' | 'selected'
  >('all');

  const selectedGroupIds = form.watch('groupIds') ?? [];
  const directPermissionIdsArray = form.watch('permissionIds') ?? [];

  const directPermissionIds = useMemo(
    () => new Set(directPermissionIdsArray),
    [directPermissionIdsArray]
  );

  const { groups: groupsWithPermissions, loading: groupsLoading } = useGroups({
    scope: scope!,
    ids: selectedGroupIds.length > 0 ? selectedGroupIds : [],
    limit: -1,
  });

  const inheritedFromGroupByPermissionId = useMemo(
    () => buildRolePermissionInheritanceMap(groupsWithPermissions ?? []),
    [groupsWithPermissions]
  );

  const selectedPermissionIds = useMemo(
    () => collectRoleAttachedPermissionIds(directPermissionIds, inheritedFromGroupByPermissionId),
    [directPermissionIds, inheritedFromGroupByPermissionId]
  );

  const permissionQueryIds = useMemo(
    () => resolveDetailQueryIds(permissionsAttachmentFilter, selectedPermissionIds),
    [permissionsAttachmentFilter, selectedPermissionIds]
  );

  const { permissions, loading, error, totalCount, refetch } = usePermissions({
    scope: scope!,
    page,
    limit: CREATE_ROLE_ATTACHMENT_PAGE_LIMIT,
    search,
    sort: { field: PermissionSortableField.Name, order: SortOrder.Asc },
    ids: permissionQueryIds,
  });

  const totalPages = Math.ceil(totalCount / CREATE_ROLE_ATTACHMENT_PAGE_LIMIT);

  const getRowState = useCallback(
    (permissionId: string) =>
      computeRolePermissionRowState(permissionId, {
        directPermissionIds,
        inheritedFromGroupByPermissionId,
      }),
    [directPermissionIds, inheritedFromGroupByPermissionId]
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
        return t('table.sourceViaGroup', { groupName: state.source.label });
      }
      return t('table.sourceDirectAndViaGroup', { groupName: state.source.label });
    },
    [getRowState, t]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

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
            disabled={rowState.disabled}
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
    ]),
    rowCount: 5,
  };

  const tableLoading = loading || groupsLoading;

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
