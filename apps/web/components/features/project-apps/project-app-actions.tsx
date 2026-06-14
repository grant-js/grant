'use client';

import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import type { ProjectApp, Scope } from '@grantjs/schema';
import { FlaskConical, Pencil, Trash2 } from 'lucide-react';

import { type ActionItem, Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useRouter } from '@/i18n/navigation';
import { getProjectAppTestUrl } from '@/lib/entity-detail-url';
import { useProjectAppsStore } from '@/stores/project-apps.store';

export interface ProjectAppActionsProps {
  projectApp: ProjectApp;
  scope: Scope;
}

export function ProjectAppActions({ projectApp, scope }: ProjectAppActionsProps) {
  const t = useTranslations('projectApps.actions');
  const params = useParams();
  const router = useRouter();
  const setProjectAppToEdit = useProjectAppsStore((state) => state.setProjectAppToEdit);
  const setProjectAppToDelete = useProjectAppsStore((state) => state.setProjectAppToDelete);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) setHasBeenOpened(true);
    },
    [hasBeenOpened]
  );

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.ProjectApp,
    ResourceAction.Update,
    { scope, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.ProjectApp,
    ResourceAction.Delete,
    { scope, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canQuery, isLoading: isTestLoading } = useGrant(
    ResourceSlug.ProjectApp,
    ResourceAction.Query,
    { scope, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;

  const canTest = canQuery && (projectApp.redirectUris?.length ?? 0) > 0;
  const permissionsResolved = hasBeenOpened && !isUpdateLoading && !isDeleteLoading;
  if (permissionsResolved && !canUpdate && !canDelete && !canTest) return null;

  // Build actions array based on permissions
  const actions: ActionItem<ProjectApp>[] = [];

  if (canTest) {
    actions.push({
      key: 'test',
      label: t('test'),
      icon: <FlaskConical className="mr-2 h-4 w-4" />,
      onClick: () =>
        router.push(
          getProjectAppTestUrl({
            organizationId: params.organizationId as string | undefined,
            accountId: params.accountId as string | undefined,
            projectId: params.projectId as string,
            appId: projectApp.id,
          })
        ),
    });
  }

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('edit'),
      icon: <Pencil className="mr-2 h-4 w-4" />,
      onClick: () => setProjectAppToEdit(projectApp),
    });
  }

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: () => setProjectAppToDelete(projectApp),
      variant: 'destructive',
    });
  }

  const isLoading = hasBeenOpened && (isUpdateLoading || isDeleteLoading || isTestLoading);

  return (
    <Actions
      entity={projectApp}
      actions={actions}
      onOpenChange={handleOpenChange}
      isLoading={isLoading}
    />
  );
}
