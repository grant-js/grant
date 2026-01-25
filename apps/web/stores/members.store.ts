import { OrganizationMemberSortableField, SortOrder } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { MemberView } from '@/components/features/members/member-types';
import { MemberWithInvitation } from '@/hooks/members';

interface MembersState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: OrganizationMemberSortableField; order: SortOrder };
  view: MemberView;
  totalCount: number;
  isInitialized: boolean;

  // Data state
  members: MemberWithInvitation[];
  loading: boolean;

  // Refetch callback
  refetch: (() => void) | null;

  // Dialog state
  isInviteDialogOpen: boolean;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: OrganizationMemberSortableField, order: SortOrder) => void;
  setView: (view: MemberView) => void;
  setTotalCount: (count: number) => void;
  setMembers: (members: MemberWithInvitation[]) => void;
  setLoading: (loading: boolean) => void;
  setRefetch: (refetch: (() => void) | null) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setInviteDialogOpen: (open: boolean) => void;
}

const defaultSort = {
  field: OrganizationMemberSortableField.Name,
  order: SortOrder.Asc,
};

export const useMembersStore = create<MembersState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: MemberView.TABLE,
      totalCount: 0,
      isInitialized: false,

      // Data state
      members: [],
      loading: false,

      // Refetch callback
      refetch: null,

      // Dialog state
      isInviteDialogOpen: false,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setMembers: (members) => set({ members }),
      setLoading: (loading) => set({ loading }),
      setRefetch: (refetch) => set({ refetch }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: MemberView.TABLE,
          totalCount: 0,
          isInitialized: false,
          members: [],
          loading: false,
          refetch: null,
          isInviteDialogOpen: false,
        }),
      initializeFromUrl: (params) => {
        const currentState = get();
        if (currentState.isInitialized) {
          return;
        }

        const page = Number(params.get('page')) || 1;
        const limit = Number(params.get('limit')) || 50;
        const search = params.get('search') || '';
        const sortField = params.get('sortField') as OrganizationMemberSortableField | null;
        const sortOrder = params.get('sortOrder') as SortOrder | null;
        const view = (params.get('view') as MemberView) || MemberView.TABLE;

        const sort = sortField && sortOrder ? { field: sortField, order: sortOrder } : defaultSort;

        set({
          page,
          limit,
          search,
          sort,
          view,
          isInitialized: true,
        });
      },

      // Dialog actions
      setInviteDialogOpen: (open) => set({ isInviteDialogOpen: open }),
    }),
    { name: 'grant-members-store' }
  )
);
