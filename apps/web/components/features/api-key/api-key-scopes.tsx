'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { machineOnlyGate, ResourceAction, ResourceSlug } from '@grantjs/constants';
import type { ApiKey } from '@grantjs/schema';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  useApiKeyAttachableGrants,
  useApiKeyMutations,
  useApiKeyRolePermissions,
} from '@/hooks/api-keys';
import { useDebounce, useScopeFromParams } from '@/hooks/common';
import {
  canManageApiKeyFromCohort,
  getApiKeyGrantKind,
  intersectWithCohort,
} from '@/lib/api-key-grants';
import type { ApiKeyScopeRow } from '@/lib/api-key-scope-groups';
import { useApiKeyStore } from '@/stores/api-key.store';

import { ApiKeyConvertDialog } from './api-key-convert-dialog';
import { ApiKeyScopesTable } from './api-key-scopes-table';

interface ApiKeyScopesProps {
  apiKey: ApiKey;
  onAfterChange?: () => void | Promise<unknown>;
}

const SAVE_DEBOUNCE_MS = 300;

function toRow(permission: ApiKeyScopeRow['permission']): ApiKeyScopeRow {
  return {
    permission,
    machineOnly: machineOnlyGate(permission.resource?.slug ?? '', permission.action) !== undefined,
  };
}

/**
 * The scopes card of the detail view. The key's model fixes the mode: a scope key edits in place,
 * a role key shows its role's permissions and offers one explicit, confirmed conversion.
 */
