'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Group, Tag, User } from '@grantjs/schema';
import { Group as GroupIcon, Loader2, Users } from 'lucide-react';

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
import { useRoles } from '@/hooks/roles';
import { useUserMutations } from '@/hooks/users';
import { collectAttachedGroupIds, resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import {
  buildInheritedFromRoleByGroupId,
  computeUserGroupRowState,
} from '@/lib/rbac-relationship-state';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

import { RoleGroupSearch } from '../role/role-group-search';
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

interface UserGroupsProps {
  user: User;
}

export function UserGroups({ user }: UserGroupsProps) {
  const t = useTranslations('user.groups');
  const scope = useProjectUserScope();

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useUserStore((state) => state.groupsPage);
  const limit = useUserStore((state) => state.groupsLimit);
  const search = useUserStore((state) => state.groupsSearch);
  const sort = useUserStore((state) => state.groupsSort);
  const groupsAttachmentFilter = useUserStore((state) => state.groupsAttachmentFilter);
  const updatingGroupId = useUserStore((state) => state.updatingGroupId);
  const optimisticDirectGroupIds = useUserStore((state) => state.optimisticDirectGroupIds);

  const setPage = useUserStore((state) => state.setGroupsPage);
  const setSearch = useUserStore((state) => state.setGroupsSearch);
  const setGroupsAttachmentFilter = useUserStore((state) => state.setGroupsAttachmentFilter);
  const setUpdatingGroupId = useUserStore((state) => state.setUpdatingGroupId);
  const setOptimisticDirectGroupIds = useUserStore((state) => state.setOptimisticDirectGroupIds);
  const addOptimisticDirectGroupId = useUserStore((state) => state.addOptimisticDirectGroupId);
  const removeOptimisticDirectGroupId = useUserStore(
    (state) => state.removeOptimisticDirectGroupId
  );
  const groupsRefetch = useUserStore((state) => state.groupsRefetch);
  const setGroupsRefetch = useUserStore((state) => state.setGroupsRefetch);

  const roleIds = useMemo(() => user.roles?.map((r) => r.id) || [], [user.roles]);

  const { roles: rolesWithGroups, loading: rolesLoading } = useRoles({
    scope: scope!,
    ids: roleIds.length > 0 ? roleIds : [],
    limit: -1,
  });

  const inheritedFromRoleByGroupId = useMemo(
    () => buildInheritedFromRoleByGroupId(rolesWithGroups ?? []),
    [rolesWithGroups]
  );

  const selectedGroupIds = useMemo(
    () => collectAttachedGroupIds(optimisticDirectGroupIds, inheritedFromRoleByGroupId),
    [optimisticDirectGroupIds, inheritedFromRoleByGroupId]
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

  const { updateUser } = useUserMutations();

  useEffect(() => {
    setOptimisticDirectGroupIds(new Set(user.userGroups?.map((ug) => ug.groupId) || []));
  }, [user.userGroups, setOptimisticDirectGroupIds]);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setGroupsRefetch(handleRefetch);
    return () => setGroupsRefetch(null);
  }, [handleRefetch, setGroupsRefetch]);

  const totalPages = Math.ceil(totalCount / limit);

  const getRowState = useCallback(
    (groupId: string) =>
      computeUserGroupRowState(groupId, {
        directGroupIds: optimisticDirectGroupIds,
        inheritedFromRoleByGroupId,
      }),
    [optimisticDirectGroupIds, inheritedFromRoleByGroupId]
  );

  const debouncedUpdateUserGroups = useDebounce(async (groupIds: string[]) => {
    if (!user) return;

    setUpdatingGroupId(null);
    try {
      await updateUser(user.id, {
        scope: scope!,
        groupIds,
      });
    } finally {
      setUpdatingGroupId(null);
    }
  }, 300);

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const rowState = getRowState(groupId);
    if (rowState.disabled) return;

    const currentDirectIds = Array.from(optimisticDirectGroupIds);

    if (checked) {
      addOptimisticDirectGroupId(groupId);
    } else {
      removeOptimisticDirectGroupId(groupId);
    }

    setUpdatingGroupId(groupId);
    const nextDirectIds = checked
      ? [...currentDirectIds, groupId]
      : currentDirectIds.filter((id) => id !== groupId);
    debouncedUpdateUserGroups(nextDirectIds);
  };

  const formatSourceLabel = (groupId: string) => {
    const state = getRowState(groupId);
    if (!state.source) return null;
    if (state.source.kind === 'direct' && state.source.label === 'direct') {
      return t('table.sourceDirect');
    }
    if (state.source.kind === 'inherited') {
      return t('table.sourceViaRole', { roleName: state.source.label });
    }
    return t('table.sourceDirectAndViaRole', { roleName: state.source.label });
  };

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
            disabled={!canUpdate || rowState.disabled}
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
    {
      key: 'loading',
      header: '',
      ...USER_DETAIL_LOADING_COLUMN,
      render: (group: Group) =>
        updatingGroupId === group.id ? (
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
      { key: 'description', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'tags', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'source', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      USER_DETAIL_LOADING_SKELETON,
    ]),
    rowCount: 5,
  };

  const tableLoading = loading || rolesLoading;

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
              onRefresh={groupsRefetch ?? undefined}
              loading={tableLoading}
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
