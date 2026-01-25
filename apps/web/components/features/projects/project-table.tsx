'use client';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Project, Tag } from '@grantjs/schema';
import { FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  ScrollBadges,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { useProjectTags } from '@/hooks/common';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/stores/projects.store';

import { ProjectActions } from './project-actions';
import { ProjectAudit } from './project-audit';
import { ProjectCreateDialog } from './project-create-dialog';
import { ProjectNavigationButton } from './project-navigation-button';

export function ProjectTable() {
  const t = useTranslations('projects');
  const getProjectTags = useProjectTags();
  const limit = useProjectsStore((state) => state.limit);
  const search = useProjectsStore((state) => state.search);
  const projects = useProjectsStore((state) => state.projects);
  const loading = useProjectsStore((state) => state.loading);
  const selectedTagIds = useProjectsStore((state) => state.selectedTagIds);

  // Check if there are any active filters
  const hasActiveFilters = search.trim() !== '' || selectedTagIds.length > 0;

  const columns: DataTableColumnConfig<Project>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      render: (project: Project) => (
        <Avatar
          initial={project.name.charAt(0).toUpperCase()}
          size="lg"
          className={
            getProjectTags(project)?.find((tag: Tag) => tag.isPrimary)?.color
              ? cn(
                  'border-2',
                  getTagBorderClasses(
                    getProjectTags(project)?.find((tag: Tag) => tag.isPrimary)?.color as TagColor
                  )
                )
              : undefined
          }
        />
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '200px',
      render: (project: Project) => (
        <div className="flex flex-col">
          <span className="font-medium">{project.name}</span>
          <span className="text-sm text-muted-foreground">{project.slug}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '300px',
      render: (project: Project) => (
        <span className="text-sm text-muted-foreground">
          {project.description || t('table.noDescription')}
        </span>
      ),
    },
    {
      key: 'roles',
      header: t('table.roles'),
      width: '200px',
      render: (project: Project) => (
        <div className="flex flex-wrap gap-1">
          {project.roles?.slice(0, 3).map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
            >
              {role.name}
            </span>
          ))}
          {project.roles && project.roles.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
              +{project.roles.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (project: Project) => (
        <ScrollBadges
          items={transformTagsToBadges(getProjectTags(project))}
          height={60}
          showAsRound={true}
        />
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (project: Project) => <ProjectAudit project={project} />,
    },
    {
      key: 'actions',
      header: t('table.actions'),
      width: '100px',
      render: (project: Project) => <ProjectActions project={project} />,
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (project: Project) => (
        <ProjectNavigationButton project={project} size="sm" round={false} />
      ),
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'roles', type: 'list' },
      { key: 'tags', type: 'list' },
      { key: 'audit', type: 'audit' },
      { key: 'actions', type: 'actions' },
      { key: 'navigation', type: 'button' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={projects}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <FolderOpen />,
        title: hasActiveFilters ? t('noSearchResults.title') : t('empty.title'),
        description: hasActiveFilters ? t('noSearchResults.description') : t('empty.description'),
        action: hasActiveFilters ? undefined : <ProjectCreateDialog />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
