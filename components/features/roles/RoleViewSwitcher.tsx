'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { useRolesStore } from '@/stores/roles.store';

export enum RoleView {
  CARD = 'card',
  TABLE = 'table',
}

export function RoleViewSwitcher() {
  const t = useTranslations('roles');

  // Use selective subscriptions to prevent unnecessary re-renders
  const view = useRolesStore((state) => state.view);
  const setView = useRolesStore((state) => state.setView);

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
      currentView={view}
      onViewChange={(newView) => setView(newView as RoleView)}
      options={roleViewOptions}
    />
  );
}
