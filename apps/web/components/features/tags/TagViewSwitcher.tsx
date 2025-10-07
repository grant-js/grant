'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { useTagsStore } from '@/stores/tags.store';

export enum TagView {
  CARD = 'card',
  TABLE = 'table',
}

export function TagViewSwitcher() {
  const t = useTranslations('tags');

  // Use selective subscriptions to prevent unnecessary re-renders
  const view = useTagsStore((state) => state.view);
  const setView = useTagsStore((state) => state.setView);

  const tagViewOptions: ViewOption[] = [
    {
      value: TagView.CARD,
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: TagView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as TagView)}
      options={tagViewOptions}
    />
  );
}
