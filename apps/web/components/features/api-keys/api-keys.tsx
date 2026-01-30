'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Scope } from '@grantjs/schema';
import { useTranslations } from 'next-intl';

import { useScopeFromParams } from '@/hooks/common';
import { useUserStore } from '@/stores/user.store';

import { ApiKeyPagination } from './api-key-pagination';
import { ApiKeyToolbar } from './api-key-toolbar';
import { ApiKeyViewer } from './api-key-viewer';

export interface ApiKeysProps {
  /** When not provided, scope is derived from URL params (e.g. user detail or project API keys page). */
  scope?: Scope | null;
}

/**
 * Embedded API keys view for use inside a card (e.g. user detail view).
 * Renders a card with title, toolbar, viewer (table), and pagination.
 * For project-level API keys pages use DashboardLayout with ApiKeyToolbar, ApiKeyViewer, and ApiKeyPagination directly.
 */
export function ApiKeys({ scope: scopeProp }: ApiKeysProps) {
  const scopeFromParams = useScopeFromParams();
  const scope = scopeProp ?? scopeFromParams;

  const t = useTranslations('user.apiKeys');
  const limit = useUserStore((state) => state.apiKeysLimit);
  const totalCount = useUserStore((state) => state.apiKeysTotalCount);

  const canQuery = useGrant(ResourceSlug.ApiKey, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <ApiKeyToolbar />
      </div>
      <ApiKeyViewer scope={scope} />
      {totalPages > 1 && (
        <div className="mt-4 border-t pt-4">
          <ApiKeyPagination />
        </div>
      )}
    </div>
  );
}
