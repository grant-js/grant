'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { useApiKeyAttachableGrants } from '@/hooks/api-keys';
import { useScopeFromParams } from '@/hooks/common';
import type { ApiKeyScopeRow } from '@/lib/api-key-scope-groups';

import type { ProjectApiKeyCreateFormValues } from '../api-keys/api-key-types';
import { ApiKeyScopesTable } from './api-key-scopes-table';

/** The scope picker: only what the caller may attach, grouped by resource, the whole catalogue at once. */
export function ApiKeyCreateScopes() {
  const t = useTranslations('user.apiKeys.scopes');
  const scope = useScopeFromParams();
  const form = useFormContext<ProjectApiKeyCreateFormValues>();
  const { permissions, loading, error, refetch } = useApiKeyAttachableGrants(scope);

  const selectedIds = form.watch('permissionIds') ?? [];

  const rows = useMemo<ApiKeyScopeRow[]>(
    () =>
      permissions.map((entry) => ({
        permission: entry.permission,
        machineOnly: entry.machineOnly,
      })),
    [permissions]
  );

  const handleSelectionChange = useCallback(
    (nextIds: string[]) => {
      form.setValue('permissionIds', nextIds, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  return (
    <ApiKeyScopesTable
      title={t('title')}
      description={t('description')}
      rows={rows}
      selectedIds={selectedIds}
      onSelectionChange={handleSelectionChange}
      loading={loading && rows.length === 0}
      error={Boolean(error)}
      onRefresh={() => refetch()}
    />
  );
}
