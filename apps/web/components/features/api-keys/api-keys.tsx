'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Scope } from '@grantjs/schema';

import { FeatureModuleCard } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useApiKeysStore } from '@/stores/api-keys.store';

import { ApiKeyPagination } from './api-key-pagination';
import { ApiKeyToolbar } from './api-key-toolbar';
import { ApiKeyViewer } from './api-key-viewer';

export interface ApiKeysProps {
  /** When not provided, scope is derived from URL params (e.g. user detail or project API keys page). */
  scope?: Scope | null;
}

/**
 * Embedded API keys view for use inside a card (e.g. user detail view).
 * Renders a card with title, toolbar, table viewer, and pagination.
 * For project-level API keys pages use DashboardLayout with ApiKeyToolbar, ApiKeyViewer, and ApiKeyPagination directly.
 */
export function ApiKeys({ scope: scopeProp }: ApiKeysProps) {
  const scopeFromParams = useScopeFromParams();
  const scope = scopeProp ?? scopeFromParams;

  const t = useTranslations('user.apiKeys');
  const limit = useApiKeysStore((state) => state.limit);
  const totalCount = useApiKeysStore((state) => state.totalCount);

  const canQuery = useGrant(ResourceSlug.ApiKey, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      collapsible
      toolbar={<ApiKeyToolbar showViewSwitcher={false} showSorter={false} />}
      footer={totalPages > 1 ? <ApiKeyPagination /> : undefined}
    >
      <ApiKeyViewer scope={scope} forcedView="table" embedded />
    </FeatureModuleCard>
  );
}
