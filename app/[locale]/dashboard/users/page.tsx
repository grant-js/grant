'use client';

import { useMemo, useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { UserPagination } from '@/components/features/users/UserPagination';
import { UsersContainer } from '@/components/features/users/UsersContainer';
import { UserToolbar } from '@/components/features/users/UserToolbar';
import { UserView } from '@/components/features/users/UserViewSwitcher';
import { UserSortableField, UserSortOrder } from '@/graphql/generated/types';
import { usePageTitle } from '@/hooks';

interface InitialParams {
  page: number;
  limit: number;
  search: string;
  sortField: UserSortableField | null;
  sortOrder: UserSortOrder | null;
  view: UserView | null;
}

export default function UsersPage() {
  const t = useTranslations('users');
  usePageTitle('users');
  const router = useRouter();
  const defaultLimit = 50;
  const [totalCount, setTotalCount] = useState(0);

  // Parse initial URL parameters once
  const initialParams = useMemo<InitialParams>(() => {
    if (typeof window === 'undefined') {
      return {
        page: 1,
        limit: defaultLimit,
        search: '',
        sortField: null,
        sortOrder: null,
        view: null,
      };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      page: Number(params.get('page')) || 1,
      limit: Number(params.get('limit')) || defaultLimit,
      search: params.get('search') || '',
      sortField: params.get('sortField') as UserSortableField | null,
      sortOrder: params.get('sortOrder') as UserSortOrder | null,
      view: (params.get('view') as UserView) || null,
    };
  }, []); // Empty dependency array since we only want to parse once

  // Initialize state from URL parameters
  const initialSort =
    initialParams.sortField && initialParams.sortOrder
      ? { field: initialParams.sortField, order: initialParams.sortOrder }
      : { field: UserSortableField.Name, order: UserSortOrder.Asc };

  // Controlled state
  const [page, setPage] = useState(initialParams.page);
  const [limit, setLimit] = useState(initialParams.limit);
  const [search, setSearch] = useState(initialParams.search);
  const [sort, setSort] = useState(initialSort);
  const [view, setView] = useState<UserView>(initialParams.view || UserView.CARD);

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

  const handleViewChange = useCallback(
    (newView: UserView) => {
      if (newView !== view) {
        setView(newView);

        const params = new URLSearchParams(window.location.search);
        params.set('view', newView);
        router.push(('?' + params.toString()) as any);
      }
    },
    [view, router]
  );

  return (
    <DashboardPageLayout
      title={t('title')}
      actions={
        <UserToolbar
          limit={limit}
          search={search}
          sort={sort}
          currentView={view}
          onSortChange={handleSortChange}
          onLimitChange={handleLimitChange}
          onSearchChange={handleSearchChange}
          onViewChange={handleViewChange}
        />
      }
      footer={
        <UserPagination
          page={page}
          totalPages={Math.ceil(totalCount / limit)}
          onPageChange={handlePageChange}
        />
      }
    >
      <UsersContainer
        page={page}
        limit={limit}
        search={search}
        sort={sort}
        view={view}
        onTotalCountChange={setTotalCount}
      />
    </DashboardPageLayout>
  );
}
