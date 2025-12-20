'use client';

import { useMemo } from 'react';

import { useParams } from 'next/navigation';

import { ApiKey, ApiKeySortableField, SortOrder, Tenant } from '@logusgraphics/grant-schema';
import { format } from 'date-fns';
import { Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar, CopyToClipboard, Pagination, Toolbar } from '@/components/common';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { useApiKeys } from '@/hooks/api-keys';
import { useUserStore } from '@/stores/user.store';

import { ApiKeyActions } from './ApiKeyActions';
import { ApiKeySecretDialog } from './ApiKeySecretDialog';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { UserApiKeySearch } from './UserApiKeySearch';
import { UserApiKeySorter } from './UserApiKeySorter';

export function UserApiKeys() {
  const t = useTranslations('user.apiKeys');
  const params = useParams();
  const projectId = params.projectId as string;
  const userId = params.userId as string;

  const page = useUserStore((state) => state.apiKeysPage);
  const limit = useUserStore((state) => state.apiKeysLimit);
  const search = useUserStore((state) => state.apiKeysSearch);
  const sort = useUserStore((state) => state.apiKeysSort);
  const secretDialogOpen = useUserStore((state) => state.apiKeysSecretDialogOpen);
  const createdApiKey = useUserStore((state) => state.createdApiKey);

  const setPage = useUserStore((state) => state.setApiKeysPage);
  const setSearch = useUserStore((state) => state.setApiKeysSearch);
  const setSort = useUserStore((state) => state.setApiKeysSort);
  const setSecretDialogOpen = useUserStore((state) => state.setApiKeysSecretDialogOpen);
  const setCreatedApiKey = useUserStore((state) => state.setCreatedApiKey);
  const handleApiKeyCreated = useUserStore((state) => state.handleApiKeyCreated);

  const scope = useMemo(
    () => ({
      tenant: Tenant.ProjectUser,
      id: `${projectId}:${userId}`,
    }),
    [projectId, userId]
  );

  const { apiKeys, loading, error, totalCount } = useApiKeys({
    scope: scope!,
    page,
    limit,
    search,
    sort,
  });

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

  const columns: ColumnConfig<ApiKey>[] = [
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

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
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
              <UserApiKeySearch
                key="search"
                search={search}
                onSearchChange={handleSearchChange}
                show={totalPages > 1 || search.length > 0}
              />,
              totalCount > 0 && (
                <UserApiKeySorter key="sorter" sort={sort} onSortChange={handleSortChange} />
              ),
              <CreateApiKeyDialog key="create" onApiKeyCreated={handleApiKeyCreated} />,
            ].filter(Boolean)}
          />
        </div>
        <DataTable
          data={apiKeys}
          columns={columns}
          loading={loading}
          emptyState={{
            icon: <Fingerprint className="h-12 w-12" />,
            title: t('empty'),
            description: t('emptyDescription'),
            action: <CreateApiKeyDialog onApiKeyCreated={handleApiKeyCreated} />,
          }}
          actionsColumn={{
            render: (apiKey: ApiKey) => <ApiKeyActions apiKey={apiKey} scope={scope!} />,
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
        <ApiKeySecretDialog
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
