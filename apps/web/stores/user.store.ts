import {
  ApiKeySortableField,
  RoleSortableField,
  SortOrder,
  TagSortField,
} from '@logusgraphics/grant-schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  // API Keys state
  apiKeysPage: number;
  apiKeysLimit: number;
  apiKeysSearch: string;
  apiKeysSort: { field: ApiKeySortableField; order: SortOrder };
  apiKeysSecretDialogOpen: boolean;
  createdApiKey: { clientId: string; clientSecret: string } | null;

  // Roles state
  rolesPage: number;
  rolesLimit: number;
  rolesSearch: string;
  rolesSort: { field: RoleSortableField; order: SortOrder };
  updatingRoleId: string | null;
  optimisticCheckedRoleIds: Set<string>;

  // Tags state
  tagsPage: number;
  tagsLimit: number;
  tagsSearch: string;
  tagsSort: { field: TagSortField; order: SortOrder };
  updatingTagId: string | null;
  optimisticCheckedTagIds: Set<string>;

  // Groups state
  groupsPage: number;
  groupsLimit: number;

  // Permissions state
  permissionsPage: number;
  permissionsLimit: number;

  // Actions - API Keys
  setApiKeysPage: (page: number) => void;
  setApiKeysLimit: (limit: number) => void;
  setApiKeysSearch: (search: string) => void;
  setApiKeysSort: (field: ApiKeySortableField, order: SortOrder) => void;
  setApiKeysSecretDialogOpen: (open: boolean) => void;
  setCreatedApiKey: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  handleApiKeyCreated: (apiKey: { clientId: string; clientSecret: string } | null) => void;

  // Actions - Roles
  setRolesPage: (page: number) => void;
  setRolesLimit: (limit: number) => void;
  setRolesSearch: (search: string) => void;
  setRolesSort: (field: RoleSortableField, order: SortOrder) => void;
  setUpdatingRoleId: (roleId: string | null) => void;
  setOptimisticCheckedRoleIds: (roleIds: Set<string>) => void;
  addOptimisticRoleId: (roleId: string) => void;
  removeOptimisticRoleId: (roleId: string) => void;

  // Actions - Tags
  setTagsPage: (page: number) => void;
  setTagsLimit: (limit: number) => void;
  setTagsSearch: (search: string) => void;
  setTagsSort: (field: TagSortField, order: SortOrder) => void;
  setUpdatingTagId: (tagId: string | null) => void;
  setOptimisticCheckedTagIds: (tagIds: Set<string>) => void;
  addOptimisticTagId: (tagId: string) => void;
  removeOptimisticTagId: (tagId: string) => void;

  // Actions - Groups
  setGroupsPage: (page: number) => void;
  setGroupsLimit: (limit: number) => void;

  // Actions - Permissions
  setPermissionsPage: (page: number) => void;
  setPermissionsLimit: (limit: number) => void;

  // Reset
  resetApiKeysState: () => void;
  resetRolesState: () => void;
  resetTagsState: () => void;
  resetGroupsState: () => void;
  resetPermissionsState: () => void;
  resetAll: () => void;
}

const defaultApiKeysSort = {
  field: ApiKeySortableField.CreatedAt,
  order: SortOrder.Desc,
};

const defaultRolesSort = {
  field: RoleSortableField.Name,
  order: SortOrder.Asc,
};

const defaultTagsSort = {
  field: TagSortField.Name,
  order: SortOrder.Asc,
};

