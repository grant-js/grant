import { describe, expect, it } from 'vitest';

import { ACCOUNTLESS_HOME, isAccountlessAllowedPath, isAccountlessState } from './accountless';

describe('isAccountlessState', () => {
  const account = { id: 'a1' };

  it('is true for a signed-in user the server confirmed owns no account', () => {
    expect(isAccountlessState({ accessToken: 't', accountsLoaded: true, accounts: [] })).toBe(true);
  });

  it('is false before the server has answered: an empty list is not yet a fact', () => {
    expect(isAccountlessState({ accessToken: 't', accountsLoaded: false, accounts: [] })).toBe(
      false
    );
  });

  it('is false for a user with an account', () => {
    expect(
      isAccountlessState({ accessToken: 't', accountsLoaded: true, accounts: [account] })
    ).toBe(false);
  });

  it('is false when nobody is signed in', () => {
    expect(isAccountlessState({ accessToken: null, accountsLoaded: true, accounts: [] })).toBe(
      false
    );
  });
});

describe('isAccountlessAllowedPath', () => {
  it('lands on the project memberships settings page', () => {
    expect(ACCOUNTLESS_HOME).toBe('/dashboard/settings/projects');
    expect(isAccountlessAllowedPath(ACCOUNTLESS_HOME)).toBe(true);
  });

  it.each([
    '/dashboard/settings',
    '/dashboard/settings/',
    '/dashboard/settings/profile',
    '/dashboard/settings/security',
    '/dashboard/settings/preferences',
    '/dashboard/settings/notifications',
    '/dashboard/settings/privacy',
    '/dashboard/settings/projects/p-1',
    '/dashboard/notifications',
  ])('allows the user-scoped page %s', (path) => {
    expect(isAccountlessAllowedPath(path)).toBe(true);
  });

  it.each([
    '/dashboard',
    '/dashboard/',
    '/dashboard/account',
    '/dashboard/settings/account',
    '/dashboard/settings/account/',
    '/dashboard/organizations',
    '/dashboard/organizations/o-1/projects',
    '/dashboard/accounts/a-1',
    '/dashboard/accounts/a-1/projects/p-1/users',
    '/dashboard/settingsx',
  ])('redirects away from the account-scoped page %s', (path) => {
    expect(isAccountlessAllowedPath(path)).toBe(false);
  });
});
