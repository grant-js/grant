'use client';

import { TagColor } from '@logusgraphics/grant-constants';
import { Project, Tag } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { CardHeader } from '@/components/common';

import { ProjectActions } from './ProjectActions';

interface ProjectHeaderProps {
  project: Project;
  tags: Tag[];
}

export function ProjectHeader({ tags, project }: ProjectHeaderProps) {
  const t = useTranslations('projects');

  return (
    <CardHeader
      avatar={{
        initial: project.name.charAt(0).toUpperCase(),
      }}
      title={project.name}
      description={project.description || t('card.noDescription')}
      color={tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor}
      actions={<ProjectActions project={project} />}
    />
  );
}
