import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { DataTableColumnToggleItem } from '@/components/common/data-table-column-toggle';

/**
 * Bridges a page's list table to the page toolbar, which renders in a separate subtree
 * (`DashboardLayout` `actions`). One list table per page publishes here.
 */
interface DataTableColumnsState {
  columnToggleItems: DataTableColumnToggleItem[];
  toggleColumnVisibility: ((key: string, visible: boolean) => void) | null;
  resetColumns: (() => void) | null;

  setColumnToggle: (
    items: DataTableColumnToggleItem[],
    toggle: (key: string, visible: boolean) => void,
    reset: () => void
  ) => void;
  clearColumnToggle: () => void;
}

export const useDataTableColumnsStore = create<DataTableColumnsState>()(
  devtools(
    (set) => ({
      columnToggleItems: [],
      toggleColumnVisibility: null,
      resetColumns: null,

      setColumnToggle: (items, toggle, reset) =>
        set({ columnToggleItems: items, toggleColumnVisibility: toggle, resetColumns: reset }),
      clearColumnToggle: () =>
        set({ columnToggleItems: [], toggleColumnVisibility: null, resetColumns: null }),
    }),
    { name: 'grant-data-table-columns-store' }
  )
);
