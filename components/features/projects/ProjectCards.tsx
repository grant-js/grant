'use client';

import { FolderOpen, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, ScrollBadges } from '@/components/common';
import { Project } from '@/graphql/generated/types';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { useProjectsStore } from '@/stores/projects.store';

import { CreateProjectDialog } from './CreateProjectDialog';
import { ProjectAudit } from './ProjectAudit';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';
import { ProjectHeader } from './ProjectHeader';
import { ProjectNavigationButton } from './ProjectNavigationButton';

interface ProjectCardsProps {
  organizationId: string;
}

export function ProjectCards({ organizationId }: ProjectCardsProps) {
  const t = useTranslations('projects');

  const limit = useProjectsStore((state) => state.limit);
  const search = useProjectsStore((state) => state.search);
  const projects = useProjectsStore((state) => state.projects);
  const loading = useProjectsStore((state) => state.loading);
  const selectedTagIds = useProjectsStore((state) => state.selectedTagIds);

  const hasActiveFilters = search.trim() !== '' || selectedTagIds.length > 0;

  return (
    <CardGrid<Project>
      entities={projects}
      loading={loading}
      emptyState={{
        icon: FolderOpen,
        title: hasActiveFilters ? t('noSearchResults.title') : t('empty.title'),
        description: hasActiveFilters ? t('noSearchResults.description') : t('empty.description'),
        action: hasActiveFilters ? undefined : <CreateProjectDialog />,
      }}
      skeleton={{
        component: <ProjectCardSkeleton />,
        count: limit,
      }}
      renderHeader={(project: Project) => <ProjectHeader project={project} />}
      renderBody={(project: Project) => (
        <div className="space-y-3">
          <ScrollBadges
            items={transformTagsToBadges(project.tags)}
            title={t('form.tags')}
            icon={<Tags className="h-3 w-3" />}
            height={60}
            showAsRound={true}
          />
        </div>
      )}
      renderFooter={(project: Project) => (
        <div className="flex items-center justify-between w-full">
          <ProjectAudit project={project} />
          <ProjectNavigationButton
            project={project}
            organizationId={organizationId}
            size="lg"
            round={true}
          />
        </div>
      )}
    />
  );
}
