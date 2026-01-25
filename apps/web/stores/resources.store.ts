import { Resource, ResourceSortableField, SortOrder } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { ResourceView } from '@/components/features/resources/resource-types';

interface ResourcesState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: ResourceSortableField; order: SortOrder };
  view: ResourceView;
  selectedTagIds: string[];
  totalCount: number;
  isInitialized: boolean;

  // Data state
  resources: Resource[];
  loading: boolean;

  // Refetch callback
  refetch: (() => void) | null;

  // Dialog state
  resourceToDelete: Resource | null;
  resourceToEdit: Resource | null;
  isCreateDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: ResourceSortableField, order: SortOrder) => void;
  setView: (view: ResourceView) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTotalCount: (count: number) => void;
  setResources: (resources: Resource[]) => void;
  setLoading: (loading: boolean) => void;
  setRefetch: (refetch: (() => void) | null) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setResourceToDelete: (resource: Resource | null) => void;
  setResourceToEdit: (resource: Resource | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

const defaultSort = { field: ResourceSortableField.Name, order: SortOrder.Asc };

export const useResourcesStore = create<ResourcesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: ResourceView.CARD,
      selectedTagIds: [],
      totalCount: 0,
      isInitialized: false,

      // Data state
      resources: [],
      loading: false,

      // Refetch callback
      refetch: null,

      // Dialog state
      resourceToDelete: null,
      resourceToEdit: null,
      isCreateDialogOpen: false,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setResources: (resources) => set({ resources }),
      setLoading: (loading) => set({ loading }),
      setRefetch: (refetch) => set({ refetch }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: ResourceView.CARD,
          selectedTagIds: [],
          totalCount: 0,
          isInitialized: false,
          resources: [],
          loading: false,
          refetch: null,
          resourceToDelete: null,
          resourceToEdit: null,
          isCreateDialogOpen: false,
        }),
      initializeFromUrl: (params) => {
        const currentState = get();
        if (currentState.isInitialized) {
          return;
        }

        const page = Number(params.get('page')) || 1;
        const limit = Number(params.get('limit')) || 50;
        const search = params.get('search') || '';
        const sortField = params.get('sortField') as ResourceSortableField | null;
        const sortOrder = params.get('sortOrder') as SortOrder | null;
        const view = (params.get('view') as ResourceView) || ResourceView.CARD;
        const tagIds = params.get('tagIds')?.split(',').filter(Boolean) || [];

        const sort = sortField && sortOrder ? { field: sortField, order: sortOrder } : defaultSort;

        set({
          page,
          limit,
          search,
          sort,
          view,
          selectedTagIds: tagIds,
          isInitialized: true,
        });
      },

      // Dialog actions
      setResourceToDelete: (resource) => set({ resourceToDelete: resource }),
      setResourceToEdit: (resource) => set({ resourceToEdit: resource }),
      setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
    }),
    { name: 'grant-resources-store' }
  )
);
