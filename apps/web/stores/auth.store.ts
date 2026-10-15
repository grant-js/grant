import { Account, AccountType } from '@grantjs/schema';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

/** Used for devtools display name. */
const AUTH_STORE_STORAGE_KEY = 'grant-auth-store';

/** Storage key for persisted currentAccountId only (last workspace). */
const AUTH_PREFERENCES_STORAGE_KEY = 'grant-auth-preferences';

interface AuthState {
  // Authentication state
  loading: boolean;

  // Account state
  accounts: Account[];
  /**
   * True once `accounts` reflects the server (a login response or `me`), as opposed to the
   * initial empty list. "Signed in with no accounts" is only a fact once this is set.
   */
  accountsLoaded: boolean;
  currentAccountId: string | null;
  isSwitchingAccounts: boolean;
  accessToken: string | null;
  /**
   * Bumped by every accessToken-affecting action (setAccessToken, clearAuth,
   * setAuthData). Lets an async caller that started before some of those
   * actions detect, when it resolves, whether another action already
   * superseded it — a boolean "authenticated?" check can't: a token can be
   * replaced by a different one without the boolean ever changing.
   */
  tokenVersion: number;

  // Email verification state
  email: string | null;
  mfaVerified: boolean;
  requiresEmailVerification: boolean;
  verificationExpiry: Date | null;

  // Actions
  setLoading: (loading: boolean) => void;
  setAccounts: (accounts: Account[]) => void;
  setCurrentAccount: (accountId: string | null) => void;
  setSwitchingAccounts: (value: boolean) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  switchAccount: (accountId: string) => void;
  updateAccounts: (accounts: Account[], accountId?: string) => void;
  syncFromMe: (data: {
    accounts: Account[];
    /**
     * Whether `accounts` came from a `me` response (default true). False while `me` is loading
     * or failed: then `accounts` says nothing and the known list is left as it is.
     */
    accountsLoaded?: boolean;
    email: string | null;
    mfaVerified: boolean;
    requiresEmailVerification: boolean;
    verificationExpiry: Date | null;
  }) => void;
  setAuthData: (data: {
    accounts: Account[];
    accessToken: string;
    email?: string | null;
    mfaVerified?: boolean;
    requiresEmailVerification?: boolean;
    verificationExpiry?: Date | null;
  }) => void;

  // Computed
  isAuthenticated: () => boolean;
  getCurrentAccount: () => Account | null;
  getCurrentPersonalAccount: () => Account | null;
  getCurrentOrganizationAccount: () => Account | null;
  hasMultipleAccounts: () => boolean;
  setEmail: (email: string | null) => void;
  setMfaVerified: (mfaVerified: boolean) => void;
  setRequiresEmailVerification: (requiresEmailVerification: boolean) => void;
  setVerificationExpiry: (verificationExpiry: Date | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // In-memory state (tokens, accounts, etc.); only currentAccountId is persisted via partialize
        loading: false,

        // Account state
        accounts: [],
        accountsLoaded: false,
        currentAccountId: null,
        isSwitchingAccounts: false,
        accessToken: null,
        tokenVersion: 0,

        // Email verification state
        email: null,
        mfaVerified: false,
        requiresEmailVerification: false,
        verificationExpiry: null,

        // Actions
        setLoading: (loading) => set({ loading }),
        setAccounts: (accounts) => set({ accounts, accountsLoaded: true }),
        setCurrentAccount: (accountId) => set({ currentAccountId: accountId }),
        setSwitchingAccounts: (value) => set({ isSwitchingAccounts: value }),
        setAccessToken: (accessToken) => {
          set((state) => ({ accessToken, tokenVersion: state.tokenVersion + 1 }));
        },

        clearAuth: () => {
          set((state) => ({
            accounts: [],
            accountsLoaded: false,
            currentAccountId: null,
            isSwitchingAccounts: false,
            accessToken: null,
            email: null,
            mfaVerified: false,
            requiresEmailVerification: false,
            verificationExpiry: null,
            tokenVersion: state.tokenVersion + 1,
          }));
        },
        switchAccount: (accountId) => {
          const state = get();
          const currentAccounts = state.accounts;
          const targetAccount = currentAccounts.find((account) => account.id === accountId);
          if (targetAccount) {
            set({ currentAccountId: accountId });
          }
        },

        updateAccounts: (accounts: Account[]) => {
          set({ accounts, accountsLoaded: true });
        },

        syncFromMe: (data) => {
          const {
            accounts,
            accountsLoaded,
            email,
            mfaVerified,
            requiresEmailVerification,
            verificationExpiry,
          } = data;
          const accountsKnown = accountsLoaded !== false;
          set((state) => ({
            accounts: accountsKnown ? accounts : state.accounts,
            accountsLoaded: accountsKnown ? true : state.accountsLoaded,
            email,
            mfaVerified,
            requiresEmailVerification,
            verificationExpiry,
          }));
          // currentAccountId is persisted; useAccountsSync only ensures a valid one when accounts load.
        },

        setAuthData: (data) => {
          const {
            accounts,
            accessToken,
            email,
            mfaVerified,
            requiresEmailVerification,
            verificationExpiry,
          } = data;

          const currentAccountId = get().currentAccountId;
          const targetAccountId =
            currentAccountId && accounts.some((account) => account.id === currentAccountId)
              ? currentAccountId
              : accounts.find((account) => account.type === AccountType.Organization)?.id ||
                accounts[0]?.id ||
                null;

          set((state) => ({
            accounts,
            accountsLoaded: true,
            currentAccountId: targetAccountId,
            accessToken,
            email: email ?? null,
            mfaVerified: mfaVerified ?? false,
            requiresEmailVerification: requiresEmailVerification ?? false,
            verificationExpiry: verificationExpiry ?? null,
            tokenVersion: state.tokenVersion + 1,
          }));
        },

        getCurrentAccount: () => {
          const { accounts, currentAccountId } = get();
          if (!currentAccountId) {
            return null;
          }
          return accounts.find((account) => account.id === currentAccountId) || null;
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

        setEmail: (email: string | null) => {
          set({ email });
        },
        setMfaVerified: (mfaVerified: boolean) => {
          set({ mfaVerified });
        },
        setRequiresEmailVerification: (requiresEmailVerification: boolean) => {
          set({ requiresEmailVerification });
        },
        setVerificationExpiry: (verificationExpiry: Date | null) => {
          set({ verificationExpiry });
        },

        isAuthenticated: () => {
          const { accessToken } = get();
          return !!accessToken;
        },
      }),
      {
        name: AUTH_PREFERENCES_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentAccountId: state.currentAccountId }),
      }
    ),
    { name: AUTH_STORE_STORAGE_KEY }
  )
);
