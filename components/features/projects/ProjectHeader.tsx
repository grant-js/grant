'use client';

import { useTranslations } from 'next-intl';

import { CardHeader } from '@/components/common';
import { Project, Tag } from '@/graphql/generated/types';
import { TagColor } from '@/lib/constants/colors';

import { ProjectActions } from './ProjectActions';

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const t = useTranslations('projects');

  return (
    <CardHeader
      avatar={{
        initial: project.name.charAt(0).toUpperCase(),
      }}
      title={project.name}
      description={project.description || t('card.noDescription')}
      color={project.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor}
      actions={<ProjectActions project={project} />}
    />
  );
}
