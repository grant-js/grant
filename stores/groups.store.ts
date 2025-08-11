import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { GroupView } from '@/components/features/groups/GroupViewSwitcher';
import { GroupSortableField, GroupSortOrder, Group } from '@/graphql/generated/types';

interface GroupsState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: GroupSortableField; order: GroupSortOrder };
  view: GroupView;
  selectedTagIds: string[];
  totalCount: number;
  isInitialized: boolean;

  // Data state
  groups: Group[];
  loading: boolean;

  // Dialog state
  groupToDelete: Group | null;
  groupToEdit: Group | null;
  isCreateDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: GroupSortableField, order: GroupSortOrder) => void;
  setView: (view: GroupView) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTotalCount: (count: number) => void;
  setGroups: (groups: Group[]) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setGroupToDelete: (group: Group | null) => void;
  setGroupToEdit: (group: Group | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

const defaultSort = { field: GroupSortableField.Name, order: GroupSortOrder.Asc };

export const useGroupsStore = create<GroupsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: GroupView.CARDS,
      selectedTagIds: [],
      totalCount: 0,
      isInitialized: false,

      // Data state
      groups: [],
      loading: false,

      // Dialog state
      groupToDelete: null,
      groupToEdit: null,
      isCreateDialogOpen: false,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setGroups: (groups) => set({ groups }),
      setLoading: (loading) => set({ loading }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: GroupView.CARDS,
          selectedTagIds: [],
          totalCount: 0,
          isInitialized: false,
          groups: [],
          loading: false,
          groupToDelete: null,
          groupToEdit: null,
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
        const sortField = params.get('sortField') as GroupSortableField | null;
        const sortOrder = params.get('sortOrder') as GroupSortOrder | null;
        const view = (params.get('view') as GroupView) || GroupView.CARDS;
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
      setGroupToDelete: (group) => set({ groupToDelete: group }),
      setGroupToEdit: (group) => set({ groupToEdit: group }),
      setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
    }),
    { name: 'groups-store' }
  )
);
