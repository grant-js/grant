import { PermissionSortableField, Permission, SortOrder } from '@logusgraphics/grant-schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { PermissionView } from '@/components/features/permissions/PermissionViewSwitcher';

interface PermissionsState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: PermissionSortableField; order: SortOrder };
  view: PermissionView;
  selectedTagIds: string[];
  totalCount: number;
  isInitialized: boolean;

  // Data state
  permissions: Permission[];
  loading: boolean;

  // Dialog state
  permissionToDelete: Permission | null;
  permissionToEdit: Permission | null;
  isCreateDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: PermissionSortableField, order: SortOrder) => void;
  setView: (view: PermissionView) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTotalCount: (count: number) => void;
  setPermissions: (permissions: Permission[]) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setPermissionToDelete: (permission: Permission | null) => void;
  setPermissionToEdit: (permission: Permission | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

const defaultSort = { field: PermissionSortableField.Name, order: SortOrder.Asc };

export const usePermissionsStore = create<PermissionsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: PermissionView.CARD,
      selectedTagIds: [],
      totalCount: 0,
      isInitialized: false,

      // Data state
      permissions: [],
      loading: false,

      // Dialog state
      permissionToDelete: null,
      permissionToEdit: null,
      isCreateDialogOpen: false,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setPermissions: (permissions) => set({ permissions }),
      setLoading: (loading) => set({ loading }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: PermissionView.CARD,
          selectedTagIds: [],
          totalCount: 0,
          isInitialized: false,
          permissions: [],
          loading: false,
          permissionToDelete: null,
          permissionToEdit: null,
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
        const sortField = params.get('sortField') as PermissionSortableField | null;
        const sortOrder = params.get('sortOrder') as SortOrder | null;
        const view = (params.get('view') as PermissionView) || PermissionView.CARD;
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
      setPermissionToDelete: (permission) => set({ permissionToDelete: permission }),
      setPermissionToEdit: (permission) => set({ permissionToEdit: permission }),
      setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
    }),
    { name: 'permissions-store' }
  )
);
