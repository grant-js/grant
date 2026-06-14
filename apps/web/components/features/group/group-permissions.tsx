'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Group, Permission, Tag } from '@grantjs/schema';
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
  Pagination,
  RefreshButton,
  ScrollBadges,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce, useDetailTableColumnVisibility } from '@/hooks/common';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useGroupStore } from '@/stores/group.store';

import { GroupPermissionSearch } from './group-permission-search';

interface GroupPermissionsProps {
  group: Group;
}

export function GroupPermissions({ group }: GroupPermissionsProps) {
  const t = useTranslations('group.permissions');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.Group, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useGroupStore((state) => state.permissionsPage);
  const limit = useGroupStore((state) => state.permissionsLimit);
  const search = useGroupStore((state) => state.permissionsSearch);
  const sort = useGroupStore((state) => state.permissionsSort);
  const permissionsAttachmentFilter = useGroupStore((state) => state.permissionsAttachmentFilter);
  const updatingPermissionId = useGroupStore((state) => state.updatingPermissionId);
  const optimisticCheckedPermissionIds = useGroupStore(
    (state) => state.optimisticCheckedPermissionIds
  );

  const setPage = useGroupStore((state) => state.setPermissionsPage);
  const setSearch = useGroupStore((state) => state.setPermissionsSearch);
  const setPermissionsAttachmentFilter = useGroupStore(
    (state) => state.setPermissionsAttachmentFilter
  );
  const setUpdatingPermissionId = useGroupStore((state) => state.setUpdatingPermissionId);
  const setOptimisticCheckedPermissionIds = useGroupStore(
    (state) => state.setOptimisticCheckedPermissionIds
  );
  const addOptimisticPermissionId = useGroupStore((state) => state.addOptimisticPermissionId);
  const removeOptimisticPermissionId = useGroupStore((state) => state.removeOptimisticPermissionId);
  const permissionsRefetch = useGroupStore((state) => state.permissionsRefetch);
  const setPermissionsRefetch = useGroupStore((state) => state.setPermissionsRefetch);

  const selectedPermissionIds = useMemo(
    () => Array.from(optimisticCheckedPermissionIds),
    [optimisticCheckedPermissionIds]
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

  const { updateGroup } = useGroupMutations();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setPermissionsRefetch(handleRefetch);
    return () => setPermissionsRefetch(null);
  }, [handleRefetch, setPermissionsRefetch]);

  useEffect(() => {
    setOptimisticCheckedPermissionIds(new Set(group.permissions?.map((p) => p.id) || []));
  }, [group.permissions, setOptimisticCheckedPermissionIds]);

  const totalPages = Math.ceil(totalCount / limit);

  const isPermissionChecked = useCallback(
    (permissionId: string) => optimisticCheckedPermissionIds.has(permissionId),
    [optimisticCheckedPermissionIds]
  );

  const debouncedUpdateGroupPermissions = useDebounce(
    async (permissionId: string, shouldAdd: boolean, currentPermissionIds: string[]) => {
      setUpdatingPermissionId(permissionId);
      try {
        const updatedPermissionIds = shouldAdd
          ? [...currentPermissionIds, permissionId]
          : currentPermissionIds.filter((id) => id !== permissionId);

        await updateGroup({
          id: group.id,
          input: {
            scope: scope!,
            permissionIds: updatedPermissionIds,
          },
        });
      } finally {
        setUpdatingPermissionId(null);
      }
    },
    300
  );

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    const currentPermissionIds = Array.from(optimisticCheckedPermissionIds);

    if (checked) {
      addOptimisticPermissionId(permissionId);
    } else {
      removeOptimisticPermissionId(permissionId);
    }

    debouncedUpdateGroupPermissions(permissionId, checked, currentPermissionIds);
  };

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
            disabled={!canUpdate}
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
      DETAIL_LOADING_SKELETON,
    ]),
    rowCount: 5,
  };

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
      collapsible
      toolbar={
        <Toolbar
          fullWidth
          alwaysRow
          items={[
            <RefreshButton
              key="refresh"
              onRefresh={permissionsRefetch ?? undefined}
              loading={loading}
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
