'use client';

import { useTranslations } from 'next-intl';
import { Project } from '@grantjs/schema';
import { FolderOpen, Tags } from 'lucide-react';

import { CardBody, CardGrid } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { useProjectTags } from '@/hooks/common';
import { getEntityTagCount } from '@/lib/entity-list';
import { useProjectsStore } from '@/stores/projects.store';

import { ProjectAudit } from './project-audit';
import { ProjectCardSkeleton } from './project-card-skeleton';
import { ProjectCreateDialog } from './project-create-dialog';
import { ProjectHeader } from './project-header';
import { ProjectNavigationButton } from './project-navigation-button';

export function ProjectCards() {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const getProjectTags = useProjectTags();

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
        icon: <FolderOpen />,
        title: hasActiveFilters ? t('noSearchResults.title') : t('empty.title'),
        description: hasActiveFilters ? t('noSearchResults.description') : t('empty.description'),
        action: hasActiveFilters ? undefined : <ProjectCreateDialog triggerAlwaysShowLabel />,
      }}
      skeleton={{
        component: <ProjectCardSkeleton />,
        count: limit,
      }}
      renderHeader={(project: Project) => (
        <ProjectHeader tags={getProjectTags(project)} project={project} />
      )}
      renderBody={(project: Project) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('table.tags'),
              },
              value: (
                <Badge variant="secondary">
                  {tCommon('tagCount', {
                    count: getEntityTagCount({ tags: getProjectTags(project) }),
                  })}
                </Badge>
              ),
            },
          ]}
        />
      )}
      renderFooter={(project: Project) => (
        <div className="flex items-center justify-between w-full">
          <ProjectAudit project={project} />
          <ProjectNavigationButton project={project} size="lg" round={true} />
        </div>
      )}
    />
  );
}
