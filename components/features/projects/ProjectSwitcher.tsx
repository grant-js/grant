'use client';

import * as React from 'react';

import { Check, ChevronsUpDown, FolderOpen } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProjectSortableField, ProjectSortOrder } from '@/graphql/generated/types';
import { useProjects } from '@/hooks/projects/useProjects';
import { useRouter, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface ProjectSwitcherProps {
  className?: string;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = React.useState(false);

  const { selectedOrganizationId } = useOrganizationsStore();

  // Get the current organization ID from the store
  const currentOrganizationId = selectedOrganizationId;

  // Load all projects for the current organization with limit -1
  const { projects, loading, error } = useProjects({
    organizationId: currentOrganizationId || '',
    limit: -1,
    sort: { field: ProjectSortableField.Name, order: ProjectSortOrder.Asc },
  });

  // Only show on project pages
  const isProjectPage = !!params.projectId;

  if (!isProjectPage) {
    return null;
  }

  const currentProjectId = params.projectId as string;
  const currentProject = projects.find((project) => project.id === currentProjectId);

  const handleProjectSelect = (projectId: string) => {
    setOpen(false);

    // Redirect to the project page
    const newPath = `/dashboard/project/${projectId}`;
    if (pathname !== newPath) {
      router.replace(newPath);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[220px] justify-between', className)}
          disabled={loading || !currentOrganizationId}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-sm shrink-0">Project:</span>
            <span className="truncate min-w-0">
              {loading
                ? t('loading')
                : error
                  ? t('error')
                  : currentProject
                    ? currentProject.name
                    : t('projects.select')}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
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
      </PopoverContent>
    </Popover>
  );
}
