'use client';

import { useTranslations } from 'next-intl';
import { ApiKey } from '@grantjs/schema';
import { Calendar, KeyRound, Shield } from 'lucide-react';

import {
  CardBody,
  CardGrid,
  CardHeader,
  CopyToClipboard,
  EntityNavigationButton,
} from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { isProjectApiKeyScope } from '@/lib/api-key-grants';
import { useApiKeysStore } from '@/stores/api-keys.store';

import { ApiKeyActions } from './api-key-actions';
import { ApiKeyAudit } from './api-key-audit';
import { ApiKeyCardSkeleton } from './api-key-card-skeleton';
import { ApiKeyCreateAction } from './api-key-create-action';
import { useApiKeyGrantLabel } from './use-api-key-grant-label';

export function ApiKeyCards() {
  const t = useTranslations('user.apiKeys');
  const grantLabel = useApiKeyGrantLabel();
  const scope = useScopeFromParams();
  const apiKeys = useApiKeysStore((state) => state.apiKeys);
  const loading = useApiKeysStore((state) => state.loading);
  const search = useApiKeysStore((state) => state.search);
  const limit = useApiKeysStore((state) => state.limit);
  const handleApiKeyCreated = useApiKeysStore((state) => state.handleApiKeyCreated);

  const hasActiveFilters = search.trim() !== '';

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return t('never');
    try {
      const dateObj = date instanceof Date ? date : new Date(date as string);
      if (Number.isNaN(dateObj.getTime())) return t('never');
      return dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return t('never');
    }
  };

  const statusLabel = (apiKey: ApiKey): string => {
    if (apiKey.isRevoked) return t('status.revoked');
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return t('status.expired');
    return t('status.active');
  };

  const showRole = isProjectApiKeyScope(scope);

  if (!scope) return null;

  return (
    <CardGrid<ApiKey>
      entities={apiKeys}
      loading={loading}
      emptyState={{
        icon: <KeyRound />,
        title: hasActiveFilters ? t('empty') : t('empty'),
        description: hasActiveFilters ? '' : t('emptyDescription'),
        action: hasActiveFilters ? undefined : (
          <ApiKeyCreateAction onApiKeyCreated={handleApiKeyCreated} alwaysShowLabel />
        ),
      }}
      skeleton={{
        component: <ApiKeyCardSkeleton />,
        count: limit,
      }}
      renderHeader={(apiKey: ApiKey) => (
        <CardHeader
          avatar={{
            initial: (apiKey.name || apiKey.clientId).charAt(0),
            size: 'lg',
            icon: <KeyRound className="h-3 w-3 text-muted-foreground" />,
          }}
          title={apiKey.name || apiKey.clientId}
          description={apiKey.description || t('noDescription')}
          actions={<ApiKeyActions apiKey={apiKey} scope={scope} />}
        />
      )}
      renderBody={(apiKey: ApiKey) => (
        <CardBody
          items={[
            {
              label: {
                icon: <KeyRound className="h-3 w-3" />,
                text: t('table.clientId'),
              },
              value: (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-mono truncate">
                    {apiKey.clientId}
                  </span>
                  <CopyToClipboard text={apiKey.clientId} size="sm" variant="ghost" />
                </div>
              ),
            },
            ...(showRole && (apiKey.role || apiKey.permissions)
              ? [
                  {
                    label: {
                      icon: <Shield className="h-3 w-3" />,
                      text: t('table.role'),
                    },
                    value: (
                      <span className="text-sm text-muted-foreground">{grantLabel(apiKey)}</span>
                    ),
                  },
                ]
              : []),
            {
              label: {
                icon: <Calendar className="h-3 w-3" />,
                text: t('table.status'),
              },
              value: (
                <span
                  className={`text-sm ${
                    apiKey.isRevoked
                      ? 'text-destructive'
                      : apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
                        ? 'text-orange-500'
                        : 'text-green-600'
                  }`}
                >
                  {statusLabel(apiKey)}
                </span>
              ),
            },
            {
              label: {
                icon: <Calendar className="h-3 w-3" />,
                text: t('table.expiresAt'),
              },
              value: (
                <span className="text-sm text-muted-foreground">
                  {formatDate(apiKey.expiresAt)}
                </span>
              ),
            },
            {
              label: {
                icon: <Calendar className="h-3 w-3" />,
                text: t('table.lastUsedAt'),
              },
              value: (
                <span className="text-sm text-muted-foreground">
                  {formatDate(apiKey.lastUsedAt)}
                </span>
              ),
            },
          ]}
        />
      )}
      renderFooter={(apiKey: ApiKey) =>
        showRole ? (
          <div className="flex w-full items-center justify-between gap-2">
            <ApiKeyAudit apiKey={apiKey} />
            <EntityNavigationButton
              entitySegment="api-keys"
              entityId={apiKey.id}
              ariaLabel={t('actions.view')}
              size="lg"
            />
          </div>
        ) : (
          <ApiKeyAudit apiKey={apiKey} />
        )
      }
    />
  );
}
