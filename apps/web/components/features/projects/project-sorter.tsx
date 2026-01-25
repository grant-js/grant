'use client';

import { ProjectSortableField } from '@grantjs/schema';
import { useTranslations } from 'next-intl';

import { Sorter } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectSorter() {
  const t = useTranslations('projects');
  const sort = useProjectsStore((state) => state.sort);
  const setSort = useProjectsStore((state) => state.setSort);

  const sortOptions = [
    { value: ProjectSortableField.Name, label: t('sort.name') },
    { value: ProjectSortableField.CreatedAt, label: t('sort.createdAt') },
    { value: ProjectSortableField.UpdatedAt, label: t('sort.updatedAt') },
  ];

  return (
    <Sorter
      sort={sort}
      onSortChange={(field, order) => setSort(field, order)}
      fields={sortOptions}
      defaultField={ProjectSortableField.Name}
      translationNamespace="projects"
    />
  );
}
