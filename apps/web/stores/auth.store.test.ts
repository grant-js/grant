import { AccountType } from '@grantjs/schema';
import { beforeEach, describe, expect, it } from 'vitest';

import { isAccountlessState } from '@/lib/accountless';

import { useAuthStore } from './auth.store';

const account = { id: 'a1', type: AccountType.Personal } as never;

const me = {
  email: 'imported@example.com',
  mfaVerified: false,
  requiresEmailVerification: false,
  verificationExpiry: null,
};

const isAccountless = () => isAccountlessState(useAuthStore.getState());

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

describe('accountsLoaded', () => {
  it('starts unknown, so an empty list does not read as "no account"', () => {
    useAuthStore.getState().setAccessToken('token');

    expect(useAuthStore.getState().accountsLoaded).toBe(false);
    expect(isAccountless()).toBe(false);
  });

  it('a login with no accounts is an account-less session', () => {
    useAuthStore.getState().setAuthData({ accounts: [], accessToken: 'token' });

    expect(useAuthStore.getState().accountsLoaded).toBe(true);
    expect(useAuthStore.getState().currentAccountId).toBeNull();
    expect(isAccountless()).toBe(true);
  });

  it('a login with an account is not', () => {
    useAuthStore.getState().setAuthData({ accounts: [account], accessToken: 'token' });

    expect(isAccountless()).toBe(false);
  });

  it('syncFromMe with a me response makes the answer known', () => {
    useAuthStore.getState().setAccessToken('token');
    useAuthStore.getState().syncFromMe({ accounts: [], accountsLoaded: true, ...me });

    expect(isAccountless()).toBe(true);
  });

  it('syncFromMe without a me response (loading or failed) does not make it known', () => {
    useAuthStore.getState().setAccessToken('token');
    useAuthStore.getState().syncFromMe({ accounts: [], accountsLoaded: false, ...me });

    expect(isAccountless()).toBe(false);
  });

  it('a failed me does not turn a user with an account into an account-less one', () => {
    useAuthStore.getState().setAuthData({ accounts: [account], accessToken: 'token' });
    useAuthStore.getState().syncFromMe({ accounts: [], accountsLoaded: false, ...me });

    expect(useAuthStore.getState().accounts).toEqual([account]);
    expect(isAccountless()).toBe(false);
  });

  it('a failed me does not un-know an account-less session either', () => {
    useAuthStore.getState().setAuthData({ accounts: [], accessToken: 'token' });
    useAuthStore.getState().syncFromMe({ accounts: [], accountsLoaded: false, ...me });

    expect(isAccountless()).toBe(true);
  });

  it('accepting an invitation gives the user an account', () => {
    useAuthStore.getState().setAuthData({ accounts: [], accessToken: 'token' });
    useAuthStore.getState().updateAccounts([account]);

    expect(isAccountless()).toBe(false);
  });

  it('logging out forgets it', () => {
    useAuthStore.getState().setAuthData({ accounts: [], accessToken: 'token' });
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().accountsLoaded).toBe(false);
    expect(isAccountless()).toBe(false);
  });
});
