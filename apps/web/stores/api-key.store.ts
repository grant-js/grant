import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { API_KEY_SCOPES_PAGE_LIMIT } from '@/lib/api-key-scope-groups';

interface ApiKeyState {
  grantScopesPage: number;
  projectScopesPage: number;
  scopesLimit: number;

  setGrantScopesPage: (page: number) => void;
  setProjectScopesPage: (page: number) => void;
  setScopesLimit: (limit: number) => void;

  reset: () => void;
}

const initialState = {
  grantScopesPage: 1,
  projectScopesPage: 1,
  scopesLimit: API_KEY_SCOPES_PAGE_LIMIT,
};

export const useApiKeyStore = create<ApiKeyState>()(
  devtools(
    (set) => ({
      ...initialState,

      setGrantScopesPage: (grantScopesPage) => set({ grantScopesPage }),
      setProjectScopesPage: (projectScopesPage) => set({ projectScopesPage }),
      setScopesLimit: (scopesLimit) =>
        set({ scopesLimit, grantScopesPage: 1, projectScopesPage: 1 }),

      reset: () => set(initialState),
    }),
    { name: 'grant-api-key-store' }
  )
);
