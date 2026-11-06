import type { DataTableColumnConfig } from '@/components/common/data-table';
import {
  clampColumnWidth,
  isDataTableColumnResizable,
  resolveColumnBounds,
} from '@/lib/data-table-column-resize';
import {
  buildInitialColumnVisibility,
  DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS,
  isToggleableColumn,
  mergeColumnVisibility,
} from '@/lib/detail-table-column-visibility';

/** Column state of one table: which columns show, in which order, at which user-set width. */
export interface DataTableColumnState {
  visibility: Record<string, boolean>;
  /** Every column key, in display order. */
  order: string[];
  /** User-set widths in px by column key. A column without an entry uses its declared (default) width. */
  widths: Record<string, number>;
}

const STORAGE_KEY_PREFIX = 'grant:table:v1';

/** `null` when there is no user (or table) to scope the entry to: state then stays in memory. */
export function dataTableColumnStorageKey(
  userId: string | null | undefined,
  tableId: string
): string | null {
  if (!userId || !tableId) return null;
  return `${STORAGE_KEY_PREFIX}:${userId}:${tableId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns the value only when it has the stored shape; anything else is treated as no entry. */
export function parseStoredColumnState(raw: string | null): DataTableColumnState | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  const { visibility, order, widths } = parsed;

  if (!isRecord(visibility) || !Object.values(visibility).every((v) => typeof v === 'boolean')) {
    return null;
  }
  if (!Array.isArray(order) || !order.every((key) => typeof key === 'string')) {
    return null;
  }
  if (
    !isRecord(widths) ||
    !Object.values(widths).every((w) => typeof w === 'number' && Number.isFinite(w) && w > 0)
  ) {
    return null;
  }

  return {
    visibility: visibility as Record<string, boolean>,
    order: order as string[],
    widths: widths as Record<string, number>,
  };
}

/** Reads the stored state; a missing entry, bad JSON or unavailable storage all yield `null`. */
export function readStoredColumnState(storageKey: string | null): DataTableColumnState | null {
  if (!storageKey) return null;
  try {
    return parseStoredColumnState(window.localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

/** Best effort: a full or blocked storage leaves the state in memory only. */
export function writeStoredColumnState(
  storageKey: string | null,
  state: DataTableColumnState
): void {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage unavailable or full: keep going with in-memory state.
  }
}

export function clearStoredColumnState(storageKey: string | null): void {
  if (!storageKey) return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

export function buildDefaultColumnState<T>(
  columns: DataTableColumnConfig<T>[],
  defaultHiddenKeys: ReadonlySet<string> = DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS
): DataTableColumnState {
  return {
    visibility: buildInitialColumnVisibility(columns, defaultHiddenKeys),
    order: columns.map((column) => column.key),
    widths: {},
  };
}

/**
 * Applies a stored (or in-memory) state to the current columns: unknown keys are dropped,
 * new columns get their defaults and are appended to the order, widths are clamped.
 */
export function mergeColumnState<T>(
  previous: DataTableColumnState | null,
  columns: DataTableColumnConfig<T>[],
  defaultHiddenKeys: ReadonlySet<string> = DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS
): DataTableColumnState {
  const defaults = buildDefaultColumnState(columns, defaultHiddenKeys);
  if (!previous) return defaults;

  const known = new Set(defaults.order);
  const order: string[] = [];
  for (const key of previous.order) {
    if (known.has(key) && !order.includes(key)) order.push(key);
  }
  for (const key of defaults.order) {
    if (!order.includes(key)) order.push(key);
  }

  const widths: Record<string, number> = {};
  const columnsByKey = new Map(columns.map((column) => [column.key, column]));
  for (const [key, width] of Object.entries(previous.widths)) {
    const column = columnsByKey.get(key);
    // A column that cannot be resized ignores a stale saved width.
    if (column && isDataTableColumnResizable(column)) {
      widths[key] = clampColumnWidth(width, resolveColumnBounds(column));
    }
  }

  // A saved value must not hide a column the picker cannot bring back (chrome, enableHiding: false).
  const visibility = mergeColumnVisibility(previous.visibility, columns, defaultHiddenKeys);
  for (const column of columns) {
    if (!isToggleableColumn(column.key, column.header, column.enableHiding)) {
      visibility[column.key] = true;
    }
  }

  return {
    visibility,
    order,
    widths,
  };
}
