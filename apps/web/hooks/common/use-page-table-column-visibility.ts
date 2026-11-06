'use client';

import { useEffect } from 'react';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import { NO_DEFAULT_HIDDEN_COLUMN_KEYS } from '@/lib/detail-table-column-visibility';
import { useDataTableColumnsStore } from '@/stores/data-table-columns.store';

import {
  useDetailTableColumnVisibility,
  type UseDetailTableColumnVisibilityOptions,
} from './use-detail-table-column-visibility';

export interface UsePageTableColumnVisibilityOptions extends UseDetailTableColumnVisibilityOptions {
  /** When false, the table does not publish its column picker (e.g. card view is active). */
  enabled?: boolean;
}

/**
 * Column visibility for a page's list table, with the picker published to the page toolbar
 * (`PageTableColumnToggle`). List views show every column by default.
 */
export function usePageTableColumnVisibility<T>(
  columns: DataTableColumnConfig<T>[],
  options?: UsePageTableColumnVisibilityOptions
) {
  const enabled = options?.enabled ?? true;
  const visibility = useDetailTableColumnVisibility(columns, {
    defaultHiddenKeys: options?.defaultHiddenKeys ?? NO_DEFAULT_HIDDEN_COLUMN_KEYS,
  });
  const { columnToggleItems, toggleColumn } = visibility;

  const setColumnToggle = useDataTableColumnsStore((state) => state.setColumnToggle);
  const clearColumnToggle = useDataTableColumnsStore((state) => state.clearColumnToggle);

  const itemsSignature = columnToggleItems
    .map((item) => `${item.key}\0${item.label}\0${item.visible ? 1 : 0}`)
    .join('\n');

  useEffect(() => {
    if (!enabled) {
      clearColumnToggle();
      return;
    }

    setColumnToggle(columnToggleItems, toggleColumn);
    // columnToggleItems is rebuilt whenever the caller rebuilds its columns; itemsSignature
    // tracks the values the picker actually shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, itemsSignature, toggleColumn, setColumnToggle, clearColumnToggle]);

  useEffect(() => () => clearColumnToggle(), [clearColumnToggle]);

  return visibility;
}
