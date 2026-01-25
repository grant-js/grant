'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { OrganizationView } from './organization-types';

export function OrganizationViewSwitcher() {
  const t = useTranslations('organizations');

  const view = useOrganizationsStore((state) => state.view);
  const setView = useOrganizationsStore((state) => state.setView);

  const organizationViewOptions: ViewOption[] = [
    {
      value: OrganizationView.CARD,
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: OrganizationView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as OrganizationView)}
      options={organizationViewOptions}
    />
  );
}
