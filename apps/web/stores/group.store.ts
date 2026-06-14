import { PermissionSortableField, SortOrder, TagSortField } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { DetailAttachmentFilter } from '@/lib/detail-attachment-filter';

interface GroupState {
  permissionsPage: number;
  permissionsLimit: number;
  permissionsSearch: string;
  permissionsSort: { field: PermissionSortableField; order: SortOrder };
  permissionsAttachmentFilter: DetailAttachmentFilter;
  updatingPermissionId: string | null;
  optimisticCheckedPermissionIds: Set<string>;
  permissionsRefetch: (() => void) | null;

  tagsPage: number;
  tagsLimit: number;
  tagsSearch: string;
  tagsSort: { field: TagSortField; order: SortOrder };
  tagsAttachmentFilter: DetailAttachmentFilter;
  updatingTagId: string | null;
  optimisticCheckedTagIds: Set<string>;
  tagsRefetch: (() => void) | null;

  setPermissionsPage: (page: number) => void;
  setPermissionsLimit: (limit: number) => void;
  setPermissionsSearch: (search: string) => void;
  setPermissionsSort: (field: PermissionSortableField, order: SortOrder) => void;
  setPermissionsAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingPermissionId: (permissionId: string | null) => void;
  setOptimisticCheckedPermissionIds: (permissionIds: Set<string>) => void;
  addOptimisticPermissionId: (permissionId: string) => void;
  removeOptimisticPermissionId: (permissionId: string) => void;
  setPermissionsRefetch: (refetch: (() => void) | null) => void;

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

const defaultPermissionsSort = {
  field: PermissionSortableField.Name,
  order: SortOrder.Asc,
};
const defaultTagsSort = { field: TagSortField.Name, order: SortOrder.Asc };

export const useGroupStore = create<GroupState>()(
  devtools(
    (set) => ({
      permissionsPage: 1,
      permissionsLimit: 10,
      permissionsSearch: '',
      permissionsSort: defaultPermissionsSort,
      permissionsAttachmentFilter: 'all',
      updatingPermissionId: null,
      optimisticCheckedPermissionIds: new Set(),
      permissionsRefetch: null,

      tagsPage: 1,
      tagsLimit: 10,
      tagsSearch: '',
      tagsSort: defaultTagsSort,
      tagsAttachmentFilter: 'all',
      updatingTagId: null,
      optimisticCheckedTagIds: new Set(),
      tagsRefetch: null,

      setPermissionsPage: (page) => set({ permissionsPage: page }),
      setPermissionsLimit: (limit) => set({ permissionsLimit: limit, permissionsPage: 1 }),
      setPermissionsSearch: (search) => set({ permissionsSearch: search, permissionsPage: 1 }),
      setPermissionsSort: (field, order) =>
        set({ permissionsSort: { field, order }, permissionsPage: 1 }),
      setPermissionsAttachmentFilter: (filter) =>
        set({ permissionsAttachmentFilter: filter, permissionsPage: 1 }),
      setUpdatingPermissionId: (permissionId) => set({ updatingPermissionId: permissionId }),
      setOptimisticCheckedPermissionIds: (permissionIds) =>
        set({ optimisticCheckedPermissionIds: permissionIds }),
      addOptimisticPermissionId: (permissionId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedPermissionIds);
          next.add(permissionId);
          return { optimisticCheckedPermissionIds: next };
        }),
      removeOptimisticPermissionId: (permissionId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedPermissionIds);
          next.delete(permissionId);
          return { optimisticCheckedPermissionIds: next };
        }),
      setPermissionsRefetch: (refetch) => set({ permissionsRefetch: refetch }),

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
          permissionsPage: 1,
          permissionsLimit: 10,
          permissionsSearch: '',
          permissionsSort: defaultPermissionsSort,
          permissionsAttachmentFilter: 'all',
          updatingPermissionId: null,
          optimisticCheckedPermissionIds: new Set(),
          permissionsRefetch: null,
          tagsPage: 1,
          tagsLimit: 10,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          tagsAttachmentFilter: 'all',
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          tagsRefetch: null,
        }),
    }),
    { name: 'grant-group-store' }
  )
);