export const useUserStore = create<UserState>()(
  devtools(
    (set) => ({
      // Initial state - API Keys
      apiKeysPage: 1,
      apiKeysLimit: 10,
      apiKeysSearch: '',
      apiKeysSort: defaultApiKeysSort,
      apiKeysSecretDialogOpen: false,
      createdApiKey: null,

      // Initial state - Roles
      rolesPage: 1,
      rolesLimit: 10,
      rolesSearch: '',
      rolesSort: defaultRolesSort,
      updatingRoleId: null,
      optimisticCheckedRoleIds: new Set(),

      // Initial state - Tags
      tagsPage: 1,
      tagsLimit: 10,
      tagsSearch: '',
      tagsSort: defaultTagsSort,
      updatingTagId: null,
      optimisticCheckedTagIds: new Set(),

      // Initial state - Groups
      groupsPage: 1,
      groupsLimit: 10,

      // Initial state - Permissions
      permissionsPage: 1,
      permissionsLimit: 10,

      // Actions - API Keys
      setApiKeysPage: (page) => set({ apiKeysPage: page }),
      setApiKeysLimit: (limit) => set({ apiKeysLimit: limit, apiKeysPage: 1 }),
      setApiKeysSearch: (search) => set({ apiKeysSearch: search, apiKeysPage: 1 }),
      setApiKeysSort: (field, order) => set({ apiKeysSort: { field, order }, apiKeysPage: 1 }),
      setApiKeysSecretDialogOpen: (open) => set({ apiKeysSecretDialogOpen: open }),
      setCreatedApiKey: (apiKey) => set({ createdApiKey: apiKey }),
      handleApiKeyCreated: (apiKey) => {
        if (apiKey) {
          set({ createdApiKey: apiKey, apiKeysSecretDialogOpen: true });
        }
      },

      // Actions - Roles
      setRolesPage: (page) => set({ rolesPage: page }),
      setRolesLimit: (limit) => set({ rolesLimit: limit, rolesPage: 1 }),
      setRolesSearch: (search) => set({ rolesSearch: search, rolesPage: 1 }),
      setRolesSort: (field, order) => set({ rolesSort: { field, order }, rolesPage: 1 }),
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

      // Actions - Tags
      setTagsPage: (page) => set({ tagsPage: page }),
      setTagsLimit: (limit) => set({ tagsLimit: limit, tagsPage: 1 }),
      setTagsSearch: (search) => set({ tagsSearch: search, tagsPage: 1 }),
      setTagsSort: (field, order) => set({ tagsSort: { field, order }, tagsPage: 1 }),
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

      // Actions - Groups
      setGroupsPage: (page) => set({ groupsPage: page }),
      setGroupsLimit: (limit) => set({ groupsLimit: limit, groupsPage: 1 }),

      // Actions - Permissions
      setPermissionsPage: (page) => set({ permissionsPage: page }),
      setPermissionsLimit: (limit) => set({ permissionsLimit: limit, permissionsPage: 1 }),

      // Reset
      resetApiKeysState: () =>
        set({
          apiKeysPage: 1,
          apiKeysLimit: 10,
          apiKeysSearch: '',
          apiKeysSort: defaultApiKeysSort,
          apiKeysSecretDialogOpen: false,
          createdApiKey: null,
        }),
      resetRolesState: () =>
        set({
          rolesPage: 1,
          rolesLimit: 10,
          rolesSearch: '',
          rolesSort: defaultRolesSort,
          updatingRoleId: null,
          optimisticCheckedRoleIds: new Set(),
        }),
      resetTagsState: () =>
        set({
          tagsPage: 1,
          tagsLimit: 10,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
        }),
      resetGroupsState: () =>
        set({
          groupsPage: 1,
          groupsLimit: 10,
        }),
      resetPermissionsState: () =>
        set({
          permissionsPage: 1,
          permissionsLimit: 10,
        }),
      resetAll: () =>
        set({
          apiKeysPage: 1,
          apiKeysLimit: 10,
          apiKeysSearch: '',
          apiKeysSort: defaultApiKeysSort,
          apiKeysSecretDialogOpen: false,
          createdApiKey: null,
          rolesPage: 1,
          rolesLimit: 10,
          rolesSearch: '',
          rolesSort: defaultRolesSort,
          updatingRoleId: null,
          optimisticCheckedRoleIds: new Set(),
          tagsPage: 1,
          tagsLimit: 10,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          groupsPage: 1,
          groupsLimit: 10,
          permissionsPage: 1,
          permissionsLimit: 10,
        }),
    }),
    { name: 'user-store' }
  )
);
