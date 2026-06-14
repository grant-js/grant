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
  Pagination,
  RefreshButton,
  ScrollBadges,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Checkbox } from '@/components/ui/checkbox';
import { useDetailTableColumnVisibility, useScopeFromParams } from '@/hooks/common';
import { usePermissions } from '@/hooks/permissions';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';

import type { GroupCreateFormValues } from '../groups/group-types';
import { GroupPermissionSearch } from './group-permission-search';

const CREATE_GROUP_ATTACHMENT_PAGE_LIMIT = 10;

export function GroupCreatePermissions() {
  const t = useTranslations('group.permissions');
  const scope = useScopeFromParams();
  const form = useFormContext<GroupCreateFormValues>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [permissionsAttachmentFilter, setPermissionsAttachmentFilter] = useState<
    'all' | 'selected'
  >('all');

  const selectedPermissionIds = form.watch('permissionIds') ?? [];

  const permissionQueryIds = useMemo(
    () => resolveDetailQueryIds(permissionsAttachmentFilter, selectedPermissionIds),
    [permissionsAttachmentFilter, selectedPermissionIds]
  );

  const { permissions, loading, error, totalCount, refetch } = usePermissions({
    scope: scope!,
    page,
    limit: CREATE_GROUP_ATTACHMENT_PAGE_LIMIT,
    search,
    sort: { field: PermissionSortableField.Name, order: SortOrder.Asc },
    ids: permissionQueryIds,
  });

  const totalPages = Math.ceil(totalCount / CREATE_GROUP_ATTACHMENT_PAGE_LIMIT);

  const isPermissionChecked = useCallback(
    (permissionId: string) => selectedPermissionIds.includes(permissionId),
    [selectedPermissionIds]
  );

  const handlePermissionToggle = useCallback(
    (permissionId: string, checked: boolean) => {
      const currentPermissionIds = form.getValues('permissionIds') ?? [];
      const nextPermissionIds = checked
        ? [...currentPermissionIds, permissionId]
        : currentPermissionIds.filter((id) => id !== permissionId);

      form.setValue('permissionIds', nextPermissionIds, { shouldDirty: true });
    },
    [form]
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
      render: (permission: Permission) => (
        <DetailTableCheckboxCell>
          <Checkbox
            checked={isPermissionChecked(permission.id)}
            onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked === true)}
          />
        </DetailTableCheckboxCell>
      ),
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
    ]),
    rowCount: 5,
  };

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
      collapsible
      toolbar={
        <Toolbar
          fullWidth
          alwaysRow
          items={[
            <RefreshButton key="refresh" onRefresh={() => refetch()} loading={loading} iconOnly />,
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
        loading={loading}
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
