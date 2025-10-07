import { Account, AccountType } from '@logusgraphics/grant-schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { persist } from 'zustand/middleware';

import { removeStoredTokens, setStoredTokens } from '@/lib/auth';

interface AuthState {
  // Authentication state
  loading: boolean;

  // Account state
  accounts: Account[];
  currentAccount: Account | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  setLoading: (loading: boolean) => void;
  setAccounts: (accounts: Account[]) => void;
  setCurrentAccount: (account: Account | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  switchAccount: (accountId: string) => void;
  setAuthData: (data: { accounts: Account[]; accessToken: string; refreshToken: string }) => void;

  // Computed
  isAuthenticated: () => boolean;
  getCurrentPersonalAccount: () => Account | null;
  getCurrentOrganizationAccount: () => Account | null;
  hasMultipleAccounts: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        loading: true,

        // Account state
        accounts: [],
        currentAccount: null,
        accessToken: null,
        refreshToken: null,

        // Actions
        setLoading: (loading) => set({ loading }),
        setAccounts: (accounts) => set({ accounts }),
        setCurrentAccount: (currentAccount) => set({ currentAccount }),
        setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

        clearAuth: () => {
          removeStoredTokens();
          set({
            accounts: [],
            currentAccount: null,
            accessToken: null,
            refreshToken: null,
          });
        },
        switchAccount: (accountId) => {
          const currentAccounts = get().accounts;
          const targetAccount = currentAccounts.find((account) => account.id === accountId);
          if (targetAccount) {
            set({ currentAccount: targetAccount });
          }
        },

        setAuthData: (data) => {
          const { accounts, accessToken, refreshToken } = data;
          const currentAccount = accounts.length > 0 ? accounts[0] : null;

          setStoredTokens(accessToken, refreshToken);

          set({
            accounts,
            currentAccount,
            accessToken,
            refreshToken,
          });
        },

        // Computed getters
        getCurrentPersonalAccount: () => {
          const { accounts } = get();
          return accounts.find((account) => account.type === AccountType.Personal) || null;
        },

        getCurrentOrganizationAccount: () => {
          const { accounts } = get();
          return accounts.find((account) => account.type === AccountType.Organization) || null;
        },

        hasMultipleAccounts: () => {
          const { accounts } = get();
          return accounts.length > 1;
        },

        isAuthenticated: () => {
          const { accessToken, refreshToken } = get();
          return !!accessToken && !!refreshToken;
        },
      }),
      {
        name: 'auth-store',
        // Only persist auth-related data, not loading states
        partialize: (state) => ({
          accounts: state.accounts,
          currentAccount: state.currentAccount,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setLoading(false);
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
