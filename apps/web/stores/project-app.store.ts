import { SortOrder, TagSortField } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { DetailAttachmentFilter } from '@/lib/detail-attachment-filter';

interface ProjectAppState {
  tagsPage: number;
  tagsLimit: number;
  tagsSearch: string;
  tagsSort: { field: TagSortField; order: SortOrder };
  tagsAttachmentFilter: DetailAttachmentFilter;
  updatingTagId: string | null;
  optimisticCheckedTagIds: Set<string>;
  tagsRefetch: (() => void) | null;

  setTagsPage: (page: number) => void;
  setTagsLimit: (limit: number) => void;
  setTagsSearch: (search: string) => void;
  setTagsSort: (field: TagSortField, order: SortOrder) => void;
  setTagsAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingTagId: (tagId: string | null) => void;
  setOptimisticCheckedTagIds: (tagIds: Set<string>) => void;
  addOptimisticTagId: (tagId: string) => void;
  removeOptimisticTagId: (tagId: string) => void;
  setTagsRefetch: (refetch: (() => void) | null) => void;

  resetAll: () => void;
}

const defaultTagsSort = { field: TagSortField.Name, order: SortOrder.Asc };

export const PROJECT_APP_TAGS_PAGE_LIMIT = 10;

export const useProjectAppStore = create<ProjectAppState>()(
  devtools(
    (set) => ({
      tagsPage: 1,
      tagsLimit: PROJECT_APP_TAGS_PAGE_LIMIT,
      tagsSearch: '',
      tagsSort: defaultTagsSort,
      tagsAttachmentFilter: 'all',
      updatingTagId: null,
      optimisticCheckedTagIds: new Set(),
      tagsRefetch: null,

      setTagsPage: (page) => set({ tagsPage: page }),
      setTagsLimit: (limit) => set({ tagsLimit: limit, tagsPage: 1 }),
      setTagsSearch: (search) => set({ tagsSearch: search, tagsPage: 1 }),
      setTagsSort: (field, order) => set({ tagsSort: { field, order }, tagsPage: 1 }),
      setTagsAttachmentFilter: (filter) => set({ tagsAttachmentFilter: filter, tagsPage: 1 }),
      setUpdatingTagId: (tagId) => set({ updatingTagId: tagId }),
      setOptimisticCheckedTagIds: (tagIds) => set({ optimisticCheckedTagIds: tagIds }),
      addOptimisticTagId: (tagId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedTagIds);
          next.add(tagId);
          return { optimisticCheckedTagIds: next };
        }),
      removeOptimisticTagId: (tagId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedTagIds);
          next.delete(tagId);
          return { optimisticCheckedTagIds: next };
        }),
      setTagsRefetch: (refetch) => set({ tagsRefetch: refetch }),

      resetAll: () =>
        set({
          tagsPage: 1,
          tagsLimit: PROJECT_APP_TAGS_PAGE_LIMIT,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          tagsAttachmentFilter: 'all',
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          tagsRefetch: null,
        }),
    }),
    { name: 'grant-project-app-store' }
  )
);
