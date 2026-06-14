import {
  GroupSortableField,
  PermissionSortableField,
  RoleSortableField,
  SortOrder,
  TagSortField,
} from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { DetailAttachmentFilter } from '@/lib/detail-attachment-filter';

interface UserState {
  // Roles state
  rolesPage: number;
  rolesLimit: number;
  rolesSearch: string;
  rolesSort: { field: RoleSortableField; order: SortOrder };
  rolesAttachmentFilter: DetailAttachmentFilter;
  updatingRoleId: string | null;
  optimisticCheckedRoleIds: Set<string>;
  rolesLoading: boolean;
  rolesRefetch: (() => void) | null;

  // Tags state
  tagsPage: number;
  tagsLimit: number;
  tagsSearch: string;
  tagsSort: { field: TagSortField; order: SortOrder };
  tagsAttachmentFilter: DetailAttachmentFilter;
  updatingTagId: string | null;
  optimisticCheckedTagIds: Set<string>;
  tagsLoading: boolean;
  tagsRefetch: (() => void) | null;

  // Groups state
  groupsPage: number;
  groupsLimit: number;
  groupsSearch: string;
  groupsSort: { field: GroupSortableField; order: SortOrder };
  groupsAttachmentFilter: DetailAttachmentFilter;
  updatingGroupId: string | null;
  optimisticDirectGroupIds: Set<string>;
  groupsLoading: boolean;
  groupsRefetch: (() => void) | null;

  // Permissions state
  permissionsPage: number;
  permissionsLimit: number;
  permissionsSearch: string;
  permissionsSort: { field: PermissionSortableField; order: SortOrder };
  permissionsAttachmentFilter: DetailAttachmentFilter;
  updatingPermissionId: string | null;
  optimisticDirectPermissionIds: Set<string>;
  permissionsLoading: boolean;
  permissionsRefetch: (() => void) | null;

  // Actions - Roles
  setRolesPage: (page: number) => void;
  setRolesLimit: (limit: number) => void;
  setRolesSearch: (search: string) => void;
  setRolesSort: (field: RoleSortableField, order: SortOrder) => void;
  setRolesAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingRoleId: (roleId: string | null) => void;
  setOptimisticCheckedRoleIds: (roleIds: Set<string>) => void;
  addOptimisticRoleId: (roleId: string) => void;
  removeOptimisticRoleId: (roleId: string) => void;
  setRolesLoading: (loading: boolean) => void;
  setRolesRefetch: (refetch: (() => void) | null) => void;

  // Actions - Tags
  setTagsPage: (page: number) => void;
  setTagsLimit: (limit: number) => void;
  setTagsSearch: (search: string) => void;
  setTagsSort: (field: TagSortField, order: SortOrder) => void;
  setTagsAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingTagId: (tagId: string | null) => void;
  setOptimisticCheckedTagIds: (tagIds: Set<string>) => void;
  addOptimisticTagId: (tagId: string) => void;
  removeOptimisticTagId: (tagId: string) => void;
  setTagsLoading: (loading: boolean) => void;
  setTagsRefetch: (refetch: (() => void) | null) => void;

  // Actions - Groups
  setGroupsPage: (page: number) => void;
  setGroupsLimit: (limit: number) => void;
  setGroupsSearch: (search: string) => void;
  setGroupsSort: (field: GroupSortableField, order: SortOrder) => void;
  setGroupsAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingGroupId: (groupId: string | null) => void;
  setOptimisticDirectGroupIds: (groupIds: Set<string>) => void;
  addOptimisticDirectGroupId: (groupId: string) => void;
  removeOptimisticDirectGroupId: (groupId: string) => void;
  setGroupsLoading: (loading: boolean) => void;
  setGroupsRefetch: (refetch: (() => void) | null) => void;

