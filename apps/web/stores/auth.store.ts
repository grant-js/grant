import { Account, AccountType } from '@logusgraphics/grant-schema';
import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { removeStoredTokens, setStoredTokens } from '@/lib/auth';

interface JWTPayload {
  sub: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

interface AuthState {
  // Authentication state
  loading: boolean;

  // Account state
  accounts: Account[];
  currentAccount: Account | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Email verification state
  email: string | null;
  requiresEmailVerification: boolean;
  verificationExpiry: Date | null;

  // Actions
  setLoading: (loading: boolean) => void;
  setAccounts: (accounts: Account[]) => void;
  setCurrentAccount: (account: Account | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  switchAccount: (accountId: string) => void;
  updateAccountsAndSwitch: (accounts: Account[], accountId?: string) => void;
  setAuthData: (data: {
    accounts: Account[];
    accessToken: string;
    refreshToken: string;
    email?: string | null;
    requiresEmailVerification?: boolean;
    verificationExpiry?: Date | null;
  }) => void;

  // Computed
  isAuthenticated: () => boolean;
  getCurrentUserId: () => string | null;
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

        // Email verification state
        email: null,
        requiresEmailVerification: false,
        verificationExpiry: null,

        // Actions
        setLoading: (loading) => set({ loading }),
        setAccounts: (accounts) => set({ accounts }),
        setCurrentAccount: (currentAccount) => set({ currentAccount }),
        setTokens: (accessToken, refreshToken) => {
          setStoredTokens(accessToken, refreshToken);
          set({ accessToken, refreshToken });
        },

        clearAuth: () => {
          removeStoredTokens();
          set({
            accounts: [],
            currentAccount: null,
            accessToken: null,
            refreshToken: null,
            email: null,
            requiresEmailVerification: false,
            verificationExpiry: null,
          });
        },
        switchAccount: (accountId) => {
          const currentAccounts = get().accounts;
          const targetAccount = currentAccounts.find((account) => account.id === accountId);
          if (targetAccount) {
            set({ currentAccount: targetAccount });
          }
        },

        updateAccountsAndSwitch: (accounts: Account[], accountId?: string) => {
          const targetAccount = accountId
            ? accounts.find((account) => account.id === accountId)
            : accounts.find((account) => account.type === AccountType.Organization) || accounts[0];

          set({
            accounts,
            currentAccount: targetAccount || null,
          });
        },

        setAuthData: (data) => {
          const {
            accounts,
            accessToken,
            refreshToken,
            email,
            requiresEmailVerification,
            verificationExpiry,
          } = data;
          const currentAccount = accounts.length > 0 ? accounts[0] : null;

          setStoredTokens(accessToken, refreshToken);

          set({
            accounts,
            currentAccount,
            accessToken,
            refreshToken,
            email: email ?? null,
            requiresEmailVerification: requiresEmailVerification ?? false,
            verificationExpiry: verificationExpiry ?? null,
          });
        },

        // Computed getters
        getCurrentUserId: () => {
          try {
            const { accessToken } = get();
            if (!accessToken) {
              return null;
            }
            const decoded = jwtDecode<JWTPayload>(accessToken);
            return decoded.sub || null;
          } catch {
            return null;
          }
        },

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
          email: state.email,
          requiresEmailVerification: state.requiresEmailVerification,
          verificationExpiry: state.verificationExpiry,
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
