'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { FlaskConical } from 'lucide-react';

import { Toolbar } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useRouter } from '@/i18n/navigation';
import { getProjectAppTestUrl } from '@/lib/entity-detail-url';
import { cn } from '@/lib/utils';
import { useProjectAppsStore } from '@/stores/project-apps.store';

export function ProjectAppDetailToolbar() {
  const t = useTranslations('projectApps.actions');
  const tTest = useTranslations('projectApp.test');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const currentProjectApp = useProjectAppsStore((state) => state.currentProjectApp);

  const canQuery = useGrant(ResourceSlug.ProjectApp, ResourceAction.Query, {
    scope: scope!,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification || !canQuery || !currentProjectApp) {
    return null;
  }

  const hasRedirectUris = (currentProjectApp.redirectUris?.length ?? 0) > 0;

  return (
    <Toolbar
      items={[
        <Tooltip key="test">
          <TooltipTrigger asChild>
            <Button
              className={cn(
                'w-full sm:w-auto',
                'min-[640px]:max-[1199px]:size-9 min-[640px]:max-[1199px]:min-w-9 min-[640px]:max-[1199px]:max-w-9 min-[640px]:max-[1199px]:p-2',
                'min-[1200px]:size-auto min-[1200px]:min-w-0 min-[1200px]:max-w-none'
              )}
              onClick={() =>
                router.push(
                  getProjectAppTestUrl({
                    organizationId: params.organizationId as string | undefined,
                    accountId: params.accountId as string | undefined,
                    projectId: params.projectId as string,
                    appId: currentProjectApp.id,
                  })
                )
              }
              disabled={!hasRedirectUris}
              aria-label={t('test')}
            >
              <FlaskConical className="size-4 shrink-0" />
              <span className="inline min-[640px]:max-[1199px]:hidden min-[1200px]:inline">
                {t('test')}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{hasRedirectUris ? t('test') : tTest('noRedirectUris')}</p>
          </TooltipContent>
        </Tooltip>,
      ]}
    />
  );
}
