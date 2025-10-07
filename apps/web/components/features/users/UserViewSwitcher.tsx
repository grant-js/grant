'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { useUsersStore } from '@/stores/users.store';

export enum UserView {
  CARD = 'card',
  TABLE = 'table',
}

export function UserViewSwitcher() {
  const t = useTranslations('users');

  // Use selective subscriptions to prevent unnecessary re-renders
  const view = useUsersStore((state) => state.view);
  const setView = useUsersStore((state) => state.setView);

  const userViewOptions: ViewOption[] = [
    {
      value: UserView.CARD,
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: UserView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as UserView)}
      options={userViewOptions}
    />
  );
}
