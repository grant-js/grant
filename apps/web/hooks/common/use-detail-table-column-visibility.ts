'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import type { DataTableColumnToggleItem } from '@/components/common/data-table-column-toggle';
import type { TableSkeletonColumnConfig } from '@/components/common/table-skeleton';
import {
  buildInitialColumnVisibility,
  DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS,
  filterColumnsByVisibility,
  isToggleableColumn,
  mergeColumnVisibility,
} from '@/lib/detail-table-column-visibility';

export interface UseDetailTableColumnVisibilityOptions {
  defaultHiddenKeys?: ReadonlySet<string>;
}

export function useDetailTableColumnVisibility<T>(
  columns: DataTableColumnConfig<T>[],
  options?: UseDetailTableColumnVisibilityOptions
) {
  const hiddenKeys = options?.defaultHiddenKeys ?? DETAIL_TABLE_DEFAULT_HIDDEN_COLUMN_KEYS;
  const columnSignature = columns.map((column) => column.key).join('\0');

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    buildInitialColumnVisibility(columns, hiddenKeys)
  );

  useEffect(() => {
    setVisibility((previous) => {
      const merged = mergeColumnVisibility(previous, columns, hiddenKeys);
      const unchanged =
        Object.keys(merged).length === Object.keys(previous).length &&
        Object.entries(merged).every(([key, value]) => previous[key] === value);
      return unchanged ? previous : merged;
    });
    // columns is omitted; columnSignature tracks when the column key set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSignature, hiddenKeys]);

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

  const toggleColumn = useCallback((key: string, visible: boolean) => {
    setVisibility((previous) => ({ ...previous, [key]: visible }));
  }, []);

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
    toggleColumn,
    columnToggleItems,
    filterSkeletonColumns,
  };
}
