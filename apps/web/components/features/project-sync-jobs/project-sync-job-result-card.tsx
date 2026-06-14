'use client';

import { useTranslations } from 'next-intl';
import { ProjectSyncJob, ProjectSyncJobStatus } from '@grantjs/schema';
import { ArrowLeftRight } from 'lucide-react';

import { FeatureModuleCard } from '@/components/common';

/** Result counters that render `left` + ArrowLeftRight + `right` labels. */
const RESULT_LINK_KEYS = new Set<string>([
  'roleGroupsLinked',
  'groupPermissionsLinked',
  'projectRolesLinked',
  'projectGroupsLinked',
  'projectPermissionsLinked',
  'projectResourcesLinked',
]);

interface ProjectSyncJobResultCardProps {
  job: ProjectSyncJob;
}

export function ProjectSyncJobResultCard({ job }: ProjectSyncJobResultCardProps) {
  const t = useTranslations('projectSyncJobs.detail');
  const tResult = useTranslations('projectSyncJobs.viewDialog.result');

  const isCompleted = job.status === ProjectSyncJobStatus.Completed;
  const result = job.result;

  return (
    <FeatureModuleCard title={t('result.title')} description={t('result.description')} collapsible>
      {!isCompleted || !result ? (
        <p className="text-sm text-muted-foreground">{tResult('notAvailable')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['rolesCreated', result.rolesCreated],
            ['groupsCreated', result.groupsCreated],
            ['roleGroupsLinked', result.roleGroupsLinked],
            ['groupPermissionsLinked', result.groupPermissionsLinked],
            ['projectRolesLinked', result.projectRolesLinked],
            ['projectGroupsLinked', result.projectGroupsLinked],
            ['projectPermissionsLinked', result.projectPermissionsLinked],
            ['projectResourcesLinked', result.projectResourcesLinked],
            ['projectUsersEnsured', result.projectUsersEnsured],
            ['usersCreated', result.usersCreated ?? 0],
            ['userRolesAssigned', result.userRolesAssigned],
            ['projectUserApiKeysCreated', result.projectUserApiKeysCreated],
          ].map(([key, value]) => (
            <div key={key as string} className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                {RESULT_LINK_KEYS.has(key as string) ? (
                  <span className="inline-flex items-center gap-1">
                    <span>{tResult(`${key as string}.left`)}</span>
                    <ArrowLeftRight className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                    <span>{tResult(`${key as string}.right`)}</span>
                  </span>
                ) : (
                  tResult(key as string)
                )}
              </p>
              <p className="text-lg font-semibold">{value as number}</p>
            </div>
          ))}
        </div>
      )}
    </FeatureModuleCard>
  );
}
