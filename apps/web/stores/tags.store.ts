import { SortOrder, Tag, TagSortField } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { TagView } from '@/components/features/tags/tag-types';

// Investigation (2026-08-08, web-code-quality slice 6): opened as the hardest instance of the
// ~13-store list family to decide whether a `createListStore()` factory could absorb the
// field-shape variance. Decision: no factory. Diffed against groups.store.ts/roles.store.ts
// with the entity name normalized out, this file's real variance is ~25 of 145 lines (missing
// `selectedTagIds`/`hideSyntheticEntities`/`current<Entity>` that groups/roles/permissions/users
// have, an extra `isCreateDialogOpen` they don't, no `devtools` name option) — but nearly every
// one of those lines is a *field/action key name* (`tagToDelete`, `currentGroup`, ...) that each
// entity's own `components/features/<entity>/*` already selects on directly, e.g.
// `useGroupsStore((s) => s.groupToDelete)`. A factory generic enough to keep those call sites
// unchanged needs mapped/conditional generics (per-key literal types, an optional
// extension-slice merge) whose own definition outsizes the ~25-line variance it would replace;
// a factory that renames the keys instead pushes an equivalent-sized diff onto every consuming
// component instead of removing it. Full call-site comparison in the slice 6 commit message.

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

  // Refetch callback
  refetch: (() => void) | null;

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
  setRefetch: (refetch: (() => void) | null) => void;
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

    // Refetch callback
    refetch: null,

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
    setRefetch: (refetch) => set({ refetch }),
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
        refetch: null,
        tagToDelete: null,
        tagToEdit: null,
        isCreateDialogOpen: false,
      }),
    initializeFromUrl: (params) => {
      const currentState = get();
      if (currentState.isInitialized) {
        return;
      }

      // Aligned to `Number(...) || default` (2026-08-08, slice 6) to match every other
      // URL-synced store (see groups.store.ts). This file previously used `parseInt(...)` with
      // `isNaN` guards, which silently accepts a malformed value with a
      // numeric prefix (`parseInt('12abc')` -> `12`) instead of falling back to the default the
      // way `Number('12abc')` (-> `NaN` -> `1`) does. No comment or evidence of intent was found
      // at this file's original commit (f013dd21, tags store added after groups.store.ts already
      // established the `Number(...) || default` convention) — for a `?page=`/`?limit=` query
      // param, silently coercing garbage input into a specific page number is the more
      // surprising behavior, so this was treated as a bug, not a deliberate divergence.
      const page = Number(params.get('page')) || 1;
      const limit = Number(params.get('limit')) || 50;
      const search = params.get('search') || '';
      const sortField = params.get('sortField') as TagSortField;
      const sortOrder = params.get('sortOrder') as SortOrder;
      const view = params.get('view') as TagView;

      set({
        page,
        limit,
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
