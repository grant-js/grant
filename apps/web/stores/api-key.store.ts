import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { API_KEY_SCOPES_PAGE_LIMIT } from '@/lib/api-key-scope-groups';

interface ApiKeyState {
  scopesPage: number;
  scopesLimit: number;

  setScopesPage: (page: number) => void;
  setScopesLimit: (limit: number) => void;

  reset: () => void;
}

const initialState = {
  scopesPage: 1,
  scopesLimit: API_KEY_SCOPES_PAGE_LIMIT,
};

export const useApiKeyStore = create<ApiKeyState>()(
  devtools(
    (set) => ({
      ...initialState,

      setScopesPage: (scopesPage) => set({ scopesPage }),
      setScopesLimit: (scopesLimit) => set({ scopesLimit, scopesPage: 1 }),

      reset: () => set(initialState),
    }),
    { name: 'grant-api-key-store' }
  )
);
