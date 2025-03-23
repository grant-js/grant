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

  // Get sort from URL or use defaults
  const sortField = searchParams.get('sortField') as UserSortableField | null;
  const sortOrder = searchParams.get('sortOrder') as UserSortOrder | null;
  const currentSort = sortField && sortOrder ? { field: sortField, order: sortOrder } : undefined;

  const handleSortChange = (field: UserSortableField, order: UserSortOrder) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortField', field);
    params.set('sortOrder', order);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <DashboardPageTitle
        title={t('title')}
        actions={
          <UserActions currentPage={1} currentSort={currentSort} onSortChange={handleSortChange} />
        }
      />
      <UserList />
    </div>
  );
}
