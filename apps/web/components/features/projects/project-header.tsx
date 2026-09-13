'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Project, Tag } from '@grantjs/schema';

import { CardHeader } from '@/components/common';

import { ProjectActions } from './project-actions';
import { ProjectAvatar } from './project-avatar';

interface ProjectHeaderProps {
  project: Project;
  tags: Tag[];
}

export function ProjectHeader({ tags, project }: ProjectHeaderProps) {
  const t = useTranslations('projects');
  const primaryColor = tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor | undefined;

  return (
    <CardHeader
      avatarContent={
        <ProjectAvatar
          project={project}
          size="lg"
          interactive
          className={primaryColor ? `border-2 ${getTagBorderClasses(primaryColor)}` : undefined}
        />
      }
      title={project.name}
      description={project.description || t('card.noDescription')}
      actions={<ProjectActions project={project} />}
    />
  );
}
