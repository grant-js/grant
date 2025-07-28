'use client';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

export enum UserView {
  CARD = 'card',
  TABLE = 'table',
}

interface UserViewSwitcherProps {
  currentView: UserView;
  onViewChange: (view: UserView) => void;
}

export function UserViewSwitcher({ currentView, onViewChange }: UserViewSwitcherProps) {
  const t = useTranslations('users');

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
      currentView={currentView}
      onViewChange={(view) => onViewChange(view as UserView)}
      options={userViewOptions}
    />
  );
}
