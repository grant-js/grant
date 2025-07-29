'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';

export enum GroupView {
  CARDS = 'cards',
  TABLE = 'table',
}

interface GroupViewSwitcherProps {
  currentView: GroupView;
  onViewChange: (view: GroupView) => void;
}

export function GroupViewSwitcher({ currentView, onViewChange }: GroupViewSwitcherProps) {
  const t = useTranslations('groups');

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
      currentView={currentView}
      onViewChange={(view) => onViewChange(view as GroupView)}
      options={groupViewOptions}
    />
  );
}
