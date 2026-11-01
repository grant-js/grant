import {
  getResourceDefinition,
  getResourceSlugs,
  STANDALONE_PERMISSIONS,
} from '@grantjs/constants';

import type { ApiKeyScopeRow } from '@/lib/api-key-scope-groups';

export type ApiKeyScopeKind = 'grant' | 'project';

export interface PartitionedApiKeyScopeRows {
  grant: ApiKeyScopeRow[];
  project: ApiKeyScopeRow[];
}

function normalizeCatalogueToken(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, '');
}

const GRANT_CATALOGUE_PAIRS = new Set<string>();

for (const slug of getResourceSlugs()) {
  for (const action of getResourceDefinition(slug).actions) {
    GRANT_CATALOGUE_PAIRS.add(
      `${normalizeCatalogueToken(slug)}:${normalizeCatalogueToken(action)}`
    );
  }
}

for (const permission of STANDALONE_PERMISSIONS) {
  GRANT_CATALOGUE_PAIRS.add(
    `${normalizeCatalogueToken(permission.resource)}:${normalizeCatalogueToken(permission.action)}`
  );
}

/** True when `(resource.slug, action)` is a seeded Grant catalogue pair. Hyphen and case are ignored. */
export function isGrantCataloguePermission(resourceSlug: string, action: string): boolean {
  if (!resourceSlug.trim() || !action.trim()) return false;
  return GRANT_CATALOGUE_PAIRS.has(
    `${normalizeCatalogueToken(resourceSlug)}:${normalizeCatalogueToken(action)}`
  );
}

export function getApiKeyScopeKind(row: ApiKeyScopeRow): ApiKeyScopeKind {
  return isGrantCataloguePermission(row.permission.resource?.slug ?? '', row.permission.action)
    ? 'grant'
    : 'project';
}

export function partitionApiKeyScopeRows(
  rows: readonly ApiKeyScopeRow[]
): PartitionedApiKeyScopeRows {
  const grant: ApiKeyScopeRow[] = [];
  const project: ApiKeyScopeRow[] = [];
  for (const row of rows) {
    if (getApiKeyScopeKind(row) === 'grant') grant.push(row);
    else project.push(row);
  }
  return { grant, project };
}
