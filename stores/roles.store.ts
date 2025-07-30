import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { RoleView } from '@/components/features/roles/RoleViewSwitcher';
import { RoleSortableField, RoleSortOrder, Role } from '@/graphql/generated/types';

interface RolesState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: RoleSortableField; order: RoleSortOrder };
  view: RoleView;
  selectedTagIds: string[];
  totalCount: number;
  isInitialized: boolean;

  // Data state
  roles: Role[];
  loading: boolean;

  // Dialog state
  roleToDelete: { id: string; name: string } | null;
  roleToEdit: Role | null;
  isCreateDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: RoleSortableField, order: RoleSortOrder) => void;
  setView: (view: RoleView) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTotalCount: (count: number) => void;
  setRoles: (roles: Role[]) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setRoleToDelete: (role: { id: string; name: string } | null) => void;
  setRoleToEdit: (role: Role | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

const defaultSort = { field: RoleSortableField.Name, order: RoleSortOrder.Asc };

export const useRolesStore = create<RolesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: RoleView.CARD,
      selectedTagIds: [],
      totalCount: 0,
      isInitialized: false,

      // Data state
      roles: [],
      loading: false,

      // Dialog state
      roleToDelete: null,
      roleToEdit: null,
      isCreateDialogOpen: false,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setRoles: (roles) => set({ roles }),
      setLoading: (loading) => set({ loading }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: RoleView.CARD,
          selectedTagIds: [],
          totalCount: 0,
          isInitialized: false,
          roles: [],
          loading: false,
          roleToDelete: null,
          roleToEdit: null,
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
        const sortField = params.get('sortField') as RoleSortableField | null;
        const sortOrder = params.get('sortOrder') as RoleSortOrder | null;
        const view = (params.get('view') as RoleView) || RoleView.CARD;
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
      setRoleToDelete: (role) => set({ roleToDelete: role }),
      setRoleToEdit: (role) => set({ roleToEdit: role }),
      setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
    }),
    { name: 'roles-store' }
  )
);
