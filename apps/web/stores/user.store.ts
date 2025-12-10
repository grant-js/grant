import { ApiKeySortableField, RoleSortableField, SortOrder } from '@logusgraphics/grant-schema';
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

  // Reset
  resetApiKeysState: () => void;
  resetRolesState: () => void;
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
        }),
    }),
    { name: 'user-store' }
  )
);
