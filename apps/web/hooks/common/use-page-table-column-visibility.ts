'use client';

import { useEffect, useId } from 'react';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import type { DataTableColumnToggleKind } from '@/components/common/data-table-column-toggle';
import { NO_DEFAULT_HIDDEN_COLUMN_KEYS } from '@/lib/detail-table-column-visibility';
import { useDataTableColumnsStore } from '@/stores/data-table-columns.store';

import {
  useDataTableColumnState,
  type UseDataTableColumnStateOptions,
} from './use-data-table-column-state';

export interface UsePageTableColumnVisibilityOptions extends UseDataTableColumnStateOptions {
  /** When false, the table does not publish its column picker (e.g. card view is active). */
  enabled?: boolean;
  /** What the toolbar picker is labelled as managing; `fields` for a card view's body fields. */
  kind?: DataTableColumnToggleKind;
}

/**
 * Column visibility for a page's list table, with the picker published to the page toolbar
 * (`PageTableColumnToggle`). List views show every column by default.
 */
export function usePageTableColumnVisibility<T>(
  columns: DataTableColumnConfig<T>[],
  options: UsePageTableColumnVisibilityOptions
) {
  const enabled = options.enabled ?? true;
  const kind = options.kind ?? 'columns';
  // A page can mount a disabled table hook beside a card view that publishes its fields;
  // clearing by owner keeps the disabled one from wiping the other's picker.
  const owner = useId();
  const visibility = useDataTableColumnState(columns, {
    tableId: options.tableId,
    defaultHiddenKeys: options.defaultHiddenKeys ?? NO_DEFAULT_HIDDEN_COLUMN_KEYS,
  });
  const { columnToggleItems, toggleColumn, resetColumns, moveColumn } = visibility;

  const setColumnToggle = useDataTableColumnsStore((state) => state.setColumnToggle);
  const clearColumnToggle = useDataTableColumnsStore((state) => state.clearColumnToggle);

  const itemsSignature = columnToggleItems
    .map((item) => `${item.key}\0${item.label}\0${item.visible ? 1 : 0}\0${item.movable ? 1 : 0}`)
    .join('\n');

  useEffect(() => {
    if (!enabled) {
      clearColumnToggle(owner);
      return;
    }

    setColumnToggle(columnToggleItems, toggleColumn, resetColumns, moveColumn, kind, owner);
    // columnToggleItems is rebuilt whenever the caller rebuilds its columns; itemsSignature
    // tracks the values the picker actually shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    kind,
    owner,
    itemsSignature,
    toggleColumn,
    resetColumns,
    moveColumn,
    setColumnToggle,
    clearColumnToggle,
  ]);

  useEffect(() => () => clearColumnToggle(owner), [clearColumnToggle, owner]);

  return visibility;
}
