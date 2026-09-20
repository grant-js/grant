'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ProjectOAuthConnectionProvider, Scope } from '@grantjs/schema';

import { getProjectOAuthConnectionsUrl } from '@/lib/entity-detail-url';

import { useProjectOAuthConnections } from './use-project-oauth-connections';

const SOCIAL_PROVIDERS = [
  ProjectOAuthConnectionProvider.Github,
  ProjectOAuthConnectionProvider.Google,
] as const;

function paramString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function useProjectOAuthConnectionNav(scope: Scope | null) {
  const params = useParams();
  const { connections } = useProjectOAuthConnections(scope);

  const configuredProviders = useMemo(() => {
    const configured = new Set<string>();
    for (const connection of connections) {
      if (connection.isConfigured) {
        configured.add(connection.provider);
      }
    }
    return configured;
  }, [connections]);

  const connectionHrefByProvider = useMemo(() => {
    const projectId = paramString(params.projectId as string | string[] | undefined);
    const organizationId = paramString(params.organizationId as string | string[] | undefined);
    const accountId = paramString(params.accountId as string | string[] | undefined);
    if (!projectId) {
      return {};
    }

    const hrefs: Partial<Record<string, string>> = {};
    for (const provider of SOCIAL_PROVIDERS) {
      try {
        hrefs[provider] = getProjectOAuthConnectionsUrl({
          organizationId,
          accountId,
          projectId,
          provider,
        });
      } catch {
        // Page is outside org/personal project routes.
      }
    }
    return hrefs;
  }, [params.accountId, params.organizationId, params.projectId]);

  return { configuredProviders, connectionHrefByProvider };
}
