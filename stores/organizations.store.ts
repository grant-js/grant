import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { OrganizationView } from '@/components/features/organizations/OrganizationViewSwitcher';
import { OrganizationSortableField, Organization, SortOrder } from '@/graphql/generated/types';

interface OrganizationsState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: OrganizationSortableField; order: SortOrder };
  view: OrganizationView;
  selectedTagIds: string[];
  totalCount: number;
  isInitialized: boolean;

  // Data state
  organizations: Organization[];
  loading: boolean;

  // Dialog state
  organizationToDelete: { id: string; name: string } | null;
  organizationToEdit: Organization | null;
  isCreateDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: OrganizationSortableField, order: SortOrder) => void;
  setView: (view: OrganizationView) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTotalCount: (count: number) => void;
  setOrganizations: (organizations: Organization[]) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setOrganizationToDelete: (organization: { id: string; name: string } | null) => void;
  setOrganizationToEdit: (organization: Organization | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

const defaultSort = { field: OrganizationSortableField.Name, order: SortOrder.Asc };

export const useOrganizationsStore = create<OrganizationsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: OrganizationView.CARD,
      selectedTagIds: [],
      totalCount: 0,
      isInitialized: false,

      // Data state
      organizations: [],
      loading: false,

      // Dialog state
      organizationToDelete: null,
      organizationToEdit: null,
      isCreateDialogOpen: false,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setOrganizations: (organizations) => set({ organizations }),
      setLoading: (loading) => set({ loading }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: OrganizationView.CARD,
          selectedTagIds: [],
          totalCount: 0,
          isInitialized: false,
          organizations: [],
          loading: false,
          organizationToDelete: null,
          organizationToEdit: null,
          isCreateDialogOpen: false,
        }),
      initializeFromUrl: (params) => {
        const state = get();
        if (state.isInitialized) return;

        const page = parseInt(params.get('page') || '1');
        const limit = parseInt(params.get('limit') || '50');
        const search = params.get('search') || '';
        const sortField =
          (params.get('sortField') as OrganizationSortableField) || OrganizationSortableField.Name;
        const sortOrder = (params.get('sortOrder') as SortOrder) || SortOrder.Asc;
        const view = (params.get('view') as OrganizationView) || OrganizationView.CARD;
        const selectedTagIds = params.get('tagIds')?.split(',').filter(Boolean) || [];

        set({
          page,
          limit,
          search,
          sort: { field: sortField, order: sortOrder },
          view,
          selectedTagIds,
          isInitialized: true,
        });
      },

      // Dialog actions
      setOrganizationToDelete: (organization) => set({ organizationToDelete: organization }),
      setOrganizationToEdit: (organization) => set({ organizationToEdit: organization }),
      setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
    }),
    {
      name: 'organizations-store',
    }
  )
);
