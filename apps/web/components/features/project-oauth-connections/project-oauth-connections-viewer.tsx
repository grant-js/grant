'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ProjectOAuthConnectionProvider, Scope } from '@grantjs/schema';
import { ExternalLink } from 'lucide-react';

import { CopyToClipboard, FeatureModuleCard } from '@/components/common';
import { FeatureDetailLayout } from '@/components/layout';
import { useEmailVerified } from '@/hooks/auth';
import { useProjectGrantContext } from '@/hooks/common';
import {
  useProjectOAuthConnectionMutations,
  useProjectOAuthConnections,
} from '@/hooks/project-oauth-connections';
import { getDocsUrl } from '@/lib/constants';
import { getProjectOAuthBrokerCallbackUrl } from '@/lib/project-oauth-callback-url';

import { ProjectOAuthConnectionProviderSection } from './project-oauth-connection-provider-section';

const SOCIAL_PROVIDERS: ProjectOAuthConnectionProvider[] = [
  ProjectOAuthConnectionProvider.Github,
  ProjectOAuthConnectionProvider.Google,
];

interface ProjectOAuthConnectionsViewerProps {
  scope: Scope | null;
}

export function ProjectOAuthConnectionsViewer({ scope }: ProjectOAuthConnectionsViewerProps) {
  const t = useTranslations('projects.oauthConnections');
  const tCommon = useTranslations('common');
  const isEmailVerified = useEmailVerified();
  const projectGrantContext = useProjectGrantContext();
  const { connections, loading, error } = useProjectOAuthConnections(scope);
  const { upsertProjectOAuthConnection, clearProjectOAuthConnection } =
    useProjectOAuthConnectionMutations();

  const canUpdate = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: scope!,
    context: projectGrantContext,
    enabled: !!scope,
  });

  const canEdit = canUpdate && isEmailVerified;
  const callbackUrl = getProjectOAuthBrokerCallbackUrl();
  const docsUrl = `${getDocsUrl()}/core-concepts/project-oauth`;

  const connectionByProvider = useMemo(() => {
    const map = new Map<ProjectOAuthConnectionProvider, (typeof connections)[number]>();
    for (const connection of connections) {
      map.set(connection.provider, connection);
    }
    return map;
  }, [connections]);

  if (loading && connections.length === 0) {
    return <p className="text-muted-foreground">{tCommon('loading')}</p>;
  }

  if (error) {
    return <p className="text-destructive">{t('loadError')}</p>;
  }

  if (!scope) {
    return null;
  }

  return (
    <FeatureDetailLayout>
      <FeatureModuleCard title={t('callback.title')} description={t('callback.description')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm break-all">
            {callbackUrl}
          </code>
          <CopyToClipboard text={callbackUrl} variant="outline" showText />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('callback.hint')}{' '}
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            {t('docsLink')}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </p>
      </FeatureModuleCard>

      <FeatureModuleCard title={t('title')} description={t('description')}>
        <div className="space-y-4">
          {SOCIAL_PROVIDERS.map((provider) => (
            <ProjectOAuthConnectionProviderSection
              key={provider}
              provider={provider}
              connection={connectionByProvider.get(provider)}
              disabled={!canEdit}
              onSave={(values) =>
                upsertProjectOAuthConnection({
                  scope,
                  provider,
                  clientId: values.clientId.trim(),
                  clientSecret: values.clientSecret,
                })
              }
              onClear={() => clearProjectOAuthConnection({ scope, provider })}
            />
          ))}
        </div>
      </FeatureModuleCard>
    </FeatureDetailLayout>
  );
}
