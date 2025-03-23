'use client';

import { UserList } from '@/components/features/users/UserList';
import { UserActions } from '@/components/features/users/UserActions';
import { useTranslations } from 'next-intl';
import { DashboardPageTitle } from '@/components/common/DashboardPageTitle';
import { usePageTitle } from '@/hooks/usePageTitle';
import { UserSortableField, UserSortOrder } from '@/graphql/generated/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersPage() {
  const t = useTranslations('users');
  usePageTitle('users');
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultLimit = 10;

  // Get sort and limit from URL or use defaults
  const sortField = searchParams.get('sortField') as UserSortableField | null;
  const sortOrder = searchParams.get('sortOrder') as UserSortOrder | null;
  const currentLimit = Number(searchParams.get('limit')) || defaultLimit;
  const currentSort = sortField && sortOrder ? { field: sortField, order: sortOrder } : undefined;

  const handleSortChange = (field: UserSortableField, order: UserSortOrder) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortField', field);
    params.set('sortOrder', order);
    router.push(`?${params.toString()}`);
  };

  const handleLimitChange = (limit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', limit.toString());
    params.set('page', '1'); // Reset to first page when changing limit
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <DashboardPageTitle
            title={t('title')}
            actions={
              <UserActions
                currentPage={1}
                currentLimit={currentLimit}
                currentSort={currentSort}
                onSortChange={handleSortChange}
                onLimitChange={handleLimitChange}
              />
            }
          />
        </div>
      </div>
      <div className="flex-1">
        <UserList />
      </div>
    </div>
  );
}
