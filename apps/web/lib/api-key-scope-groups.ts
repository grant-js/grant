import type { Permission } from '@grantjs/schema';

/** Holds the whole permission catalogue (about 72 pairs), so no pager shows today. */
export const API_KEY_SCOPES_PAGE_LIMIT = 100;

interface ApiKeyScopePermission extends Pick<Permission, 'id' | 'name' | 'action' | 'description'> {
  resource?: { slug: string; name?: string | null } | null;
}

export interface ApiKeyScopeRow {
  permission: ApiKeyScopePermission;
  /** Meant for credentials only: attachable by a holder of its gate permission. */
  machineOnly: boolean;
}

export interface ApiKeyScopeGroup {
  /** Resource slug; permissions without a resource share the `other` group. */
  key: string;
  resourceName: string | null;
  rows: ApiKeyScopeRow[];
}

export type ApiKeyScopeGroupState = 'checked' | 'indeterminate' | 'unchecked' | 'disabled';

const OTHER_GROUP_KEY = 'other';

function getScopeGroupKey(row: ApiKeyScopeRow): string {
  return row.permission.resource?.slug ?? OTHER_GROUP_KEY;
}

/** Groups rows by resource, groups ordered by resource slug and rows by action. */
export function groupScopeRows(rows: readonly ApiKeyScopeRow[]): ApiKeyScopeGroup[] {
  const groups = new Map<string, ApiKeyScopeGroup>();
  for (const row of rows) {
    const key = getScopeGroupKey(row);
    const group = groups.get(key) ?? {
      key,
      resourceName: row.permission.resource?.name ?? null,
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }
  return Array.from(groups.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort((left, right) =>
        left.permission.action.localeCompare(right.permission.action)
      ),
    }));
}

/** The "all actions" checkbox of a group, over the rows it is given (the rows in view). */
export function getScopeGroupState(
  rows: readonly ApiKeyScopeRow[],
  selectedIds: ReadonlySet<string>,
  disabledIds: ReadonlySet<string>
): ApiKeyScopeGroupState {
  const selectable = rows.filter((row) => !disabledIds.has(row.permission.id));
  if (selectable.length === 0) return 'disabled';
  const selected = selectable.filter((row) => selectedIds.has(row.permission.id)).length;
  if (selected === 0) return 'unchecked';
  return selected === selectable.length ? 'checked' : 'indeterminate';
}

/** Selection after toggling a group: all its selectable rows on, or all off. Disabled rows never move. */
export function toggleScopeGroup(
  selectedIds: readonly string[],
  rows: readonly ApiKeyScopeRow[],
  disabledIds: ReadonlySet<string>,
  checked: boolean
): string[] {
  const groupIds = new Set(
    rows.filter((row) => !disabledIds.has(row.permission.id)).map((row) => row.permission.id)
  );
  if (checked) {
    return Array.from(new Set([...selectedIds, ...groupIds]));
  }
  return selectedIds.filter((id) => !groupIds.has(id));
}

export function toggleScopeRow(
  selectedIds: readonly string[],
  permissionId: string,
  checked: boolean
): string[] {
  if (checked) {
    return selectedIds.includes(permissionId) ? [...selectedIds] : [...selectedIds, permissionId];
  }
  return selectedIds.filter((id) => id !== permissionId);
}
