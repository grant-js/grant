'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import type { DataTableColumnToggleItem } from '@/components/common/data-table-column-toggle';
import type { TableSkeletonColumnConfig } from '@/components/common/table-skeleton';
import {
  clampColumnWidth,
  isDataTableColumnResizable,
  resolveColumnBounds,
} from '@/lib/data-table-column-resize';
import {
  applyColumnOrder,
  buildDefaultColumnState,
  clearStoredColumnState,
  type DataTableColumnState,
  dataTableColumnStorageKey,
  isMovableColumn,
  mergeColumnState,
  moveColumnInOrder,
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
 * written while the user id is unknown. `visibleColumns` carry the user's widths and the
 * resize callbacks the `DataTable` handles use, in the user's column order.
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

  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  /** Sets a user width, clamped to the column's bounds; `null` goes back to the default width. */
  const setColumnWidth = useCallback(
    (key: string, width: number | null) => {
      const column = columnsRef.current.find((candidate) => candidate.key === key);
      if (!column || !isDataTableColumnResizable(column)) return;

      const current = stateRef.current;
      const nextWidths = { ...current.widths };
      if (width === null) {
        delete nextWidths[key];
      } else {
        nextWidths[key] = clampColumnWidth(width, resolveColumnBounds(column));
      }
      const next: DataTableColumnState = { ...current, widths: nextWidths };
      stateRef.current = next;
      setStored(next);
      writeStoredColumnState(storageKey, next);
    },
    [storageKey]
  );

  /** Moves a movable column to `toIndex` among the movable columns; locked columns never move. */
  const moveColumn = useCallback(
    (key: string, toIndex: number) => {
      const movableKeys = new Set(
        columnsRef.current.filter(isMovableColumn).map((column) => column.key)
      );
      if (!movableKeys.has(key)) return;

      const current = stateRef.current;
      const order = moveColumnInOrder(current.order, movableKeys, key, toIndex);
      if (order.every((candidate, index) => candidate === current.order[index])) return;

      const next: DataTableColumnState = { ...current, order };
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

  const orderedColumns = useMemo(() => applyColumnOrder(columns, order), [columns, order]);

  const toggleableColumns = useMemo(
    () =>
      orderedColumns.filter((column) =>
        isToggleableColumn(column.key, column.header, column.enableHiding)
      ),
    [orderedColumns]
  );

  const visibleColumns = useMemo(
    () =>
      filterColumnsByVisibility(orderedColumns, visibility).map((column) => ({
        ...column,
        resize: { width: widths[column.key], onChange: setColumnWidth },
      })),
    [orderedColumns, visibility, widths, setColumnWidth]
  );

  const columnToggleItems: DataTableColumnToggleItem[] = useMemo(
    () =>
      toggleableColumns.map((column) => ({
        key: column.key,
        label: column.header,
        visible: visibility[column.key] !== false,
        movable: isMovableColumn(column),
      })),
    [toggleableColumns, visibility]
  );

  const filterSkeletonColumns = useCallback(
    (skeletonColumns: TableSkeletonColumnConfig[]) => {
      const position = new Map(orderedColumns.map((column, index) => [column.key, index]));
      const at = (key: string) => position.get(key) ?? Number.MAX_SAFE_INTEGER;
      return skeletonColumns
        .filter((column) => visibility[column.key] !== false)
        .sort((a, b) => at(a.key) - at(b.key));
    },
    [visibility, orderedColumns]
  );

  return {
    visibleColumns,
    visibility,
    order,
    widths,
    toggleColumn,
    setColumnWidth,
    moveColumn,
    resetColumns,
    columnToggleItems,
    filterSkeletonColumns,
  };
}
