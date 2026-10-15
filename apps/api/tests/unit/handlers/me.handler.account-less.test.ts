/**
 * An authenticated user who owns no account (a CDM import or project-app user on a closed
 * install, signed in account-less). The user-scoped `me` operations keep working for them;
 * creating an account is a self-signup and follows the register policy.
 */
import { AccountType } from '@grantjs/schema';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { PUBLIC_SIGNUP_DISABLED_REASON } from '@/lib/signup-policy.lib';

const { MeHandler } = await import('@/handlers/me.handler');
const { config } = await import('@/config');

const mockAuthCfg = config.auth as { publicSignupEnabled: boolean };
const originalPublicSignup = mockAuthCfg.publicSignupEnabled;

afterAll(() => {
  mockAuthCfg.publicSignupEnabled = originalPublicSignup;
});

const USER_ID = '30000000-0000-4000-8000-000000000099';
const tx = {};
const now = new Date('2026-10-15T12:00:00.000Z');

const me = { createMySecondaryAccount: vi.fn(), getMe: vi.fn() };
const accountRoles = { seedAccountRoles: vi.fn() };
const userRoles = { getUserRoles: vi.fn(), addUserRole: vi.fn() };
const accounts = {
  getOwnerAccounts: vi.fn(),
  getAccountsByOwnerId: vi.fn(),
  deleteAccount: vi.fn(),
};
const users = { getUsers: vi.fn(), countHumanUsers: vi.fn(), deleteOwnUser: vi.fn() };
const userAuthenticationMethods = { getUserAuthenticationMethods: vi.fn() };
const userSessions = { getUserSessions: vi.fn() };
const organizationUsers = { getUserOrganizationMemberships: vi.fn() };
const projectUsers = { getUserProjectMemberships: vi.fn() };

function createHandler() {
  return new MeHandler(
    me as never,
    accountRoles as never,
    userRoles as never,
    accounts as never,
    users as never,
    userAuthenticationMethods as never,
    {} as never,
    userSessions as never,
    {} as never,
    {} as never,
    organizationUsers as never,
    projectUsers as never,
    { getAuth: () => ({ userId: USER_ID }) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { withTransaction: (fn: (t: unknown) => Promise<unknown>) => fn(tx) } as never
  );
}

const PERSONAL = { id: 'account-1', type: AccountType.Personal, ownerId: USER_ID };
const ORGANIZATION = { id: 'account-2', type: AccountType.Organization, ownerId: USER_ID };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthCfg.publicSignupEnabled = false;
  users.countHumanUsers.mockResolvedValue(2500);
  accounts.getOwnerAccounts.mockResolvedValue([]);
  me.createMySecondaryAccount.mockResolvedValue({
    account: ORGANIZATION,
    accounts: [PERSONAL, ORGANIZATION],
  });
  accountRoles.seedAccountRoles.mockResolvedValue([]);
  organizationUsers.getUserOrganizationMemberships.mockResolvedValue([]);
});

describe('getMe', () => {
  const base = {
    accounts: [],
    email: 'imported@example.com',
    requiresEmailVerification: false,
    verificationExpiry: null,
  };

  it('says whether the user belongs to an organization, which an account-less console needs', async () => {
    me.getMe.mockResolvedValue(base);

    await expect(createHandler().getMe()).resolves.toEqual({
      ...base,
      hasOrganizationMembership: false,
    });

    organizationUsers.getUserOrganizationMemberships.mockResolvedValue([
      { organizationId: 'org-1', organizationName: 'Acme', role: 'Member', joinedAt: now },
    ]);

    await expect(createHandler().getMe()).resolves.toEqual({
      ...base,
      hasOrganizationMembership: true,
    });
  });
});

describe('createMySecondaryAccount', () => {
  it('refuses an account-less user on a closed install', async () => {
    try {
      await createHandler().createMySecondaryAccount();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).reason).toBe(PUBLIC_SIGNUP_DISABLED_REASON);
    }

    expect(me.createMySecondaryAccount).not.toHaveBeenCalled();
    expect(accountRoles.seedAccountRoles).not.toHaveBeenCalled();
  });

  it('allows an organization member with no account on a closed install', async () => {
    organizationUsers.getUserOrganizationMemberships.mockResolvedValue([
      { organizationId: 'org-1', organizationName: 'Acme', role: 'Member', joinedAt: now },
    ]);

    await expect(createHandler().createMySecondaryAccount()).resolves.toBeDefined();
    expect(me.createMySecondaryAccount).toHaveBeenCalledTimes(1);
  });

  it('allows the first human of a closed install (bootstrap)', async () => {
    users.countHumanUsers.mockResolvedValue(0);

    await expect(createHandler().createMySecondaryAccount()).resolves.toBeDefined();
    expect(me.createMySecondaryAccount).toHaveBeenCalledTimes(1);
  });

  it('allows an account-less user when public sign-up is on', async () => {
    mockAuthCfg.publicSignupEnabled = true;

    await expect(createHandler().createMySecondaryAccount()).resolves.toBeDefined();
    expect(users.countHumanUsers).not.toHaveBeenCalled();
    expect(me.createMySecondaryAccount).toHaveBeenCalledTimes(1);
  });

  it('allows a user who already has an account to add the complementary one on a closed install', async () => {
    accounts.getOwnerAccounts.mockResolvedValue([PERSONAL]);

    const result = await createHandler().createMySecondaryAccount();

    expect(users.countHumanUsers).not.toHaveBeenCalled();
    expect(me.createMySecondaryAccount).toHaveBeenCalledTimes(1);
    expect(result.account).toEqual(ORGANIZATION);
  });
});

describe('privacy operations without an account', () => {
  it('exports the user data with empty account and membership lists', async () => {
    users.getUsers.mockResolvedValue({
      users: [{ id: USER_ID, name: 'Imported', createdAt: now, updatedAt: now }],
    });
    userAuthenticationMethods.getUserAuthenticationMethods.mockResolvedValue([
      {
        provider: 'email',
        providerId: 'imported@example.com',
        isVerified: true,
        isPrimary: true,
        lastUsedAt: null,
        createdAt: now,
      },
    ]);
    accounts.getAccountsByOwnerId.mockResolvedValue([]);
    userSessions.getUserSessions.mockResolvedValue({ userSessions: [] });
    organizationUsers.getUserOrganizationMemberships.mockResolvedValue([]);
    projectUsers.getUserProjectMemberships.mockResolvedValue([
      { projectId: 'project-1', projectName: 'Shop', role: null, joinedAt: now },
    ]);

    const { data, filename } = await createHandler().myUserDataExport();

    expect(data.user.id).toBe(USER_ID);
    expect(data.accounts).toEqual([]);
    expect(data.organizationMemberships).toEqual([]);
    expect(data.projectMemberships).toEqual([
      { projectId: 'project-1', projectName: 'Shop', role: 'Member', joinedAt: now },
    ]);
    expect(filename).toContain(USER_ID);
  });

  it('deletes the identity when there is no account to delete', async () => {
    const deletedUser = { id: USER_ID, name: 'Imported' };
    users.deleteOwnUser.mockResolvedValue(deletedUser);

    const result = await createHandler().deleteMyAccounts({ hardDelete: false });

    expect(result).toBe(deletedUser);
    expect(accounts.deleteAccount).not.toHaveBeenCalled();
    expect(users.deleteOwnUser).toHaveBeenCalledWith({ hardDelete: false }, tx);
  });
});
