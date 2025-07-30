'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { useGroupsStore } from '@/stores/groups.store';

export enum GroupView {
  CARDS = 'cards',
  TABLE = 'table',
}

export function GroupViewSwitcher() {
  const t = useTranslations('groups');

  // Use selective subscriptions to prevent unnecessary re-renders
  const view = useGroupsStore((state) => state.view);
  const setView = useGroupsStore((state) => state.setView);

  const groupViewOptions: ViewOption[] = [
    {
      value: GroupView.CARDS,
      icon: LayoutGrid,
      label: t('view.cards'),
    },
    {
      value: GroupView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as GroupView)}
      options={groupViewOptions}
    />
  );
}
