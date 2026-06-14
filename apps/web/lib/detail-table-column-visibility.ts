import type { DataTableColumnConfig } from '@/components/common/data-table';

export const DETAIL_TABLE_STRUCTURAL_COLUMN_KEYS = new Set(['checkbox', 'icon', 'loading']);

/** Hidden by default across RBAC detail tables (roles, groups, permissions, tags). */
export const DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS = new Set([
  'action',
  'description',
  'tags',
  'source',
  'color',
]);

/** Additional columns hidden by default on API key tables. */
export const API_KEY_DEFAULT_HIDDEN_COLUMN_KEYS = new Set([
  ...DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS,
  'clientId',
  'lastUsedAt',
  'audit',
  'role',
]);

export function isToggleableColumn(key: string, header: string, enableHiding?: boolean): boolean {
  if (enableHiding === false) return false;
  if (!header) return false;
  if (DETAIL_TABLE_STRUCTURAL_COLUMN_KEYS.has(key)) return false;
  return true;
}

export function buildInitialColumnVisibility<T>(
  columns: DataTableColumnConfig<T>[],
  defaultHiddenKeys: ReadonlySet<string> = DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};

  for (const column of columns) {
    if (!isToggleableColumn(column.key, column.header, column.enableHiding)) {
      visibility[column.key] = true;
      continue;
    }

    if (column.defaultHidden !== undefined) {
      visibility[column.key] = !column.defaultHidden;
    } else {
      visibility[column.key] = !defaultHiddenKeys.has(column.key);
    }
  }

  return visibility;
}

export function mergeColumnVisibility<T>(
  previous: Record<string, boolean>,
  columns: DataTableColumnConfig<T>[],
  defaultHiddenKeys: ReadonlySet<string> = DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS
): Record<string, boolean> {
  const defaults = buildInitialColumnVisibility(columns, defaultHiddenKeys);
  const next: Record<string, boolean> = {};

  for (const [key, visible] of Object.entries(defaults)) {
    next[key] = key in previous ? previous[key]! : visible;
  }

  return next;
}

export function filterColumnsByVisibility<T>(
  columns: DataTableColumnConfig<T>[],
  visibility: Record<string, boolean>
): DataTableColumnConfig<T>[] {
  return columns.filter((column) => visibility[column.key] !== false);
}
