'use client';

import { RoleToolbar } from '@/components/features/roles/RoleToolbar';
import { RolePagination } from '@/components/features/roles/RolePagination';
import { useTranslations } from 'next-intl';
import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { usePageTitle } from '@/hooks';
import { RoleSortableField, RoleSortOrder } from '@/graphql/generated/types';
import { useRouter } from 'next/navigation';
import { useMemo, useCallback, useState } from 'react';
import { RolesContainer } from '@/components/features/roles/RolesContainer';
import { RoleView } from '@/components/features/roles/RoleViewSwitcher';

interface InitialParams {
  page: number;
  limit: number;
  search: string;
  sortField: RoleSortableField | null;
  sortOrder: RoleSortOrder | null;
  view: RoleView | null;
}

export default function RolesPage() {
  const t = useTranslations('roles');
  usePageTitle('roles');
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
      sortField: params.get('sortField') as RoleSortableField | null,
      sortOrder: params.get('sortOrder') as RoleSortOrder | null,
      view: (params.get('view') as RoleView) || null,
    };
  }, []); // Empty dependency array since we only want to parse once

  // Initialize state from URL parameters
  const initialSort =
    initialParams.sortField && initialParams.sortOrder
      ? { field: initialParams.sortField, order: initialParams.sortOrder }
      : { field: RoleSortableField.Name, order: RoleSortOrder.Asc };

  // Controlled state
  const [page, setPage] = useState(initialParams.page);
  const [limit, setLimit] = useState(initialParams.limit);
  const [search, setSearch] = useState(initialParams.search);
  const [sort, setSort] = useState(initialSort);
  const [view, setView] = useState<RoleView>(initialParams.view || RoleView.CARD);

  // Memoize callback functions
  const handleSortChange = useCallback(
    (field: RoleSortableField, order: RoleSortOrder) => {
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
    (newView: RoleView) => {
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
        <RoleToolbar
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
        <RolePagination
          page={page}
          totalPages={Math.ceil(totalCount / limit)}
          onPageChange={handlePageChange}
        />
      }
    >
      <RolesContainer
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
