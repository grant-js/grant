import { ApiKey, ApiKeySortableField, SortOrder } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { DataTableColumnToggleItem } from '@/components/common/data-table-column-toggle';

export type ApiKeyView = 'card' | 'table';
export type ApiKeySecretDialogMode = 'created' | 'rotated';

interface ApiKeysState {
  page: number;
  limit: number;
  totalCount: number;
  search: string;
  sort: { field: ApiKeySortableField; order: SortOrder };
  view: ApiKeyView;
  apiKeys: ApiKey[];
  secretDialogOpen: boolean;
  secretDialogMode: ApiKeySecretDialogMode;
  createdApiKey: { clientId: string; clientSecret: string } | null;
  loading: boolean;
  refetch: (() => void) | null;
  columnToggleItems: DataTableColumnToggleItem[];
  toggleColumnVisibility: ((key: string, visible: boolean) => void) | null;

  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotalCount: (totalCount: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: ApiKeySortableField, order: SortOrder) => void;
  setView: (view: ApiKeyView) => void;
  setApiKeys: (apiKeys: ApiKey[]) => void;
  setSecretDialogOpen: (open: boolean) => void;
  setCreatedApiKey: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  handleApiKeyCreated: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  handleApiKeyRotated: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  setLoading: (loading: boolean) => void;
  setRefetch: (refetch: (() => void) | null) => void;
  setColumnToggle: (
    items: DataTableColumnToggleItem[],
    toggle: (key: string, visible: boolean) => void
  ) => void;
  clearColumnToggle: () => void;

  reset: () => void;
}

const defaultSort = {
  field: ApiKeySortableField.CreatedAt,
  order: SortOrder.Desc,
};

const initialState = {
  page: 1,
  limit: 10,
  totalCount: 0,
  search: '',
  sort: defaultSort,
  view: 'card' as ApiKeyView,
  apiKeys: [] as ApiKey[],
  secretDialogOpen: false,
  secretDialogMode: 'created' as ApiKeySecretDialogMode,
  createdApiKey: null,
  loading: false,
  refetch: null as (() => void) | null,
  columnToggleItems: [] as DataTableColumnToggleItem[],
  toggleColumnVisibility: null as ((key: string, visible: boolean) => void) | null,
};

export const useApiKeysStore = create<ApiKeysState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setApiKeys: (apiKeys) => set({ apiKeys }),
      setSecretDialogOpen: (open) => set({ secretDialogOpen: open }),
      setCreatedApiKey: (apiKey) => set({ createdApiKey: apiKey }),
      handleApiKeyCreated: (apiKey) => {
        if (apiKey) {
          set({ createdApiKey: apiKey, secretDialogOpen: true, secretDialogMode: 'created' });
        }
      },
      handleApiKeyRotated: (apiKey) => {
        if (apiKey) {
          set({ createdApiKey: apiKey, secretDialogOpen: true, secretDialogMode: 'rotated' });
        }
      },
      setLoading: (loading) => set({ loading }),
      setRefetch: (refetch) => set({ refetch }),
      setColumnToggle: (items, toggle) =>
        set({ columnToggleItems: items, toggleColumnVisibility: toggle }),
      clearColumnToggle: () => set({ columnToggleItems: [], toggleColumnVisibility: null }),

      reset: () => set(initialState),
    }),
    { name: 'grant-api-keys-store' }
  )
);
