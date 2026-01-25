'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionView } from './permission-types';

export function PermissionViewSwitcher() {
  const t = useTranslations('permissions');

  const view = usePermissionsStore((state) => state.view);
  const setView = usePermissionsStore((state) => state.setView);

  const permissionViewOptions: ViewOption[] = [
    {
      value: PermissionView.CARD,
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: PermissionView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as PermissionView)}
      options={permissionViewOptions}
    />
  );
}
