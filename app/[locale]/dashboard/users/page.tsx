'use client';

import { UserList } from '@/components/features/users/UserList';
import { UserActions } from '@/components/features/users/UserActions';
import { useTranslations } from 'next-intl';
import { DashboardPageTitle } from '@/components/common/DashboardPageTitle';
import { usePageTitle } from '@/hooks/usePageTitle';
import { UserSortableField, UserSortOrder } from '@/graphql/generated/types';
import { useRouter } from 'next/navigation';
import { useMemo, useCallback, useState } from 'react';

interface InitialParams {
  page: number;
  limit: number;
  search: string;
  sortField: UserSortableField | null;
  sortOrder: UserSortOrder | null;
}

export default function UsersPage() {
  const t = useTranslations('users');
  usePageTitle('users');
  const router = useRouter();
  const defaultLimit = 10;

  // Parse initial URL parameters once
  const initialParams = useMemo<InitialParams>(() => {
    if (typeof window === 'undefined') {
      return {
        page: 1,
        limit: defaultLimit,
        search: '',
        sortField: null,
        sortOrder: null,
      };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      page: Number(params.get('page')) || 1,
      limit: Number(params.get('limit')) || defaultLimit,
      search: params.get('search') || '',
      sortField: params.get('sortField') as UserSortableField | null,
      sortOrder: params.get('sortOrder') as UserSortOrder | null,
    };
  }, []); // Empty dependency array since we only want to parse once

  // Initialize state from URL parameters
  const initialSort =
    initialParams.sortField && initialParams.sortOrder
      ? { field: initialParams.sortField, order: initialParams.sortOrder }
      : undefined;

  // Controlled state
  const [page, setPage] = useState(initialParams.page);
  const [limit, setLimit] = useState(initialParams.limit);
  const [search, setSearch] = useState(initialParams.search);
  const [sort, setSort] = useState(initialSort);

  // Memoize callback functions
  const handleSortChange = useCallback(
    (field: UserSortableField, order: UserSortOrder) => {
      const newSort = { field, order };
      if (JSON.stringify(newSort) !== JSON.stringify(sort)) {
        setSort(newSort);
        setPage(1); // Reset to first page when changing sort

        const params = new URLSearchParams(window.location.search);
        params.set('sortField', field);
        params.set('sortOrder', order);
        params.set('page', '1');
        router.push(('?' + params.toString()) as any);
      }
    },
    [sort, router]
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      if (newLimit !== limit) {
        setLimit(newLimit);
        setPage(1); // Reset to first page when changing limit

        const params = new URLSearchParams(window.location.search);
        params.set('limit', newLimit.toString());
        params.set('page', '1');
        router.push(('?' + params.toString()) as any);
      }
    },
    [limit, router]
  );

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      if (newSearch !== search) {
        setSearch(newSearch);
        setPage(1); // Reset to first page when searching

        const params = new URLSearchParams(window.location.search);
        if (newSearch) {
          params.set('search', newSearch);
        } else {
          params.delete('search');
        }
        params.set('page', '1');
        router.push(('?' + params.toString()) as any);
      }
    },
    [search, router]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage !== page) {
        setPage(newPage);

        const params = new URLSearchParams(window.location.search);
        params.set('page', newPage.toString());
        router.push(('?' + params.toString()) as any);
      }
    },
    [page, router]
  );

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container p-4">
          <DashboardPageTitle
            title={t('title')}
            actions={
              <UserActions
                limit={limit}
                search={search}
                sort={sort}
                onSortChange={handleSortChange}
                onLimitChange={handleLimitChange}
                onSearchChange={handleSearchChange}
              />
            }
          />
        </div>
      </div>
      <div className="flex-1">
        <UserList
          page={page}
          limit={limit}
          search={search}
          sort={sort}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
