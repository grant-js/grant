'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, ApiKeySortableField, SortOrder } from '@grantjs/schema';
import { format } from 'date-fns';
import { Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  CopyToClipboard,
  DataTable,
  Pagination,
  RefreshButton,
  Toolbar,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { useApiKeys } from '@/hooks/api-keys';
import { useScopeFromParams } from '@/hooks/common';
import { useUserStore } from '@/stores/user.store';

import { UserApiKeyActions } from './user-api-key-actions';
import { UserApiKeyCreateDialog } from './user-api-key-create-dialog';
import { UserApiKeySearch } from './user-api-key-search';
import { UserApiKeySecretDialog } from './user-api-key-secret-dialog';
import { UserApiKeySorter } from './user-api-key-sorter';

export function UserApiKeys() {
  const t = useTranslations('user.apiKeys');
  const page = useUserStore((state) => state.apiKeysPage);
  const limit = useUserStore((state) => state.apiKeysLimit);
  const search = useUserStore((state) => state.apiKeysSearch);
  const sort = useUserStore((state) => state.apiKeysSort);
  const secretDialogOpen = useUserStore((state) => state.apiKeysSecretDialogOpen);
  const createdApiKey = useUserStore((state) => state.createdApiKey);
  const apiKeysRefetch = useUserStore((state) => state.apiKeysRefetch);

  const setPage = useUserStore((state) => state.setApiKeysPage);
  const setSearch = useUserStore((state) => state.setApiKeysSearch);
  const setSort = useUserStore((state) => state.setApiKeysSort);
  const setSecretDialogOpen = useUserStore((state) => state.setApiKeysSecretDialogOpen);
  const setCreatedApiKey = useUserStore((state) => state.setCreatedApiKey);
  const handleApiKeyCreated = useUserStore((state) => state.handleApiKeyCreated);
  const setApiKeysRefetch = useUserStore((state) => state.setApiKeysRefetch);

  const scope = useScopeFromParams();

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

  const canQuery = useGrant(ResourceSlug.ApiKey, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  const totalPages = Math.ceil(totalCount / limit);

  const handleSortChange = (field: ApiKeySortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
  };

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
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <p className="text-sm text-destructive">{t('error')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <Toolbar
            items={[
              <RefreshButton
                key="refresh"
                onRefresh={apiKeysRefetch ?? undefined}
                loading={loading}
              />,
              (totalPages > 1 || search.length > 0) && (
                <UserApiKeySearch
                  key="search"
                  search={search}
                  onSearchChange={handleSearchChange}
                />
              ),
              totalCount > 0 && (
                <UserApiKeySorter key="sorter" sort={sort} onSortChange={handleSortChange} />
              ),
              <UserApiKeyCreateDialog key="create" onApiKeyCreated={handleApiKeyCreated} />,
            ]}
          />
        </div>
        <DataTable
          data={apiKeys}
          columns={columns}
          loading={loading}
          emptyState={{
            icon: <Fingerprint />,
            title: t('empty'),
            description: t('emptyDescription'),
            action: <UserApiKeyCreateDialog onApiKeyCreated={handleApiKeyCreated} />,
          }}
          actionsColumn={{
            render: (apiKey: ApiKey) => <UserApiKeyActions apiKey={apiKey} scope={scope!} />,
          }}
          skeletonConfig={skeletonConfig}
        />
        {totalPages > 1 && (
          <div className="mt-4 border-t">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
      {createdApiKey && (
        <UserApiKeySecretDialog
          open={secretDialogOpen}
          onOpenChange={(open) => {
            setSecretDialogOpen(open);
            if (!open) {
              setCreatedApiKey(null);
            }
          }}
          clientId={createdApiKey.clientId}
          clientSecret={createdApiKey.clientSecret}
        />
      )}
    </>
  );
}