export function ApiKeyScopes({ apiKey, onAfterChange }: ApiKeyScopesProps) {
  const t = useTranslations('user.apiKeys.detail');
  const tRoot = useTranslations();
  const scope = useScopeFromParams();
  const kind = getApiKeyGrantKind(apiKey);

  const page = useApiKeyStore((state) => state.scopesPage);
  const limit = useApiKeyStore((state) => state.scopesLimit);
  const setPage = useApiKeyStore((state) => state.setScopesPage);

  const canUpdate = useGrant(ResourceSlug.ApiKey, ResourceAction.Update, { scope: scope! });
  const {
    permissions: attachable,
    cohort,
    loading: cohortLoading,
    error: cohortError,
    refetch: refetchCohort,
  } = useApiKeyAttachableGrants(scope);
  const { setApiKeyPermissions } = useApiKeyMutations();

  const canEdit =
    Boolean(canUpdate) &&
    !apiKey.isRevoked &&
    cohort !== null &&
    canManageApiKeyFromCohort(apiKey, cohort);

  const serverIds = useMemo(
    () => (apiKey.permissions ?? []).map((permission) => permission.id),
    [apiKey.permissions]
  );
  const serverIdsKey = serverIds.join('|');
  const serverIdsRef = useRef(serverIds);
  useEffect(() => {
    serverIdsRef.current = serverIds;
  }, [serverIds]);

  const [optimisticIds, setOptimisticIds] = useState<string[]>(serverIds);
  const [updatingIds, setUpdatingIds] = useState<ReadonlySet<string>>(new Set());
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => {
    setOptimisticIds(serverIdsRef.current);
  }, [serverIdsKey]);

  const roleKey = kind === 'role' ? apiKey.role : null;
  const rolePermissions = useApiKeyRolePermissions(scope, roleKey?.id);

  const save = useDebounce(async (nextIds: string[]) => {
    if (!scope) return;
    const current = new Set(serverIdsRef.current);
    const next = new Set(nextIds);
    setUpdatingIds(
      new Set([
        ...nextIds.filter((id) => !current.has(id)),
        ...serverIdsRef.current.filter((id) => !next.has(id)),
      ])
    );
    try {
      await setApiKeyPermissions({ scope, id: apiKey.id, permissionIds: nextIds });
      await onAfterChange?.();
    } catch {
      setOptimisticIds(serverIdsRef.current);
    } finally {
      setUpdatingIds(new Set());
    }
  }, SAVE_DEBOUNCE_MS);

  const handleSelectionChange = useCallback(
    (nextIds: string[]) => {
      // A key carries at least one permission; the server refuses an empty set.
      if (nextIds.length < 1) return;
      setOptimisticIds(nextIds);
      save(nextIds);
    },
    [save]
  );

  const scopeRows = useMemo<ApiKeyScopeRow[]>(() => {
    const byId = new Map<string, ApiKeyScopeRow>();
    for (const entry of attachable) {
      byId.set(entry.permission.id, {
        permission: entry.permission,
        machineOnly: entry.machineOnly,
      });
    }
    for (const permission of apiKey.permissions ?? []) {
      if (!byId.has(permission.id)) byId.set(permission.id, toRow(permission));
    }
    return Array.from(byId.values());
  }, [attachable, apiKey.permissions]);

  const disabledRows = useMemo(() => {
    const reasons = new Map<string, string>();
    if (!canEdit) return reasons;
    for (const permission of apiKey.permissions ?? []) {
      if (!cohort?.permissionIds.has(permission.id)) {
        reasons.set(permission.id, t('scopes.outsideCohort'));
      }
    }
    if (optimisticIds.length === 1) {
      reasons.set(optimisticIds[0], t('scopes.lastScope'));
    }
    return reasons;
  }, [canEdit, apiKey.permissions, cohort, optimisticIds, t]);

  const roleRows = useMemo(
    () => rolePermissions.permissions.map(toRow),
    [rolePermissions.permissions]
  );
  const convertIds = useMemo(
    () => intersectWithCohort(rolePermissions.permissionIds, cohort),
    [rolePermissions.permissionIds, cohort]
  );

  const handleConvert = useCallback(async () => {
    if (!scope) return;
    await setApiKeyPermissions({ scope, id: apiKey.id, permissionIds: convertIds });
    await onAfterChange?.();
  }, [scope, setApiKeyPermissions, apiKey.id, convertIds, onAfterChange]);

  if (kind === null) return null;

  if (kind === 'role') {
    const roleName = tRoot(roleKey?.name ?? '—');
    const canConvert =
      canEdit && !rolePermissions.loading && !rolePermissions.error && convertIds.length > 0;

    return (
      <>
        <ApiKeyScopesTable
          title={t('scopes.title')}
          description={t('scopes.roleDescription')}
          rows={roleRows}
          selectedIds={rolePermissions.permissionIds}
          readOnly
          loading={rolePermissions.loading || (cohortLoading && cohort === null)}
          error={Boolean(rolePermissions.error)}
          paginated
          page={page}
          limit={limit}
          onPageChange={setPage}
          notice={
            <Alert variant="info" className="mb-4 rounded-lg border-info bg-info/10">
              <AlertDescription>{t('scopes.roleNotice', { role: roleName })}</AlertDescription>
            </Alert>
          }
          footerActions={
            canEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConvertOpen(true)}
                disabled={!canConvert}
              >
                {t('scopes.convert')}
              </Button>
            ) : undefined
          }
        />
        <ApiKeyConvertDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          roleName={roleName}
          permissionCount={convertIds.length}
          onConfirm={handleConvert}
        />
      </>
    );
  }

  return (
    <ApiKeyScopesTable
      title={t('scopes.title')}
      description={t('scopes.description')}
      rows={scopeRows}
      selectedIds={optimisticIds}
      onSelectionChange={handleSelectionChange}
      readOnly={!canEdit}
      disabledRows={disabledRows}
      updatingIds={updatingIds}
      loading={cohortLoading && scopeRows.length === 0}
      error={Boolean(cohortError) && scopeRows.length === 0}
      onRefresh={() => refetchCohort()}
      paginated
      page={page}
      limit={limit}
      onPageChange={setPage}
      notice={
        !canEdit && !(cohortLoading && cohort === null) ? (
          <Alert variant="info" className="mb-4 rounded-lg border-info bg-info/10">
            <AlertDescription>
              {apiKey.isRevoked ? t('scopes.revokedNotice') : t('scopes.readOnlyNotice')}
            </AlertDescription>
          </Alert>
        ) : undefined
      }
    />
  );
}