  // Actions - Permissions
  setPermissionsPage: (page: number) => void;
  setPermissionsLimit: (limit: number) => void;
  setPermissionsSearch: (search: string) => void;
  setPermissionsSort: (field: PermissionSortableField, order: SortOrder) => void;
  setPermissionsAttachmentFilter: (filter: DetailAttachmentFilter) => void;
  setUpdatingPermissionId: (permissionId: string | null) => void;
  setOptimisticDirectPermissionIds: (permissionIds: Set<string>) => void;
  addOptimisticDirectPermissionId: (permissionId: string) => void;
  removeOptimisticDirectPermissionId: (permissionId: string) => void;
  setPermissionsLoading: (loading: boolean) => void;
  setPermissionsRefetch: (refetch: (() => void) | null) => void;

  // Reset
  resetRolesState: () => void;
  resetTagsState: () => void;
  resetGroupsState: () => void;
  resetPermissionsState: () => void;
  resetAll: () => void;
}

const defaultRolesSort = {
  field: RoleSortableField.Name,
  order: SortOrder.Asc,
};

const defaultTagsSort = {
  field: TagSortField.Name,
  order: SortOrder.Asc,
};

const defaultGroupsSort = {
  field: GroupSortableField.Name,
  order: SortOrder.Asc,
};

const defaultPermissionsSort = {
  field: PermissionSortableField.Name,
  order: SortOrder.Asc,
};

