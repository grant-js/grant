import { ApiKeySortableField, RoleSortableField, SortOrder, TagSortField } from '@grantjs/schema';
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
  apiKeysLoading: boolean;
  apiKeysRefetch: (() => void) | null;

  // Roles state
  rolesPage: number;
  rolesLimit: number;
  rolesSearch: string;
  rolesSort: { field: RoleSortableField; order: SortOrder };
  updatingRoleId: string | null;
  optimisticCheckedRoleIds: Set<string>;
  rolesLoading: boolean;
  rolesRefetch: (() => void) | null;

  // Tags state
  tagsPage: number;
  tagsLimit: number;
  tagsSearch: string;
  tagsSort: { field: TagSortField; order: SortOrder };
  updatingTagId: string | null;
  optimisticCheckedTagIds: Set<string>;
  tagsLoading: boolean;
  tagsRefetch: (() => void) | null;

  // Groups state
  groupsPage: number;
  groupsLimit: number;
  groupsLoading: boolean;
  groupsRefetch: (() => void) | null;

  // Permissions state
  permissionsPage: number;
  permissionsLimit: number;
  permissionsLoading: boolean;
  permissionsRefetch: (() => void) | null;

  // Actions - API Keys
  setApiKeysPage: (page: number) => void;
  setApiKeysLimit: (limit: number) => void;
  setApiKeysSearch: (search: string) => void;
  setApiKeysSort: (field: ApiKeySortableField, order: SortOrder) => void;
  setApiKeysSecretDialogOpen: (open: boolean) => void;
  setCreatedApiKey: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  handleApiKeyCreated: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  setApiKeysLoading: (loading: boolean) => void;
  setApiKeysRefetch: (refetch: (() => void) | null) => void;

  // Actions - Roles
  setRolesPage: (page: number) => void;
  setRolesLimit: (limit: number) => void;
  setRolesSearch: (search: string) => void;
  setRolesSort: (field: RoleSortableField, order: SortOrder) => void;
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
  setUpdatingTagId: (tagId: string | null) => void;
  setOptimisticCheckedTagIds: (tagIds: Set<string>) => void;
  addOptimisticTagId: (tagId: string) => void;
  removeOptimisticTagId: (tagId: string) => void;
  setTagsLoading: (loading: boolean) => void;
  setTagsRefetch: (refetch: (() => void) | null) => void;

  // Actions - Groups
  setGroupsPage: (page: number) => void;
  setGroupsLimit: (limit: number) => void;
  setGroupsLoading: (loading: boolean) => void;
  setGroupsRefetch: (refetch: (() => void) | null) => void;

  // Actions - Permissions
  setPermissionsPage: (page: number) => void;
  setPermissionsLimit: (limit: number) => void;
  setPermissionsLoading: (loading: boolean) => void;
  setPermissionsRefetch: (refetch: (() => void) | null) => void;

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
      apiKeysLoading: false,
      apiKeysRefetch: null,

      // Initial state - Roles
      rolesPage: 1,
      rolesLimit: 10,
      rolesSearch: '',
      rolesSort: defaultRolesSort,
      updatingRoleId: null,
      optimisticCheckedRoleIds: new Set(),
      rolesLoading: false,
      rolesRefetch: null,

      // Initial state - Tags
      tagsPage: 1,
      tagsLimit: 10,
      tagsSearch: '',
      tagsSort: defaultTagsSort,
      updatingTagId: null,
      optimisticCheckedTagIds: new Set(),
      tagsLoading: false,
      tagsRefetch: null,

      // Initial state - Groups
      groupsPage: 1,
      groupsLimit: 10,
      groupsLoading: false,
      groupsRefetch: null,

      // Initial state - Permissions
      permissionsPage: 1,
      permissionsLimit: 10,
      permissionsLoading: false,
      permissionsRefetch: null,

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
      setApiKeysLoading: (loading) => set({ apiKeysLoading: loading }),
      setApiKeysRefetch: (refetch) => set({ apiKeysRefetch: refetch }),

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
      setRolesLoading: (loading) => set({ rolesLoading: loading }),
      setRolesRefetch: (refetch) => set({ rolesRefetch: refetch }),

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
      setTagsLoading: (loading) => set({ tagsLoading: loading }),
      setTagsRefetch: (refetch) => set({ tagsRefetch: refetch }),

      // Actions - Groups
      setGroupsPage: (page) => set({ groupsPage: page }),
      setGroupsLimit: (limit) => set({ groupsLimit: limit, groupsPage: 1 }),
      setGroupsLoading: (loading) => set({ groupsLoading: loading }),
      setGroupsRefetch: (refetch) => set({ groupsRefetch: refetch }),

      // Actions - Permissions
      setPermissionsPage: (page) => set({ permissionsPage: page }),
      setPermissionsLimit: (limit) => set({ permissionsLimit: limit, permissionsPage: 1 }),
      setPermissionsLoading: (loading) => set({ permissionsLoading: loading }),
      setPermissionsRefetch: (refetch) => set({ permissionsRefetch: refetch }),

      // Reset
      resetApiKeysState: () =>
        set({
          apiKeysPage: 1,
          apiKeysLimit: 10,
          apiKeysSearch: '',
          apiKeysSort: defaultApiKeysSort,
          apiKeysSecretDialogOpen: false,
          createdApiKey: null,
          apiKeysLoading: false,
          apiKeysRefetch: null,
        }),
      resetRolesState: () =>
        set({
          rolesPage: 1,
          rolesLimit: 10,
          rolesSearch: '',
          rolesSort: defaultRolesSort,
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
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          tagsLoading: false,
          tagsRefetch: null,
        }),
      resetGroupsState: () =>
        set({
          groupsPage: 1,
          groupsLimit: 10,
          groupsLoading: false,
          groupsRefetch: null,
        }),
      resetPermissionsState: () =>
        set({
          permissionsPage: 1,
          permissionsLimit: 10,
          permissionsLoading: false,
          permissionsRefetch: null,
        }),
      resetAll: () =>
        set({
          apiKeysPage: 1,
          apiKeysLimit: 10,
          apiKeysSearch: '',
          apiKeysSort: defaultApiKeysSort,
          apiKeysSecretDialogOpen: false,
          createdApiKey: null,
          apiKeysLoading: false,
          apiKeysRefetch: null,
          rolesPage: 1,
          rolesLimit: 10,
          rolesSearch: '',
          rolesSort: defaultRolesSort,
          updatingRoleId: null,
          optimisticCheckedRoleIds: new Set(),
          rolesLoading: false,
          rolesRefetch: null,
          tagsPage: 1,
          tagsLimit: 10,
          tagsSearch: '',
          tagsSort: defaultTagsSort,
          updatingTagId: null,
          optimisticCheckedTagIds: new Set(),
          tagsLoading: false,
          tagsRefetch: null,
          groupsPage: 1,
          groupsLimit: 10,
          groupsLoading: false,
          groupsRefetch: null,
          permissionsPage: 1,
          permissionsLimit: 10,
          permissionsLoading: false,
          permissionsRefetch: null,
        }),
    }),
    { name: 'grant-user-store' }
  )
);
