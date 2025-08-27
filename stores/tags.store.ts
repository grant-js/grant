import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { TagView } from '@/components/features/tags/TagViewSwitcher';
import { TagSortField, SortOrder, Tag } from '@/graphql/generated/types';

interface TagsState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: TagSortField; order: SortOrder };
  view: TagView;
  totalCount: number;
  isInitialized: boolean;

  // Data state
  tags: Tag[];
  loading: boolean;

  // Dialog state
  tagToDelete: Tag | null;
  tagToEdit: Tag | null;
  isCreateDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: TagSortField, order: SortOrder) => void;
  setView: (view: TagView) => void;
  setTotalCount: (count: number) => void;
  setTags: (tags: Tag[]) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setTagToDelete: (tag: Tag | null) => void;
  setTagToEdit: (tag: Tag | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

const defaultSort = { field: TagSortField.Name, order: SortOrder.Asc };

export const useTagsStore = create<TagsState>()(
  devtools((set, get) => ({
    // Initial state
    page: 1,
    limit: 50,
    search: '',
    sort: defaultSort,
    view: TagView.CARD,
    totalCount: 0,
    isInitialized: false,

    // Data state
    tags: [],
    loading: false,

    // Dialog state
    tagToDelete: null,
    tagToEdit: null,
    isCreateDialogOpen: false,

    // Actions
    setPage: (page) => set({ page }),
    setLimit: (limit) => set({ limit, page: 1 }),
    setSearch: (search) => set({ search, page: 1 }),
    setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
    setView: (view) => set({ view }),
    setTotalCount: (totalCount) => set({ totalCount }),
    setTags: (tags) => set({ tags }),
    setLoading: (loading) => set({ loading }),
    resetToDefaults: () =>
      set({
        page: 1,
        limit: 50,
        search: '',
        sort: defaultSort,
        view: TagView.CARD,
        totalCount: 0,
        isInitialized: false,
        tags: [],
        loading: false,
        tagToDelete: null,
        tagToEdit: null,
        isCreateDialogOpen: false,
      }),
    initializeFromUrl: (params) => {
      const currentState = get();
      if (currentState.isInitialized) {
        return;
      }

      const page = parseInt(params.get('page') || '1');
      const limit = parseInt(params.get('limit') || '50');
      const search = params.get('search') || '';
      const sortField = params.get('sortField') as TagSortField;
      const sortOrder = params.get('sortOrder') as SortOrder;
      const view = params.get('view') as TagView;

      set({
        page: isNaN(page) ? 1 : page,
        limit: isNaN(limit) ? 50 : limit,
        search,
        sort: sortField && sortOrder ? { field: sortField, order: sortOrder } : defaultSort,
        view: view || TagView.CARD,
        isInitialized: true,
      });
    },

    // Dialog actions
    setTagToDelete: (tag) => set({ tagToDelete: tag }),
    setTagToEdit: (tag) => set({ tagToEdit: tag }),
    setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
  }))
);
