import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { persist } from 'zustand/middleware';

import { Account, AccountType } from '@/graphql/generated/types';

interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  loading: boolean;

  // Account state
  accounts: Account[];
  currentAccount: Account | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  setAuthentication: (isAuthenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setAccounts: (accounts: Account[]) => void;
  setCurrentAccount: (account: Account | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  switchAccount: (accountId: string) => void;
  setAuthData: (data: { accounts: Account[]; accessToken: string; refreshToken: string }) => void;

  // Computed
  getCurrentPersonalAccount: () => Account | null;
  getCurrentOrganizationAccount: () => Account | null;
  hasMultipleAccounts: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isAuthenticated: false,
        loading: false,

        // Account state
        accounts: [],
        currentAccount: null,
        accessToken: null,
        refreshToken: null,

        // Actions
        setAuthentication: (isAuthenticated) => set({ isAuthenticated }),
        setLoading: (loading) => set({ loading }),
        setAccounts: (accounts) => set({ accounts }),
        setCurrentAccount: (currentAccount) => set({ currentAccount }),
        setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

        clearAuth: () =>
          set({
            isAuthenticated: false,
            accounts: [],
            currentAccount: null,
            accessToken: null,
            refreshToken: null,
          }),

        switchAccount: (accountId) => {
          const currentAccounts = get().accounts;
          const targetAccount = currentAccounts.find((account) => account.id === accountId);
          if (targetAccount) {
            set({ currentAccount: targetAccount });
          }
        },

        setAuthData: (data) => {
          const { accounts, accessToken, refreshToken } = data;
          // Auto-select the first account as current
          const currentAccount = accounts.length > 0 ? accounts[0] : null;

          set({
            isAuthenticated: true,
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
      }),
      {
        name: 'auth-store',
        // Only persist auth-related data, not loading states
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          accounts: state.accounts,
          currentAccount: state.currentAccount,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
