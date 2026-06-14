import {
  GroupSortableField,
  PermissionSortableField,
  SortOrder,
  TagSortField,
} from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { DetailAttachmentFilter } from '@/lib/detail-attachment-filter';

interface RoleState {
  groupsPage: number;
  groupsLimit: number;
  groupsSearch: string;
  groupsSort: { field: GroupSortableField; order: SortOrder };
  groupsAttachmentFilter: DetailAttachmentFilter;
  updatingGroupId: string | null;
  optimisticCheckedGroupIds: Set<string>;
  groupsRefetch: (() => void) | null;

  tagsPage: number;
  tagsLimit: number;
  tagsSearch: string;
  tagsSort: { field: TagSortField; order: SortOrder };
  tagsAttachmentFilter: DetailAttachmentFilter;
  updatingTagId: string | null;
  optimisticCheckedTagIds: Set<string>;
  tagsRefetch: (() => void) | null;

  permissionsPage: number;
  permissionsLimit: number;
  permissionsSearch: string;
  permissionsSort: { field: PermissionSortableField; order: SortOrder };
  permissionsAttachmentFilter: DetailAttachmentFilter;
  updatingPermissionId: string | null;
  optimisticDirectPermissionIds: Set<string>;
  permissionsRefetch: (() => void) | null;

  setGroupsPage: (page: number) => void;
  setGroupsLimit: (limit: number) => void;
  setGroupsSearch: (search: string) => void;
  setGroupsSort: (field: GroupSortableField, order: SortOrder) => void;
  setGroupsAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingGroupId: (groupId: string | null) => void;
  setOptimisticCheckedGroupIds: (groupIds: Set<string>) => void;
  addOptimisticGroupId: (groupId: string) => void;
  removeOptimisticGroupId: (groupId: string) => void;
  setGroupsRefetch: (refetch: (() => void) | null) => void;

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

  setPermissionsPage: (page: number) => void;
  setPermissionsLimit: (limit: number) => void;
  setPermissionsSearch: (search: string) => void;
  setPermissionsSort: (field: PermissionSortableField, order: SortOrder) => void;
  setPermissionsAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingPermissionId: (permissionId: string | null) => void;
  setOptimisticDirectPermissionIds: (permissionIds: Set<string>) => void;
  addOptimisticDirectPermissionId: (permissionId: string) => void;
  removeOptimisticDirectPermissionId: (permissionId: string) => void;
  setPermissionsRefetch: (refetch: (() => void) | null) => void;

  resetAll: () => void;
}

const defaultGroupsSort = { field: GroupSortableField.Name, order: SortOrder.Asc };
const defaultTagsSort = { field: TagSortField.Name, order: SortOrder.Asc };

const defaultPermissionsSort = {
  field: PermissionSortableField.Name,
  order: SortOrder.Asc,
};

export const useRoleStore = create<RoleState>()(
  devtools(
    (set) => ({
      groupsPage: 1,
      groupsLimit: 10,
      groupsSearch: '',
      groupsSort: defaultGroupsSort,
      groupsAttachmentFilter: 'all',
      updatingGroupId: null,
      optimisticCheckedGroupIds: new Set(),
      groupsRefetch: null,

      tagsPage: 1,
      tagsLimit: 10,
      tagsSearch: '',
      tagsSort: defaultTagsSort,
      tagsAttachmentFilter: 'all',
      updatingTagId: null,
      optimisticCheckedTagIds: new Set(),
      tagsRefetch: null,

      permissionsPage: 1,
      permissionsLimit: 10,
      permissionsSearch: '',
      permissionsSort: defaultPermissionsSort,
      permissionsAttachmentFilter: 'all',
      updatingPermissionId: null,
      optimisticDirectPermissionIds: new Set(),
      permissionsRefetch: null,

      setGroupsPage: (page) => set({ groupsPage: page }),
      setGroupsLimit: (limit) => set({ groupsLimit: limit, groupsPage: 1 }),
      setGroupsSearch: (search) => set({ groupsSearch: search, groupsPage: 1 }),
      setGroupsSort: (field, order) => set({ groupsSort: { field, order }, groupsPage: 1 }),
      setGroupsAttachmentFilter: (filter) => set({ groupsAttachmentFilter: filter, groupsPage: 1 }),
      setUpdatingGroupId: (groupId) => set({ updatingGroupId: groupId }),
      setOptimisticCheckedGroupIds: (groupIds) => set({ optimisticCheckedGroupIds: groupIds }),
      addOptimisticGroupId: (groupId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedGroupIds);
          next.add(groupId);
          return { optimisticCheckedGroupIds: next };
        }),
      removeOptimisticGroupId: (groupId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedGroupIds);
          next.delete(groupId);
          return { optimisticCheckedGroupIds: next };
        }),
      setGroupsRefetch: (refetch) => set({ groupsRefetch: refetch }),

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

      setPermissionsPage: (page) => set({ permissionsPage: page }),
      setPermissionsLimit: (limit) => set({ permissionsLimit: limit, permissionsPage: 1 }),
      setPermissionsSearch: (search) => set({ permissionsSearch: search, permissionsPage: 1 }),
      setPermissionsSort: (field, order) =>
        set({ permissionsSort: { field, order }, permissionsPage: 1 }),
      setPermissionsAttachmentFilter: (filter) =>
        set({ permissionsAttachmentFilter: filter, permissionsPage: 1 }),
      setUpdatingPermissionId: (permissionId) => set({ updatingPermissionId: permissionId }),
      setOptimisticDirectPermissionIds: (permissionIds) =>
        set({ optimisticDirectPermissionIds: permissionIds }),
      addOptimisticDirectPermissionId: (permissionId) =>
        set((state) => {
          const next = new Set(state.optimisticDirectPermissionIds);
          next.add(permissionId);
          return { optimisticDirectPermissionIds: next };
        }),
      removeOptimisticDirectPermissionId: (permissionId) =>
        set((state) => {
          const next = new Set(state.optimisticDirectPermissionIds);
          next.delete(permissionId);
          return { optimisticDirectPermissionIds: next };
        }),
      setPermissionsRefetch: (refetch) => set({ permissionsRefetch: refetch }),

      resetAll: () =>
        set({
          groupsPage: 1,
          groupsLimit: 10,
          groupsSearch: '',
          groupsSort: defaultGroupsSort,
          groupsAttachmentFilter: 'all',
          updatingGroupId: null,
          optimisticCheckedGroupIds: new Set(),
          groupsRefetch: null,
          tagsPage: 1,
          tagsLimit: 10,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          tagsAttachmentFilter: 'all',
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          tagsRefetch: null,
          permissionsPage: 1,
          permissionsLimit: 10,
          permissionsSearch: '',
          permissionsSort: defaultPermissionsSort,
          permissionsAttachmentFilter: 'all',
          updatingPermissionId: null,
          optimisticDirectPermissionIds: new Set(),
          permissionsRefetch: null,
        }),
    }),
    { name: 'grant-role-store' }
  )
);
