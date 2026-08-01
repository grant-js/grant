'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, Scope, Tenant } from '@grantjs/schema';
import { format } from 'date-fns';
import { KeyRound } from 'lucide-react';

import {
  Avatar,
  CopyToClipboard,
  DataTable,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import {
  USER_DETAIL_ICON_ONLY_COLUMN,
  USER_DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS,
  USER_DETAIL_ICON_ONLY_SKELETON,
  USER_DETAIL_TEXT_COLUMN,
  UserDetailTableIconCell,
} from '@/components/features/user/user-detail-table-layout';
import { useApiKeys } from '@/hooks/api-keys';
import { useDetailTableColumnVisibility, useScopeFromParams } from '@/hooks/common';
import { API_KEY_DEFAULT_HIDDEN_COLUMN_KEYS } from '@/lib/detail-table-column-visibility';
import { type ApiKeyView, useApiKeysStore } from '@/stores/api-keys.store';

import { ApiKeyActions } from './api-key-actions';
import { ApiKeyAudit } from './api-key-audit';
import { ApiKeyCards } from './api-key-cards';
import { ApiKeyCreateDialog } from './api-key-create-dialog';
import { ApiKeySecretDialog } from './api-key-secret-dialog';

export interface ApiKeyViewerProps {
  /** When not provided, scope is derived from URL params. */
  scope?: Scope | null;
  /** When set, overrides the store view (e.g. force table in embedded detail view). */
  forcedView?: ApiKeyView;
  /** When true, renders table content only (parent provides card chrome). */
  embedded?: boolean;
}

export function ApiKeyViewer({
  scope: scopeProp,
  forcedView,
  embedded = false,
}: ApiKeyViewerProps) {
  const scopeFromParams = useScopeFromParams();
  const scope = scopeProp ?? scopeFromParams;

  const t = useTranslations('user.apiKeys');
  const tRoot = useTranslations();
  const page = useApiKeysStore((state) => state.page);
  const limit = useApiKeysStore((state) => state.limit);
  const search = useApiKeysStore((state) => state.search);
  const sort = useApiKeysStore((state) => state.sort);
  const secretDialogOpen = useApiKeysStore((state) => state.secretDialogOpen);
  const secretDialogMode = useApiKeysStore((state) => state.secretDialogMode);
  const createdApiKey = useApiKeysStore((state) => state.createdApiKey);
  const setTotalCount = useApiKeysStore((state) => state.setTotalCount);
  const setRefetch = useApiKeysStore((state) => state.setRefetch);
  const setLoading = useApiKeysStore((state) => state.setLoading);
  const setApiKeys = useApiKeysStore((state) => state.setApiKeys);
  const setSecretDialogOpen = useApiKeysStore((state) => state.setSecretDialogOpen);
  const setCreatedApiKey = useApiKeysStore((state) => state.setCreatedApiKey);
  const handleApiKeyCreated = useApiKeysStore((state) => state.handleApiKeyCreated);
  const storeView = useApiKeysStore((state) => state.view);
  const setColumnToggle = useApiKeysStore((state) => state.setColumnToggle);
  const clearColumnToggle = useApiKeysStore((state) => state.clearColumnToggle);
  const view = forcedView ?? storeView;

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
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    setTotalCount(totalCount);
  }, [totalCount, setTotalCount]);

  useEffect(() => {
    setApiKeys(apiKeys);
  }, [apiKeys, setApiKeys]);

  const canQuery = useGrant(ResourceSlug.ApiKey, ResourceAction.Query, {
    scope: scope!,
  });

  const showRoleColumn =
    scope != null &&
    (scope.tenant === Tenant.AccountProject || scope.tenant === Tenant.OrganizationProject);

  const formatDate = useCallback(
    (date: string | Date | null | undefined): string => {
      if (!date) return t('never');
      try {
        const dateObj = date instanceof Date ? date : new Date(date as string);
        if (isNaN(dateObj.getTime())) return t('never');
        return format(dateObj, 'MMM d, yyyy');
      } catch {
        return t('never');
      }
    },
    [t]
  );

  const columns: DataTableColumnConfig<ApiKey>[] = useMemo(
    () => [
      {
        key: 'icon',
        header: '',
        width: embedded ? USER_DETAIL_ICON_ONLY_COLUMN.width : '50px',
        columnWidthMode: embedded ? USER_DETAIL_ICON_ONLY_COLUMN.columnWidthMode : 'fixed',
        className: embedded ? USER_DETAIL_ICON_ONLY_COLUMN.className : 'pl-4',
        enableHiding: false,
        render: (apiKey: ApiKey) =>
          embedded ? (
            <UserDetailTableIconCell>
              <Avatar
                initial={apiKey.name?.charAt(0) || apiKey.clientId.charAt(0)}
                size="sm"
                icon={<KeyRound className="h-3 w-3 text-muted-foreground" />}
              />
            </UserDetailTableIconCell>
          ) : (
            <div className="flex items-center justify-center">
              <Avatar
                initial={apiKey.name?.charAt(0) || apiKey.clientId.charAt(0)}
                size="sm"
                icon={<KeyRound className="h-3 w-3 text-muted-foreground" />}
              />
            </div>
          ),
      },
      {
        key: 'name',
        header: t('table.name'),
        width: '200px',
        ...USER_DETAIL_TEXT_COLUMN,
        className: embedded ? USER_DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS : undefined,
        render: (apiKey: ApiKey) => (
          <span className="text-sm font-medium">{apiKey.name || apiKey.clientId}</span>
        ),
      },
      {
        key: 'clientId',
        header: t('table.clientId'),
        width: '300px',
        ...USER_DETAIL_TEXT_COLUMN,
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
        ...USER_DETAIL_TEXT_COLUMN,
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
              ...USER_DETAIL_TEXT_COLUMN,
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
        key: 'audit',
        header: t('table.audit'),
        width: '200px',
        render: (apiKey: ApiKey) => <ApiKeyAudit apiKey={apiKey} />,
      },
    ],
    [embedded, formatDate, showRoleColumn, t, tRoot]
  );

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns, {
      defaultHiddenKeys: API_KEY_DEFAULT_HIDDEN_COLUMN_KEYS,
    });

  useEffect(() => {
    if (view !== 'table') {
      clearColumnToggle();
      return;
    }

    setColumnToggle(columnToggleItems, toggleColumn);
    return () => clearColumnToggle();
  }, [view, columnToggleItems, toggleColumn, setColumnToggle, clearColumnToggle]);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = useMemo(
    () => ({
      columns: filterSkeletonColumns([
        embedded ? USER_DETAIL_ICON_ONLY_SKELETON : { key: 'icon', type: 'text' as const },
        { key: 'name', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
        { key: 'clientId', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
        { key: 'description', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
        ...(showRoleColumn
          ? [{ key: 'role' as const, type: 'text' as const, ...USER_DETAIL_TEXT_COLUMN }]
          : []),
        { key: 'status', type: 'text' },
        { key: 'expiresAt', type: 'text' },
        { key: 'lastUsedAt', type: 'text' },
        { key: 'audit', type: 'audit' },
      ]),
      rowCount: 5,
    }),
    [embedded, filterSkeletonColumns, showRoleColumn]
  );

  if (!scope || !canQuery) {
    return null;
  }

  if (error) {
    return embedded ? (
      <p className="text-sm text-destructive">{t('error')}</p>
    ) : (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-destructive">{t('error')}</p>
      </div>
    );
  }

  if (view === 'card') {
    return (
      <>
        <ApiKeyCards />
        {createdApiKey && (
          <ApiKeySecretDialog
            open={secretDialogOpen}
            onOpenChange={(open) => {
              setSecretDialogOpen(open);
              if (!open) setCreatedApiKey(null);
            }}
            clientId={createdApiKey.clientId}
            clientSecret={createdApiKey.clientSecret}
            scope={scope ? { tenant: scope.tenant, id: scope.id } : null}
            mode={secretDialogMode}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DataTable
        data={apiKeys}
        columns={visibleColumns}
        loading={loading}
        emptyState={{
          icon: <KeyRound />,
          title: t('empty'),
          description: t('emptyDescription'),
          action: (
            <ApiKeyCreateDialog onApiKeyCreated={handleApiKeyCreated} triggerAlwaysShowLabel />
          ),
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
          scope={scope ? { tenant: scope.tenant, id: scope.id } : null}
          mode={secretDialogMode}
        />
      )}
    </>
  );
}
