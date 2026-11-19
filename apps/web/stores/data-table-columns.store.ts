import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type {
  DataTableColumnToggleItem,
  DataTableColumnToggleKind,
} from '@/components/common/data-table-column-toggle';

/**
 * Bridges a page's list view to the page toolbar, which renders in a separate subtree
 * (`DashboardLayout` `actions`). One list view per page publishes here: a table its columns,
 * a card grid its body fields (`kind`).
 */
interface DataTableColumnsState {
  columnToggleItems: DataTableColumnToggleItem[];
  kind: DataTableColumnToggleKind;
  toggleColumnVisibility: ((key: string, visible: boolean) => void) | null;
  moveColumn: ((key: string, toIndex: number) => void) | null;
  resetColumns: (() => void) | null;

  setColumnToggle: (
    items: DataTableColumnToggleItem[],
    toggle: (key: string, visible: boolean) => void,
    reset: () => void,
    move: (key: string, toIndex: number) => void,
    kind?: DataTableColumnToggleKind
  ) => void;
  clearColumnToggle: () => void;
}

export const useDataTableColumnsStore = create<DataTableColumnsState>()(
  devtools(
    (set) => ({
      columnToggleItems: [],
      kind: 'columns',
      toggleColumnVisibility: null,
      moveColumn: null,
      resetColumns: null,

      setColumnToggle: (items, toggle, reset, move, kind = 'columns') =>
        set({
          columnToggleItems: items,
          kind,
          toggleColumnVisibility: toggle,
          resetColumns: reset,
          moveColumn: move,
        }),
      clearColumnToggle: () =>
        set({
          columnToggleItems: [],
          kind: 'columns',
          toggleColumnVisibility: null,
          resetColumns: null,
          moveColumn: null,
        }),
    }),
    { name: 'grant-data-table-columns-store' }
  )
);
