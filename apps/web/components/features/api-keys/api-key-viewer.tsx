'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, Scope, Tenant } from '@grantjs/schema';
import { format } from 'date-fns';
import { Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  CopyToClipboard,
  DataTable,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { useApiKeys } from '@/hooks/api-keys';
import { useScopeFromParams } from '@/hooks/common';
import { useUserStore } from '@/stores/user.store';

import { ApiKeyActions } from './api-key-actions';
import { ApiKeyCreateDialog } from './api-key-create-dialog';
import { ApiKeySecretDialog } from './api-key-secret-dialog';

export interface ApiKeyViewerProps {
  /** When not provided, scope is derived from URL params. */
  scope?: Scope | null;
}

export function ApiKeyViewer({ scope: scopeProp }: ApiKeyViewerProps) {
  const scopeFromParams = useScopeFromParams();
  const scope = scopeProp ?? scopeFromParams;

  const t = useTranslations('user.apiKeys');
  const tRoot = useTranslations();
  const page = useUserStore((state) => state.apiKeysPage);
  const limit = useUserStore((state) => state.apiKeysLimit);
  const search = useUserStore((state) => state.apiKeysSearch);
  const sort = useUserStore((state) => state.apiKeysSort);
  const secretDialogOpen = useUserStore((state) => state.apiKeysSecretDialogOpen);
  const createdApiKey = useUserStore((state) => state.createdApiKey);
  const setApiKeysTotalCount = useUserStore((state) => state.setApiKeysTotalCount);
  const setApiKeysRefetch = useUserStore((state) => state.setApiKeysRefetch);
  const setApiKeysLoading = useUserStore((state) => state.setApiKeysLoading);
  const setSecretDialogOpen = useUserStore((state) => state.setApiKeysSecretDialogOpen);
  const setCreatedApiKey = useUserStore((state) => state.setCreatedApiKey);
  const handleApiKeyCreated = useUserStore((state) => state.handleApiKeyCreated);

  const { apiKeys, loading, error, totalCount, refetch } = useApiKeys({
    scope: scope!,
    page,
    limit,
    search,
    sort,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setApiKeysRefetch(handleRefetch);
    return () => setApiKeysRefetch(null);
  }, [handleRefetch, setApiKeysRefetch]);

  useEffect(() => {
    setApiKeysLoading(loading);
  }, [loading, setApiKeysLoading]);

  useEffect(() => {
    setApiKeysTotalCount(totalCount);
  }, [totalCount, setApiKeysTotalCount]);

  const canQuery = useGrant(ResourceSlug.ApiKey, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  const showRoleColumn =
    scope.tenant === Tenant.AccountProject || scope.tenant === Tenant.OrganizationProject;

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return t('never');
    try {
      const dateObj = date instanceof Date ? date : new Date(date as string);
      if (isNaN(dateObj.getTime())) return t('never');
      return format(dateObj, 'MMM d, yyyy');
    } catch {
      return t('never');
    }
  };

  const columns: DataTableColumnConfig<ApiKey>[] = [
    {
      key: 'icon',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: (apiKey: ApiKey) => (
        <div className="flex items-center justify-center">
          <Avatar
            initial={apiKey.name?.charAt(0) || apiKey.clientId.charAt(0)}
            size="sm"
            icon={<Fingerprint className="h-3 w-3 text-muted-foreground" />}
          />
        </div>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '200px',
      render: (apiKey: ApiKey) => (
        <span className="text-sm font-medium">{apiKey.name || apiKey.clientId}</span>
      ),
    },
    {
      key: 'clientId',
      header: t('table.clientId'),
      width: '300px',
      render: (apiKey: ApiKey) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-mono">{apiKey.clientId}</span>
          <CopyToClipboard text={apiKey.clientId} size="sm" variant="ghost" />
        </div>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      render: (apiKey: ApiKey) => (
        <span className="text-sm text-muted-foreground">
          {apiKey.description || t('noDescription')}
        </span>
      ),
    },
    ...(showRoleColumn
      ? [
          {
            key: 'role',
            header: t('table.role'),
            width: '150px',
            render: (apiKey: ApiKey) => (
              <span className="text-sm text-muted-foreground">
                {tRoot(apiKey.role?.name ?? '—')}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'status',
      header: t('table.status'),
      width: '120px',
      render: (apiKey: ApiKey) => (
        <span
          className={`text-sm ${
            apiKey.isRevoked
              ? 'text-destructive'
              : apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
                ? 'text-orange-500'
                : 'text-green-600'
          }`}
        >
          {apiKey.isRevoked
            ? t('status.revoked')
            : apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
              ? t('status.expired')
              : t('status.active')}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: t('table.expiresAt'),
      width: '150px',
      render: (apiKey: ApiKey) => (
        <span className="text-sm text-muted-foreground">{formatDate(apiKey.expiresAt)}</span>
      ),
    },
    {
      key: 'lastUsedAt',
      header: t('table.lastUsedAt'),
      width: '150px',
      render: (apiKey: ApiKey) => (
        <span className="text-sm text-muted-foreground">{formatDate(apiKey.lastUsedAt)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('table.createdAt'),
      width: '150px',
      render: (apiKey: ApiKey) => (
        <span className="text-sm text-muted-foreground">{formatDate(apiKey.createdAt)}</span>
      ),
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'icon', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'clientId', type: 'text' },
      { key: 'description', type: 'text' },
      ...(showRoleColumn ? [{ key: 'role' as const, type: 'text' as const }] : []),
      { key: 'status', type: 'text' },
      { key: 'expiresAt', type: 'text' },
      { key: 'lastUsedAt', type: 'text' },
      { key: 'createdAt', type: 'text' },
    ],
    rowCount: 5,
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-destructive">{t('error')}</p>
      </div>
    );
  }

  return (
    <>
      <DataTable
        data={apiKeys}
        columns={columns}
        loading={loading}
        emptyState={{
          icon: <Fingerprint />,
          title: t('empty'),
          description: t('emptyDescription'),
          action: <ApiKeyCreateDialog onApiKeyCreated={handleApiKeyCreated} />,
        }}
        actionsColumn={{
          render: (apiKey: ApiKey) => <ApiKeyActions apiKey={apiKey} scope={scope!} />,
        }}
        skeletonConfig={skeletonConfig}
      />
      {createdApiKey && (
        <ApiKeySecretDialog
          open={secretDialogOpen}
          onOpenChange={(open) => {
            setSecretDialogOpen(open);
            if (!open) setCreatedApiKey(null);
          }}
          clientId={createdApiKey.clientId}
          clientSecret={createdApiKey.clientSecret}
        />
      )}
    </>
  );
}
