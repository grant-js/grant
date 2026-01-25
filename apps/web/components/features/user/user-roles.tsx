'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role, RoleSortableField, SortOrder, Tag, User } from '@grantjs/schema';
import { Loader2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  Pagination,
  RefreshButton,
  ScrollBadges,
  Toolbar,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce, useScopeFromParams } from '@/hooks/common';
import { useRoles } from '@/hooks/roles';
import { useUserMutations } from '@/hooks/users';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

import { UserRoleSearch } from './user-role-search';
import { UserRoleSorter } from './user-role-sorter';

interface UserRolesProps {
  user: User;
}

export function UserRoles({ user }: UserRolesProps) {
  const t = useTranslations('user.roles');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useUserStore((state) => state.rolesPage);
  const limit = useUserStore((state) => state.rolesLimit);
  const search = useUserStore((state) => state.rolesSearch);
  const sort = useUserStore((state) => state.rolesSort);
  const updatingRoleId = useUserStore((state) => state.updatingRoleId);
  const optimisticCheckedRoleIds = useUserStore((state) => state.optimisticCheckedRoleIds);

  const setPage = useUserStore((state) => state.setRolesPage);
  const setSearch = useUserStore((state) => state.setRolesSearch);
  const setSort = useUserStore((state) => state.setRolesSort);
  const setUpdatingRoleId = useUserStore((state) => state.setUpdatingRoleId);
  const setOptimisticCheckedRoleIds = useUserStore((state) => state.setOptimisticCheckedRoleIds);
  const addOptimisticRoleId = useUserStore((state) => state.addOptimisticRoleId);
  const removeOptimisticRoleId = useUserStore((state) => state.removeOptimisticRoleId);
  const rolesRefetch = useUserStore((state) => state.rolesRefetch);
  const setRolesRefetch = useUserStore((state) => state.setRolesRefetch);

  const { roles, loading, error, totalCount, refetch } = useRoles({
    scope: scope!,
    page,
    limit,
    search,
    sort,
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

  const handleSortChange = (field: RoleSortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
  };

  const columns: DataTableColumnConfig<Role>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: (role: Role) => (
        <Checkbox
          checked={isRoleChecked(role.id)}
          onCheckedChange={(checked) => handleRoleToggle(role.id, checked === true)}
          disabled={!canUpdate}
        />
      ),
    },
    {
      key: 'icon',
      header: '',
      width: '50px',
      render: (role: Role) => {
        const primaryTag = role.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <div className="flex items-center justify-center">
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
          </div>
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (role: Role) => <span className="text-sm font-medium">{role.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      render: (role: Role) => (
        <span className="text-sm text-muted-foreground">
          {role.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (role: Role) => (
        <ScrollBadges items={transformTagsToBadges(role.tags)} height={60} showAsRound={true} />
      ),
    },
    {
      key: 'loading',
      header: '',
      width: '50px',
      render: (role: Role) =>
        updatingRoleId === role.id ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'checkbox', type: 'text' },
      { key: 'icon', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'tags', type: 'text' },
      { key: 'loading', type: 'text' },
    ],
    rowCount: 5,
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <p className="text-sm text-destructive">{t('error')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <Toolbar
            items={[
              <RefreshButton
                key="refresh"
                onRefresh={rolesRefetch ?? undefined}
                loading={loading}
              />,
              totalPages > 1 && (
                <UserRoleSearch key="search" search={search} onSearchChange={handleSearchChange} />
              ),
              totalCount > 0 && (
                <UserRoleSorter key="sorter" sort={sort} onSortChange={handleSortChange} />
              ),
            ]}
          />
        </div>
        <DataTable
          data={roles}
          columns={columns}
          loading={loading}
          emptyState={{
            icon: <Shield />,
            title: t('empty'),
            description: t('emptyDescription'),
          }}
          skeletonConfig={skeletonConfig}
        />
        {totalPages > 1 && (
          <div className="mt-4 border-t">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </>
  );
}
