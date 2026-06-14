'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role, Tag, User } from '@grantjs/schema';
import { Loader2, Shield } from 'lucide-react';

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
import { useDebounce, useDetailTableColumnVisibility } from '@/hooks/common';
import { useProjectUserScope } from '@/hooks/common/use-project-user-scope';
import { useRoles } from '@/hooks/roles';
import { useUserMutations } from '@/hooks/users';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

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
import { UserRoleSearch } from './user-role-search';

interface UserRolesProps {
  user: User;
}

export function UserRoles({ user }: UserRolesProps) {
  const t = useTranslations('user.roles');
  const scope = useProjectUserScope();

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useUserStore((state) => state.rolesPage);
  const limit = useUserStore((state) => state.rolesLimit);
  const search = useUserStore((state) => state.rolesSearch);
  const sort = useUserStore((state) => state.rolesSort);
  const rolesAttachmentFilter = useUserStore((state) => state.rolesAttachmentFilter);
  const updatingRoleId = useUserStore((state) => state.updatingRoleId);
  const optimisticCheckedRoleIds = useUserStore((state) => state.optimisticCheckedRoleIds);

  const setPage = useUserStore((state) => state.setRolesPage);
  const setSearch = useUserStore((state) => state.setRolesSearch);
  const setRolesAttachmentFilter = useUserStore((state) => state.setRolesAttachmentFilter);
  const setUpdatingRoleId = useUserStore((state) => state.setUpdatingRoleId);
  const setOptimisticCheckedRoleIds = useUserStore((state) => state.setOptimisticCheckedRoleIds);
  const addOptimisticRoleId = useUserStore((state) => state.addOptimisticRoleId);
  const removeOptimisticRoleId = useUserStore((state) => state.removeOptimisticRoleId);
  const rolesRefetch = useUserStore((state) => state.rolesRefetch);
  const setRolesRefetch = useUserStore((state) => state.setRolesRefetch);

  const selectedRoleIds = useMemo(
    () => Array.from(optimisticCheckedRoleIds),
    [optimisticCheckedRoleIds]
  );

  const roleQueryIds = useMemo(
    () => resolveDetailQueryIds(rolesAttachmentFilter, selectedRoleIds),
    [rolesAttachmentFilter, selectedRoleIds]
  );

  const { roles, loading, error, totalCount, refetch } = useRoles({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    ids: roleQueryIds,
  });

  const { updateUser } = useUserMutations();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRolesRefetch(handleRefetch);
    return () => setRolesRefetch(null);
  }, [handleRefetch, setRolesRefetch]);

  useEffect(() => {
    setOptimisticCheckedRoleIds(new Set(user.roles?.map((r) => r.id) || []));
  }, [user.roles, setOptimisticCheckedRoleIds]);

  const totalPages = Math.ceil(totalCount / limit);

  const isRoleChecked = useCallback(
    (roleId: string) => {
      return optimisticCheckedRoleIds.has(roleId);
    },
    [optimisticCheckedRoleIds]
  );

  const debouncedUpdateUserRoles = useDebounce(
    async (roleId: string, shouldAdd: boolean, currentRoleIds: string[]) => {
      if (!user) return;

      setUpdatingRoleId(roleId);
      try {
        const updatedRoleIds = shouldAdd
          ? [...currentRoleIds, roleId]
          : currentRoleIds.filter((id) => id !== roleId);

        await updateUser(user.id, {
          scope: scope!,
          roleIds: updatedRoleIds,
        });
      } finally {
        setUpdatingRoleId(null);
      }
    },
    300
  );

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const currentRoleIds = Array.from(optimisticCheckedRoleIds);

    if (checked) {
      addOptimisticRoleId(roleId);
    } else {
      removeOptimisticRoleId(roleId);
    }

    debouncedUpdateUserRoles(roleId, checked, currentRoleIds);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
  };

  const columns: DataTableColumnConfig<Role>[] = [
    {
      key: 'checkbox',
      header: '',
      ...USER_DETAIL_CHECKBOX_COLUMN,
      render: (role: Role) => (
        <UserDetailTableCheckboxCell>
          <Checkbox
            checked={isRoleChecked(role.id)}
            onCheckedChange={(checked) => handleRoleToggle(role.id, checked === true)}
            disabled={!canUpdate}
          />
        </UserDetailTableCheckboxCell>
      ),
    },
    {
      key: 'icon',
      header: '',
      ...USER_DETAIL_ICON_COLUMN,
      render: (role: Role) => {
        const primaryTag = role.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <UserDetailTableIconCell>
            <Avatar
              initial={role.name.charAt(0)}
              size="sm"
              icon={<Shield className="h-3 w-3 text-muted-foreground" />}
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
      render: (role: Role) => <span className="text-sm font-medium">{role.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (role: Role) => (
        <span className="text-sm text-muted-foreground">
          {role.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '180px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (role: Role) => <ScrollBadges items={transformTagsToBadges(role.tags)} height={60} />,
    },
    {
      key: 'loading',
      header: '',
      ...USER_DETAIL_LOADING_COLUMN,
      render: (role: Role) =>
        updatingRoleId === role.id ? (
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
      USER_DETAIL_LOADING_SKELETON,
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
              onRefresh={rolesRefetch ?? undefined}
              loading={loading}
              iconOnly
            />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={rolesAttachmentFilter}
              onChange={setRolesAttachmentFilter}
            />,
            toolbarGrow(
              <UserRoleSearch
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
        data={roles}
        columns={visibleColumns}
        loading={loading}
        emptyState={{
          icon: <Shield />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
