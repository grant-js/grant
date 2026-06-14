'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { FlaskConical } from 'lucide-react';

import { Toolbar } from '@/components/common';
import { PROJECT_APP_TEST_FORM_ID } from '@/components/features/project-app/project-app-test-types';
import { Button } from '@/components/ui/button';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useRouter } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';
import { useProjectAppsStore } from '@/stores/project-apps.store';

export function ProjectAppTestToolbar() {
  const t = useTranslations('projectApp.test');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const currentProjectApp = useProjectAppsStore((state) => state.currentProjectApp);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);
  const canQuery = useGrant(ResourceSlug.ProjectApp, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || requiresEmailVerification || !canQuery) {
    return null;
  }

  const hasRedirectUris = (currentProjectApp?.redirectUris?.length ?? 0) > 0;
  const canSubmit = Boolean(currentProjectApp?.clientId && hasRedirectUris);

  const handleCancel = () => {
    router.push(
      getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string,
        entitySegment: 'apps',
        entityId: params.appId as string,
      })
    );
  };

  return (
    <Toolbar
      alwaysRow
      items={[
        <Button
          key="cancel"
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="w-full sm:w-auto"
        >
          {tCommon('actions.cancel')}
        </Button>,
        <Button
          key="submit"
          type="submit"
          form={PROJECT_APP_TEST_FORM_ID}
          disabled={!canSubmit}
          className="w-full sm:w-auto"
        >
          <FlaskConical className="size-4 shrink-0" />
          {t('confirm')}
        </Button>,
      ]}
    />
  );
}
