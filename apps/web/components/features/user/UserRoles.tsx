'use client';

import { useCallback, useEffect, useState } from 'react';

import { Role, RoleSortableField, SortOrder, User } from '@logusgraphics/grant-schema';
import { Loader2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Pagination, Toolbar } from '@/components/common';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from '@/hooks/common/useDebounce';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useRoles } from '@/hooks/roles';
import { useUserMutations } from '@/hooks/users';

import { UserRoleSearch } from './UserRoleSearch';
import { UserRoleSorter } from './UserRoleSorter';

interface UserRolesProps {
  userId: string;
  user: User;
}

export function UserRoles({ userId, user }: UserRolesProps) {
  const t = useTranslations('user.roles');
  const scope = useScopeFromParams();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: RoleSortableField; order: SortOrder } | undefined>({
    field: RoleSortableField.Name,
    order: SortOrder.Asc,
  });

  const { roles, loading, error, totalCount } = useRoles({
    scope: scope!,
    page,
    limit,
    search,
    sort,
  });

  const { updateUser } = useUserMutations();

  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [optimisticCheckedRoleIds, setOptimisticCheckedRoleIds] = useState<Set<string>>(
    new Set(user.roles?.map((r) => r.id) || [])
  );

  useEffect(() => {
    setOptimisticCheckedRoleIds(new Set(user.roles?.map((r) => r.id) || []));
  }, [user.roles]);

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

        await updateUser(userId, {
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

    setOptimisticCheckedRoleIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });

    debouncedUpdateUserRoles(roleId, checked, currentRoleIds);
  };

  const handleSortChange = (field: RoleSortableField, order: SortOrder) => {
    setSort({ field, order });
    setPage(1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  };

  const columns: ColumnConfig<Role>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: (role: Role) => (
        <Checkbox
          checked={isRoleChecked(role.id)}
          onCheckedChange={(checked) => handleRoleToggle(role.id, checked === true)}
        />
      ),
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
      key: 'loading',
      header: '',
      width: '50px',
      render: (role: Role) =>
        updatingRoleId === role.id ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null,
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'checkbox', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
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
              <UserRoleSearch
                key="search"
                search={search}
                onSearchChange={handleSearchChange}
                show={totalPages > 1}
              />,
              <UserRoleSorter key="sorter" sort={sort} onSortChange={handleSortChange} />,
            ]}
          />
        </div>
        <DataTable
          data={roles}
          columns={columns}
          loading={loading}
          emptyState={{
            icon: <Shield className="h-12 w-12" />,
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
