'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import type { DataTableColumnToggleItem } from '@/components/common/data-table-column-toggle';
import type { TableSkeletonColumnConfig } from '@/components/common/table-skeleton';
import {
  buildDefaultColumnState,
  clearStoredColumnState,
  type DataTableColumnState,
  dataTableColumnStorageKey,
  mergeColumnState,
  readStoredColumnState,
  writeStoredColumnState,
} from '@/lib/data-table-column-state';
import {
  DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS,
  filterColumnsByVisibility,
  isToggleableColumn,
} from '@/lib/detail-table-column-visibility';

import { useCurrentUserId } from './use-current-user-id';

export interface UseDataTableColumnStateOptions {
  /** Stable id of the table, unique across the app (e.g. `users.list`). Scopes the saved state. */
  tableId: string;
  defaultHiddenKeys?: ReadonlySet<string>;
}

/**
 * The one column-state hook for a `DataTable`: visibility, order and widths, saved per user and
 * table in localStorage. Nothing is written until the user changes something, and nothing is
 * written while the user id is unknown. `order` and `widths` hold defaults only until resize
 * and reorder land.
 */
export function useDataTableColumnState<T>(
  columns: DataTableColumnConfig<T>[],
  options: UseDataTableColumnStateOptions
) {
  const { tableId } = options;
  const hiddenKeys = options.defaultHiddenKeys ?? DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS;
  const columnSignature = columns.map((column) => column.key).join('\0');

  const userId = useCurrentUserId();
  const storageKey = dataTableColumnStorageKey(userId, tableId);

  // The user's saved or changed state; null means "defaults". Storage is read in an effect so
  // server and first client render agree, and the user id may only arrive after mount.
  const [stored, setStored] = useState<DataTableColumnState | null>(null);

  useEffect(() => {
    setStored(readStoredColumnState(storageKey));
  }, [storageKey]);

  const state = useMemo(
    () => mergeColumnState(stored, columns, hiddenKeys),
    // columns is omitted; columnSignature tracks when the column key set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stored, columnSignature, hiddenKeys]
  );
  const { visibility, order, widths } = state;

  const stateRef = useRef(state);
  stateRef.current = state;

  const toggleColumn = useCallback(
    (key: string, visible: boolean) => {
      const current = stateRef.current;
      const next: DataTableColumnState = {
        ...current,
        visibility: { ...current.visibility, [key]: visible },
      };
      stateRef.current = next;
      setStored(next);
      writeStoredColumnState(storageKey, next);
    },
    [storageKey]
  );

  const resetColumns = useCallback(() => {
    const defaults = buildDefaultColumnState(columns, hiddenKeys);
    stateRef.current = defaults;
    setStored(null);
    clearStoredColumnState(storageKey);
    // columns is omitted; columnSignature tracks when the column key set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, columnSignature, hiddenKeys]);

  const toggleableColumns = useMemo(
    () =>
      columns.filter((column) =>
        isToggleableColumn(column.key, column.header, column.enableHiding)
      ),
    [columns]
  );

  const visibleColumns = useMemo(
    () => filterColumnsByVisibility(columns, visibility),
    [columns, visibility]
  );

  const columnToggleItems: DataTableColumnToggleItem[] = useMemo(
    () =>
      toggleableColumns.map((column) => ({
        key: column.key,
        label: column.header,
        visible: visibility[column.key] !== false,
      })),
    [toggleableColumns, visibility]
  );

  const filterSkeletonColumns = useCallback(
    (skeletonColumns: TableSkeletonColumnConfig[]) =>
      skeletonColumns.filter((column) => visibility[column.key] !== false),
    [visibility]
  );

  return {
    visibleColumns,
    visibility,
    order,
    widths,
    toggleColumn,
    resetColumns,
    columnToggleItems,
    filterSkeletonColumns,
  };
}
