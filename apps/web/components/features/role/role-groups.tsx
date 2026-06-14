'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Group, Role, Tag } from '@grantjs/schema';
import { Group as GroupIcon, Loader2 } from 'lucide-react';

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
import { useGroups } from '@/hooks/groups';
import { useRoleMutations } from '@/hooks/roles';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useRoleStore } from '@/stores/role.store';

import { RoleGroupSearch } from './role-group-search';

interface RoleGroupsProps {
  role: Role;
}

export function RoleGroups({ role }: RoleGroupsProps) {
  const t = useTranslations('role.groups');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useRoleStore((state) => state.groupsPage);
  const limit = useRoleStore((state) => state.groupsLimit);
  const search = useRoleStore((state) => state.groupsSearch);
  const sort = useRoleStore((state) => state.groupsSort);
  const groupsAttachmentFilter = useRoleStore((state) => state.groupsAttachmentFilter);
  const updatingGroupId = useRoleStore((state) => state.updatingGroupId);
  const optimisticCheckedGroupIds = useRoleStore((state) => state.optimisticCheckedGroupIds);

  const setPage = useRoleStore((state) => state.setGroupsPage);
  const setSearch = useRoleStore((state) => state.setGroupsSearch);
  const setGroupsAttachmentFilter = useRoleStore((state) => state.setGroupsAttachmentFilter);
  const setUpdatingGroupId = useRoleStore((state) => state.setUpdatingGroupId);
  const setOptimisticCheckedGroupIds = useRoleStore((state) => state.setOptimisticCheckedGroupIds);
  const addOptimisticGroupId = useRoleStore((state) => state.addOptimisticGroupId);
  const removeOptimisticGroupId = useRoleStore((state) => state.removeOptimisticGroupId);
  const groupsRefetch = useRoleStore((state) => state.groupsRefetch);
  const setGroupsRefetch = useRoleStore((state) => state.setGroupsRefetch);

  const selectedGroupIds = useMemo(
    () => Array.from(optimisticCheckedGroupIds),
    [optimisticCheckedGroupIds]
  );

  const groupQueryIds = useMemo(
    () => resolveDetailQueryIds(groupsAttachmentFilter, selectedGroupIds),
    [groupsAttachmentFilter, selectedGroupIds]
  );

  const { groups, loading, error, totalCount, refetch } = useGroups({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    ids: groupQueryIds,
  });

  const { updateRole } = useRoleMutations();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setGroupsRefetch(handleRefetch);
    return () => setGroupsRefetch(null);
  }, [handleRefetch, setGroupsRefetch]);

  useEffect(() => {
    setOptimisticCheckedGroupIds(new Set(role.groups?.map((g) => g.id) || []));
  }, [role.groups, setOptimisticCheckedGroupIds]);

  const totalPages = Math.ceil(totalCount / limit);

  const isGroupChecked = useCallback(
    (groupId: string) => optimisticCheckedGroupIds.has(groupId),
    [optimisticCheckedGroupIds]
  );

  const debouncedUpdateRoleGroups = useDebounce(
    async (groupId: string, shouldAdd: boolean, currentGroupIds: string[]) => {
      setUpdatingGroupId(groupId);
      try {
        const updatedGroupIds = shouldAdd
          ? [...currentGroupIds, groupId]
          : currentGroupIds.filter((id) => id !== groupId);

        await updateRole(role.id, {
          scope: scope!,
          groupIds: updatedGroupIds,
        });
      } finally {
        setUpdatingGroupId(null);
      }
    },
    300
  );

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const currentGroupIds = Array.from(optimisticCheckedGroupIds);

    if (checked) {
      addOptimisticGroupId(groupId);
    } else {
      removeOptimisticGroupId(groupId);
    }

    debouncedUpdateRoleGroups(groupId, checked, currentGroupIds);
  };

  const columns: DataTableColumnConfig<Group>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
      render: (group: Group) => (
        <DetailTableCheckboxCell>
          <Checkbox
            checked={isGroupChecked(group.id)}
            onCheckedChange={(checked) => handleGroupToggle(group.id, checked === true)}
            disabled={!canUpdate}
          />
        </DetailTableCheckboxCell>
      ),
    },
    {
      key: 'icon',
      header: '',
      ...DETAIL_ICON_COLUMN,
      render: (group: Group) => {
        const primaryTag = group.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <DetailTableIconCell>
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
      render: (group: Group) => <span className="text-sm font-medium">{group.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (group: Group) => (
        <span className="text-sm text-muted-foreground">
          {group.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '180px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (group: Group) => (
        <ScrollBadges items={transformTagsToBadges(group.tags)} height={60} />
      ),
    },
    {
      key: 'loading',
      header: '',
      ...DETAIL_LOADING_COLUMN,
      render: (group: Group) =>
        updatingGroupId === group.id ? (
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
      { key: 'description', type: 'text', ...DETAIL_TEXT_COLUMN },
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
              onRefresh={groupsRefetch ?? undefined}
              loading={loading}
              iconOnly
            />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={groupsAttachmentFilter}
              onChange={setGroupsAttachmentFilter}
            />,
            toolbarGrow(
              <RoleGroupSearch key="search" search={search} onSearchChange={setSearch} grow />
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
        data={groups}
        columns={visibleColumns}
        loading={loading}
        emptyState={{
          icon: <GroupIcon />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
