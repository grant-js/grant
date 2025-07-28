'use client';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

export enum RoleView {
  CARD = 'card',
  TABLE = 'table',
}

interface RoleViewSwitcherProps {
  currentView: RoleView;
  onViewChange: (view: RoleView) => void;
}

export function RoleViewSwitcher({ currentView, onViewChange }: RoleViewSwitcherProps) {
  const t = useTranslations('roles');

  const roleViewOptions: ViewOption[] = [
    {
      value: RoleView.CARD,
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: RoleView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={currentView}
      onViewChange={(view) => onViewChange(view as RoleView)}
      options={roleViewOptions}
    />
  );
}
