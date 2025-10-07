'use client';

import { LayoutGrid, Table } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ViewSwitcher, type ViewOption } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

export enum ProjectView {
  CARD = 'card',
  TABLE = 'table',
}

export function ProjectViewSwitcher() {
  const t = useTranslations('projects');

  // Use selective subscriptions to prevent unnecessary re-renders
  const view = useProjectsStore((state) => state.view);
  const setView = useProjectsStore((state) => state.setView);

  const projectViewOptions: ViewOption[] = [
    {
      value: ProjectView.CARD,
      icon: LayoutGrid,
      label: t('view.card'),
    },
    {
      value: ProjectView.TABLE,
      icon: Table,
      label: t('view.table'),
    },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as ProjectView)}
      options={projectViewOptions}
    />
  );
}
