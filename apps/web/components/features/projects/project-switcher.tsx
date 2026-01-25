'use client';

import * as React from 'react';
import { useEffect, useMemo } from 'react';

import { redirect, useParams } from 'next/navigation';

import { ProjectSortableField, SortOrder, Tenant } from '@grantjs/schema';
import { Check, FolderOpen } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { SidebarPopover } from '@/components/common';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useProjectScope } from '@/hooks/common';
import { useProjects } from '@/hooks/projects';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/stores/projects.store';

interface ProjectSwitcherProps {
  className?: string;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const scope = useProjectScope();
  const params = useParams();
  const [open, setOpen] = React.useState(false);
  const setCurrentProject = useProjectsStore((state) => state.setCurrentProject);

  const { projects, loading, error } = useProjects({
    scope: scope!,
    limit: -1,
    sort: { field: ProjectSortableField.Name, order: SortOrder.Asc },
  });

  const isProjectPage = !!params.projectId;
  const currentProjectId = params.projectId as string;

  const currentProject = useMemo(
    () => (isProjectPage ? projects.find((project) => project.id === currentProjectId) : undefined),
    [projects, currentProjectId, isProjectPage]
  );

  // Update store when current project changes
  useEffect(() => {
    if (isProjectPage) {
      setCurrentProject(currentProject || null);
      return () => {
        setCurrentProject(null);
      };
    }
  }, [currentProject, setCurrentProject, isProjectPage]);

  if (!isProjectPage) {
    return null;
  }

  const handleProjectSelect = (projectId: string) => {
    setOpen(false);
    let newPath;
    switch (scope!.tenant) {
      case Tenant.Account:
        newPath = `/${locale}/dashboard/accounts/${scope!.id}/projects/${projectId}`;
        break;
      case Tenant.Organization:
        newPath = `/${locale}/dashboard/organizations/${scope!.id}/projects/${projectId}`;
        break;
      default:
        throw new Error('Invalid scope');
    }
    if (pathname !== newPath) {
      redirect(newPath);
    }
  };

  const projectName = loading
    ? t('loading')
    : error
      ? t('error')
      : currentProject
        ? currentProject.name
        : t('projects.select');

  const popoverContent = (
    <Command>
      <CommandInput placeholder={t('projects.search')} />
      <CommandList>
        <CommandEmpty>{t('projects.notFound')}</CommandEmpty>
        <CommandGroup>
          {projects.map((project) => (
            <CommandItem
              key={project.id}
              value={project.name}
              onSelect={() => handleProjectSelect(project.id)}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  currentProjectId === project.id ? 'opacity-100' : 'opacity-0'
                )}
              />
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <SidebarPopover
      icon={<FolderOpen />}
      title={projectName}
      label={t('projects.project')}
      content={popoverContent}
      buttonProps={{
        size: 'lg',
        className: cn('!px-1 h-12', className),
        disabled: loading || !scope,
      }}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
