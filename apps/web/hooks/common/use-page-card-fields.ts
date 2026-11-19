'use client';

import { useCallback, useMemo } from 'react';

import type { DataTableColumnConfig } from '@/components/common/data-table';

import { usePageTableColumnVisibility } from './use-page-table-column-visibility';

export interface CardFieldDescriptor {
  /** Stable key of the body field, also the key of its `CardBody` item. */
  key: string;
  /** What the toolbar picker lists the field as. */
  label: string;
}

export interface UsePageCardFieldsOptions {
  /** Stable id of the list (e.g. `users.list`); the card state is saved under `<listId>.cards`. */
  listId: string;
  enabled?: boolean;
}

/**
 * Which body fields a card view shows, and in which order, saved per user and list like a
 * table's columns, and published to the page toolbar's picker as **fields**. The card header
 * (avatar, title, subtitle, actions) and footer are not fields: they are fixed.
 *
 * Call it once in the card view, with the fields every card can show; `arrange` then filters
 * and orders one card's `CardBody` items (matched by `key`; an item without a key is kept, at
 * the end).
 */
export function usePageCardFields(
  fields: readonly CardFieldDescriptor[],
  options: UsePageCardFieldsOptions
) {
  // The column-state machinery keys on `key` and lists `header`; a field renders nothing itself.
  const columns = useMemo<DataTableColumnConfig<unknown>[]>(
    () => fields.map((field) => ({ key: field.key, header: field.label, render: () => null })),
    [fields]
  );

  const { visibleColumns } = usePageTableColumnVisibility(columns, {
    tableId: `${options.listId}.cards`,
    enabled: options.enabled,
    kind: 'fields',
  });

  const visibleOrder = useMemo(
    () => new Map(visibleColumns.map((column, index) => [column.key, index])),
    [visibleColumns]
  );
  const known = useMemo(() => new Set(fields.map((field) => field.key)), [fields]);

  const arrange = useCallback(
    <TItem extends { key?: string }>(items: readonly TItem[]): TItem[] => {
      const managed = items
        .filter((item) => item.key !== undefined && visibleOrder.has(item.key))
        .sort((a, b) => visibleOrder.get(a.key!)! - visibleOrder.get(b.key!)!);
      const unmanaged = items.filter((item) => item.key === undefined || !known.has(item.key));
      return [...managed, ...unmanaged];
    },
    [visibleOrder, known]
  );

  return { arrange };
}
