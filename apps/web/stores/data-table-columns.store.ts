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

  setColumnToggle: (
    items: DataTableColumnToggleItem[],
    toggle: (key: string, visible: boolean) => void
  ) => void;
  clearColumnToggle: () => void;
}

export const useDataTableColumnsStore = create<DataTableColumnsState>()(
  devtools(
    (set) => ({
      columnToggleItems: [],
      toggleColumnVisibility: null,

      setColumnToggle: (items, toggle) =>
        set({ columnToggleItems: items, toggleColumnVisibility: toggle }),
      clearColumnToggle: () => set({ columnToggleItems: [], toggleColumnVisibility: null }),
    }),
    { name: 'grant-data-table-columns-store' }
  )
);
