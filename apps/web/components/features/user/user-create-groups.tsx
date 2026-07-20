'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Group, GroupSortableField, SortOrder, Tag } from '@grantjs/schema';
import { Group as GroupIcon, Users } from 'lucide-react';
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
import { useGroupsList } from '@/hooks/groups';
import { useRoles } from '@/hooks/roles';
import { collectAttachedGroupIds, resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import {
  buildInheritedFromRoleByGroupId,
  computeUserGroupRowState,
} from '@/lib/rbac-relationship-state';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';

import { RoleGroupSearch } from '../role/role-group-search';
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

export function UserCreateGroups() {
  const t = useTranslations('user.groups');
  const scope = useProjectUserScope();
  const form = useFormContext<UserCreateFormValues>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groupsAttachmentFilter, setGroupsAttachmentFilter] = useState<'all' | 'selected'>('all');

  const selectedRoleIds = form.watch('roleIds') ?? [];
  const directGroupIdsArray = form.watch('groupIds') ?? [];

  const directGroupIds = useMemo(() => new Set(directGroupIdsArray), [directGroupIdsArray]);

  const { roles: rolesWithGroups, loading: rolesLoading } = useRoles({
    scope: scope!,
    ids: selectedRoleIds.length > 0 ? selectedRoleIds : [],
    limit: -1,
  });

  const inheritedFromRoleByGroupId = useMemo(
    () => buildInheritedFromRoleByGroupId(rolesWithGroups ?? []),
    [rolesWithGroups]
  );

  const selectedGroupIds = useMemo(
    () => collectAttachedGroupIds(directGroupIds, inheritedFromRoleByGroupId),
    [directGroupIds, inheritedFromRoleByGroupId]
  );

  const groupQueryIds = useMemo(
    () => resolveDetailQueryIds(groupsAttachmentFilter, selectedGroupIds),
    [groupsAttachmentFilter, selectedGroupIds]
  );

  const { groups, loading, error, totalCount, refetch } = useGroupsList({
    scope: scope!,
    page,
    limit: CREATE_USER_ATTACHMENT_PAGE_LIMIT,
    search,
    sort: { field: GroupSortableField.Name, order: SortOrder.Asc },
    ids: groupQueryIds,
  });

  const totalPages = Math.ceil(totalCount / CREATE_USER_ATTACHMENT_PAGE_LIMIT);

  const getRowState = useCallback(
    (groupId: string) =>
      computeUserGroupRowState(groupId, {
        directGroupIds,
        inheritedFromRoleByGroupId,
      }),
    [directGroupIds, inheritedFromRoleByGroupId]
  );

  const handleGroupToggle = useCallback(
    (groupId: string, checked: boolean) => {
      const rowState = getRowState(groupId);
      if (rowState.disabled) return;

      const currentDirectIds = form.getValues('groupIds') ?? [];
      const nextDirectIds = checked
        ? [...currentDirectIds, groupId]
        : currentDirectIds.filter((id) => id !== groupId);

      form.setValue('groupIds', nextDirectIds, { shouldDirty: true });
    },
    [form, getRowState]
  );

  const formatSourceLabel = useCallback(
    (groupId: string) => {
      const state = getRowState(groupId);
      if (!state.source) return null;
      if (state.source.kind === 'direct' && state.source.label === 'direct') {
        return t('table.sourceDirect');
      }
      if (state.source.kind === 'inherited') {
        return t('table.sourceViaRole', { roleName: state.source.label });
      }
      return t('table.sourceDirectAndViaRole', { roleName: state.source.label });
    },
    [getRowState, t]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: DataTableColumnConfig<Group>[] = [
    {
      key: 'checkbox',
      header: '',
      ...USER_DETAIL_CHECKBOX_COLUMN,
      render: (group: Group) => {
        const rowState = getRowState(group.id);
        const checkbox = (
          <Checkbox
            checked={rowState.checked}
            onCheckedChange={(checked) => handleGroupToggle(group.id, checked === true)}
            disabled={rowState.disabled}
          />
        );

        if (rowState.disabled && rowState.source?.kind === 'inherited') {
          return (
            <UserDetailTableCheckboxCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{checkbox}</span>
                  </TooltipTrigger>
                  <TooltipContent>{formatSourceLabel(group.id)}</TooltipContent>
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
      render: (group: Group) => {
        const primaryTag = group.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <UserDetailTableIconCell>
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
      render: (group: Group) => <span className="text-sm font-medium">{group.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
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
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (group: Group) => (
        <ScrollBadges items={transformTagsToBadges(group.tags)} height={60} />
      ),
    },
    {
      key: 'source',
      header: t('table.source'),
      width: '200px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (group: Group) => {
        const label = formatSourceLabel(group.id);
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
      { key: 'description', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'tags', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'source', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
    ]),
    rowCount: 5,
  };

  const tableLoading = loading || rolesLoading;

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
              value={groupsAttachmentFilter}
              onChange={setGroupsAttachmentFilter}
            />,
            toolbarGrow(
              <RoleGroupSearch
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
        data={groups}
        columns={visibleColumns}
        loading={tableLoading}
        emptyState={{
          icon: <Users />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
