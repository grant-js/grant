'use client';

import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Loader2, LogIn, LogOut, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectSyncJobGrantContext } from '@/hooks/projects/use-project-sync-job-grant-context';
import { cn } from '@/lib/utils';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

type ActionTriggerLayout = 'empty' | 'toolbar';

type ProjectSyncJobActionVariant = 'import' | 'export';

const VARIANT_CONFIG: Record<
  ProjectSyncJobActionVariant,
  { icon: LucideIcon; labelKey: 'toolbar.start' | 'toolbar.export' }
> = {
  import: { icon: LogIn, labelKey: 'toolbar.start' },
  export: { icon: LogOut, labelKey: 'toolbar.export' },
};

export interface ProjectSyncJobActionTriggerProps {
  variant: ProjectSyncJobActionVariant;
  layout?: ActionTriggerLayout;
}

export function ProjectSyncJobActionTrigger({
  variant,
  layout = 'empty',
}: ProjectSyncJobActionTriggerProps) {
  const t = useTranslations('projectSyncJobs');
  const scope = useScopeFromParams();
  const projectGrantContext = useProjectSyncJobGrantContext();
  const setStartDialogOpen = useProjectSyncJobsStore((s) => s.setStartDialogOpen);
  const setExportDialogOpen = useProjectSyncJobsStore((s) => s.setExportDialogOpen);

  const { icon: Icon, labelKey } = VARIANT_CONFIG[variant];
  const label = t(labelKey);
  const open = () => (variant === 'import' ? setStartDialogOpen(true) : setExportDialogOpen(true));

  const { isGranted, isLoading } = useGrant(ResourceSlug.ProjectSyncJob, ResourceAction.Update, {
    scope,
    context: projectGrantContext,
    returnLoading: true,
  }) as UseGrantResult;

  const toolbarClassName = cn(
    'w-full sm:w-auto',
    'min-[640px]:max-[1199px]:size-9 min-[640px]:max-[1199px]:min-w-9 min-[640px]:max-[1199px]:max-w-9 min-[640px]:max-[1199px]:p-2',
    'min-[1200px]:size-auto min-[1200px]:min-w-0 min-[1200px]:max-w-none'
  );

  if (isLoading) {
    if (layout === 'toolbar') {
      return (
        <Button type="button" disabled className={toolbarClassName} aria-label={label}>
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span className="inline min-[640px]:max-[1199px]:hidden min-[1200px]:inline">
            {label}
          </span>
        </Button>
      );
    }
    return (
      <Button type="button" disabled className="gap-2" variant="default">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        {label}
      </Button>
    );
  }

  if (!isGranted) {
    return null;
  }

  if (layout === 'toolbar') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" onClick={open} className={toolbarClassName} aria-label={label}>
            <Icon className="size-4 shrink-0" />
            <span className="inline min-[640px]:max-[1199px]:hidden min-[1200px]:inline">
              {label}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button type="button" onClick={open} className="gap-2">
      <Icon className="size-4 shrink-0" />
      {label}
    </Button>
  );
}