export const useUserStore = create<UserState>()(
  devtools(
    (set) => ({
      // Initial state - Roles
      rolesPage: 1,
      rolesLimit: 10,
      rolesSearch: '',
      rolesSort: defaultRolesSort,
      rolesAttachmentFilter: 'all',
      updatingRoleId: null,
      optimisticCheckedRoleIds: new Set(),
      rolesLoading: false,
      rolesRefetch: null,

      // Initial state - Tags
      tagsPage: 1,
      tagsLimit: 10,
      tagsSearch: '',
      tagsSort: defaultTagsSort,
      tagsAttachmentFilter: 'all',
      updatingTagId: null,
      optimisticCheckedTagIds: new Set(),
      tagsLoading: false,
      tagsRefetch: null,

      // Initial state - Groups
      groupsPage: 1,
      groupsLimit: 10,
      groupsSearch: '',
      groupsSort: defaultGroupsSort,
      groupsAttachmentFilter: 'all',
      updatingGroupId: null,
      optimisticDirectGroupIds: new Set(),
      groupsLoading: false,
      groupsRefetch: null,

      // Initial state - Permissions
      permissionsPage: 1,
      permissionsLimit: 10,
      permissionsSearch: '',
      permissionsSort: defaultPermissionsSort,
      permissionsAttachmentFilter: 'all',
      updatingPermissionId: null,
      optimisticDirectPermissionIds: new Set(),
      permissionsLoading: false,
      permissionsRefetch: null,

      // Actions - Roles
      setRolesPage: (page) => set({ rolesPage: page }),
      setRolesLimit: (limit) => set({ rolesLimit: limit, rolesPage: 1 }),
      setRolesSearch: (search) => set({ rolesSearch: search, rolesPage: 1 }),
      setRolesSort: (field, order) => set({ rolesSort: { field, order }, rolesPage: 1 }),
      setRolesAttachmentFilter: (filter) => set({ rolesAttachmentFilter: filter, rolesPage: 1 }),
      setUpdatingRoleId: (roleId) => set({ updatingRoleId: roleId }),
      setOptimisticCheckedRoleIds: (roleIds) => set({ optimisticCheckedRoleIds: roleIds }),
      addOptimisticRoleId: (roleId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedRoleIds);
          next.add(roleId);
          return { optimisticCheckedRoleIds: next };
        }),
      removeOptimisticRoleId: (roleId) =>
        set((state) => {
          const next = new Set(state.optimisticCheckedRoleIds);
          next.delete(roleId);
          return { optimisticCheckedRoleIds: next };
        }),
      setRolesLoading: (loading) => set({ rolesLoading: loading }),
      setRolesRefetch: (refetch) => set({ rolesRefetch: refetch }),

      // Actions - Tags
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
      setTagsLoading: (loading) => set({ tagsLoading: loading }),
      setTagsRefetch: (refetch) => set({ tagsRefetch: refetch }),

      // Actions - Groups
      setGroupsPage: (page) => set({ groupsPage: page }),
      setGroupsLimit: (limit) => set({ groupsLimit: limit, groupsPage: 1 }),
      setGroupsSearch: (search) => set({ groupsSearch: search, groupsPage: 1 }),
      setGroupsSort: (field, order) => set({ groupsSort: { field, order }, groupsPage: 1 }),
      setGroupsAttachmentFilter: (filter) => set({ groupsAttachmentFilter: filter, groupsPage: 1 }),
      setUpdatingGroupId: (groupId) => set({ updatingGroupId: groupId }),
      setOptimisticDirectGroupIds: (groupIds) => set({ optimisticDirectGroupIds: groupIds }),
      addOptimisticDirectGroupId: (groupId) =>
        set((state) => {
          const next = new Set(state.optimisticDirectGroupIds);
          next.add(groupId);
          return { optimisticDirectGroupIds: next };
        }),
      removeOptimisticDirectGroupId: (groupId) =>
        set((state) => {
          const next = new Set(state.optimisticDirectGroupIds);
          next.delete(groupId);
          return { optimisticDirectGroupIds: next };
        }),
      setGroupsLoading: (loading) => set({ groupsLoading: loading }),
      setGroupsRefetch: (refetch) => set({ groupsRefetch: refetch }),

      // Actions - Permissions
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
      setPermissionsLoading: (loading) => set({ permissionsLoading: loading }),
      setPermissionsRefetch: (refetch) => set({ permissionsRefetch: refetch }),

      // Reset
      resetRolesState: () =>
        set({
          rolesPage: 1,
          rolesLimit: 10,
          rolesSearch: '',
          rolesSort: defaultRolesSort,
          rolesAttachmentFilter: 'all',
          updatingRoleId: null,
          optimisticCheckedRoleIds: new Set(),
          rolesLoading: false,
          rolesRefetch: null,
        }),
      resetTagsState: () =>
        set({
          tagsPage: 1,
          tagsLimit: 10,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          tagsAttachmentFilter: 'all',
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          tagsLoading: false,
          tagsRefetch: null,
        }),
      resetGroupsState: () =>
        set({
          groupsPage: 1,
          groupsLimit: 10,
          groupsSearch: '',
          groupsSort: defaultGroupsSort,
          groupsAttachmentFilter: 'all',
          updatingGroupId: null,
          optimisticDirectGroupIds: new Set(),
          groupsLoading: false,
          groupsRefetch: null,
        }),
      resetPermissionsState: () =>
        set({
          permissionsPage: 1,
          permissionsLimit: 10,
          permissionsSearch: '',
          permissionsSort: defaultPermissionsSort,
          permissionsAttachmentFilter: 'all',
          updatingPermissionId: null,
          optimisticDirectPermissionIds: new Set(),
          permissionsLoading: false,
          permissionsRefetch: null,
        }),
      resetAll: () =>
        set({
          rolesPage: 1,
          rolesLimit: 10,
          rolesSearch: '',
          rolesSort: defaultRolesSort,
          rolesAttachmentFilter: 'all',
          updatingRoleId: null,
          optimisticCheckedRoleIds: new Set(),
          rolesLoading: false,
          rolesRefetch: null,
          tagsPage: 1,
          tagsLimit: 10,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          tagsAttachmentFilter: 'all',
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          tagsLoading: false,
          tagsRefetch: null,
          groupsPage: 1,
          groupsLimit: 10,
          groupsSearch: '',
          groupsSort: defaultGroupsSort,
          groupsAttachmentFilter: 'all',
          updatingGroupId: null,
          optimisticDirectGroupIds: new Set(),
          groupsLoading: false,
          groupsRefetch: null,
          permissionsPage: 1,
          permissionsLimit: 10,
          permissionsSearch: '',
          permissionsSort: defaultPermissionsSort,
          permissionsAttachmentFilter: 'all',
          updatingPermissionId: null,
          optimisticDirectPermissionIds: new Set(),
          permissionsLoading: false,
          permissionsRefetch: null,
        }),
    }),
    { name: 'grant-user-store' }
  )
);
