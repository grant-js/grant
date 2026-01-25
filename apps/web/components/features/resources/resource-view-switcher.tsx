'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceView } from './resource-types';

export function ResourceViewSwitcher() {
  const t = useTranslations('resources');

  const view = useResourcesStore((state) => state.view);
  const setView = useResourcesStore((state) => state.setView);

  const resourceViewOptions: ViewOption[] = [
    {
      value: ResourceView.CARD,
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: ResourceView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as ResourceView)}
      options={resourceViewOptions}
    />
  );
}
