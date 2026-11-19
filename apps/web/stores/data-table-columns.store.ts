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
  /** Who published the current picker, so a list that stops publishing clears only its own. */
  owner: string | null;
  toggleColumnVisibility: ((key: string, visible: boolean) => void) | null;
  moveColumn: ((key: string, toIndex: number) => void) | null;
  resetColumns: (() => void) | null;

  setColumnToggle: (
    items: DataTableColumnToggleItem[],
    toggle: (key: string, visible: boolean) => void,
    reset: () => void,
    move: (key: string, toIndex: number) => void,
    kind?: DataTableColumnToggleKind,
    owner?: string
  ) => void;
  /** Clears the picker; with `owner`, only when that publisher still owns it. */
  clearColumnToggle: (owner?: string) => void;
}

export const useDataTableColumnsStore = create<DataTableColumnsState>()(
  devtools(
    (set) => ({
      columnToggleItems: [],
      kind: 'columns',
      owner: null,
      toggleColumnVisibility: null,
      moveColumn: null,
      resetColumns: null,

      setColumnToggle: (items, toggle, reset, move, kind = 'columns', owner) =>
        set({
          columnToggleItems: items,
          kind,
          owner: owner ?? null,
          toggleColumnVisibility: toggle,
          resetColumns: reset,
          moveColumn: move,
        }),
      clearColumnToggle: (owner) =>
        set((state) =>
          owner !== undefined && state.owner !== owner
            ? state
            : {
                columnToggleItems: [],
                kind: 'columns',
                owner: null,
                toggleColumnVisibility: null,
                resetColumns: null,
                moveColumn: null,
              }
        ),
    }),
    { name: 'grant-data-table-columns-store' }
  )
);
