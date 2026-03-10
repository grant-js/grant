'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useParams } from 'next/navigation';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ProjectSortableField, SortOrder, Tenant } from '@grantjs/schema';
import { Check, FolderOpen, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SidebarPopover } from '@/components/common';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useProjectScope } from '@/hooks/common';
import { useProjects } from '@/hooks/projects';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/stores/projects.store';

import { ProjectCreateDialog } from './project-create-dialog';

interface ProjectSwitcherProps {
  className?: string;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const t = useTranslations('common');
  const tProjects = useTranslations('projects');
  const router = useRouter();
  const pathname = usePathname();
  const scope = useProjectScope();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const setCurrentProject = useProjectsStore((state) => state.setCurrentProject);
  const setCreateDialogOpen = useProjectsStore((state) => state.setCreateDialogOpen);

  const canCreate = useGrant(ResourceSlug.Project, ResourceAction.Create, {
    scope: scope!,
  });

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

  const handleCreateProject = useCallback(() => {
    setOpen(false);
    setCreateDialogOpen(true);
  }, [setCreateDialogOpen]);

  const handleProjectSelect = useCallback(
    (projectId: string) => {
      setOpen(false);
      let newPath;
      switch (scope!.tenant) {
        case Tenant.Account:
          newPath = `/dashboard/accounts/${scope!.id}/projects/${projectId}`;
          break;
        case Tenant.Organization:
          newPath = `/dashboard/organizations/${scope!.id}/projects/${projectId}`;
          break;
        default:
          throw new Error('Invalid scope');
      }
      if (pathname !== newPath) {
        router.push(newPath);
      }
    },
    [pathname, scope, router]
  );

  // Update store when current project changes (no cleanup on unmount so breadcrumb
  // keeps the name when sidebar is collapsed on mobile; CurrentProjectSync in layout
  // keeps the store in sync and clears when navigating away)
  useEffect(() => {
    if (isProjectPage) {
      setCurrentProject(currentProject || null);
    }
  }, [currentProject, setCurrentProject, isProjectPage]);

  if (!isProjectPage) {
    return null;
  }

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
        {canCreate && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="create-project" onSelect={handleCreateProject}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {tProjects('createDialog.trigger')}
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );

  return (
    <>
      {canCreate && isProjectPage && <ProjectCreateDialog hideTrigger />}
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
    </>
  );
}
