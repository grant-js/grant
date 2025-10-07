'use client';

import { Project } from '@logusgraphics/grant-schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

interface ProjectActionsProps {
  project: Project;
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const t = useTranslations('projects');
  const setProjectToEdit = useProjectsStore((state) => state.setProjectToEdit);
  const setProjectToDelete = useProjectsStore((state) => state.setProjectToDelete);

  const actions = [
    {
      key: 'edit',
      label: t('actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: () => setProjectToEdit(project),
    },
    {
      key: 'delete',
      label: t('actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => setProjectToDelete({ id: project.id, name: project.name }),
      variant: 'destructive' as const,
    },
  ];

  return <Actions entity={project} actions={actions} />;
}
