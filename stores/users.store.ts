import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { UserView } from '@/components/features/users/UserViewSwitcher';
import { UserSortableField, UserSortOrder, User } from '@/graphql/generated/types';

interface UsersState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: UserSortableField; order: UserSortOrder };
  view: UserView;
  selectedTagIds: string[];
  totalCount: number;
  isInitialized: boolean;

  // Data state
  users: User[];
  loading: boolean;

  // Dialog state
  userToDelete: User | null;
  userToEdit: User | null;
  isCreateDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: UserSortableField, order: UserSortOrder) => void;
  setView: (view: UserView) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTotalCount: (count: number) => void;
  setUsers: (users: User[]) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setUserToDelete: (user: User | null) => void;
  setUserToEdit: (user: User | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

const defaultSort = { field: UserSortableField.Name, order: UserSortOrder.Asc };

export const useUsersStore = create<UsersState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: UserView.CARD,
      selectedTagIds: [],
      totalCount: 0,
      isInitialized: false,

      // Data state
      users: [],
      loading: false,

      // Dialog state
      userToDelete: null,
      userToEdit: null,
      isCreateDialogOpen: false,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setUsers: (users) => set({ users }),
      setLoading: (loading) => set({ loading }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: UserView.CARD,
          selectedTagIds: [],
          totalCount: 0,
          isInitialized: false,
          users: [],
          loading: false,
          userToDelete: null,
          userToEdit: null,
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
        const sortField = params.get('sortField') as UserSortableField | null;
        const sortOrder = params.get('sortOrder') as UserSortOrder | null;
        const view = (params.get('view') as UserView) || UserView.CARD;
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
      setUserToDelete: (user) => set({ userToDelete: user }),
      setUserToEdit: (user) => set({ userToEdit: user }),
      setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
    }),
    { name: 'users-store' }
  )
);
