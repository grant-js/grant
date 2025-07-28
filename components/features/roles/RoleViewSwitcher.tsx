'use client';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type RoleView = 'card' | 'table';

interface RoleViewSwitcherProps {
  currentView: RoleView;
  onViewChange: (view: RoleView) => void;
}

export function RoleViewSwitcher({ currentView, onViewChange }: RoleViewSwitcherProps) {
  const t = useTranslations('roles');

  const roleViewOptions: ViewOption[] = [
    {
      value: 'card',
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: 'table',
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
