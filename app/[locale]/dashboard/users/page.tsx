'use client';

import { UserList } from '@/components/UserList';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { useTranslations } from 'next-intl';
import { DashboardPageTitle } from '@/components/DashboardPageTitle';

export default function UsersPage() {
  const t = useTranslations('users');

  return (
    <div className="space-y-8">
      <DashboardPageTitle title={t('title')} actions={<CreateUserDialog currentPage={1} />} />
      <UserList />
    </div>
  );
}
