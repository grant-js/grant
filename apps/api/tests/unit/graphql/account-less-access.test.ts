/**
 * A user who owns no account can sign in on a closed install (they are signed in
 * account-less), so every account-scoped GraphQL operation has to refuse them on the
 * server, not just hide the page. This walks the real `Query` and `Mutation` maps with
 * the real guards and a caller whose permission check denies everything -- which is what
 * `Grant.isAuthorized` returns for a user with no account, no organization membership
 * and no grants (see grant.account-less.test.ts) -- and requires that
 *
 *   - every operation outside the two explicit lists below is refused with
 *     `AuthorizationError` after asking `isAuthorized`, and never reaches a handler;
 *   - the lists themselves stay honest: a new operation that is neither guarded nor listed
 *     here fails this test, so a public or user-scoped field is added on purpose.
 */
import { Tenant, TokenType } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { AuthenticationError, AuthorizationError } from '@/lib/errors';

const { Query } = await import('@/graphql/resolvers/queries');
const { Mutation } = await import('@/graphql/resolvers/mutations');

type Resolver = (
  parent: unknown,
  args: unknown,
  context: unknown,
  info: unknown
) => Promise<unknown>;

function resolverOf(field: unknown): Resolver {
  if (typeof field === 'function') return field as Resolver;
  return (field as { resolve: Resolver }).resolve;
}

/** Operations that need no session at all. */
const PUBLIC_QUERIES = ['_empty', 'authSignupPolicy', 'invitation'];
const PUBLIC_MUTATIONS = [
  'login',
  'register',
  'refreshSession',
  'verifyEmail',
  'resendVerification',
  'requestPasswordReset',
  'resetPassword',
  'logoutMyUser',
  // Authorized by the invitation token, not by RBAC: the user is not a member yet.
  'acceptInvitation',
];

/**
 * Operations on the caller's own identity. They take the user id from the session and no
 * scope, which is why they keep working with zero accounts.
 */
const USER_SCOPED_QUERIES = [
  'isAuthorized',
  'me',
  'myUserAuthenticationMethods',
  'myMfaDevices',
  'myMfaRecoveryCodeStatus',
  'myUserDataExport',
  'myUserSessions',
  'myProjectMemberships',
  'myProjectMembership',
  'myNotifications',
  'myUnreadNotificationCount',
  'myNotificationPreferences',
];
const USER_SCOPED_MUTATIONS = [
  'setupMfa',
  'verifyMfa',
  'verifyMfaRecoveryCode',
  'revokeMyUserSession',
  'deleteMyAccounts',
  'createMySecondaryAccount',
  'changeMyPassword',
  'createMyUserAuthenticationMethod',
  'deleteMyUserAuthenticationMethod',
  'setMyPrimaryAuthenticationMethod',
  'createMyMfaEnrollment',
  'verifyMyMfaEnrollment',
  'setMyPrimaryMfaDevice',
  'removeMyMfaDevice',
  'generateMyMfaRecoveryCodes',
  'uploadMyUserPicture',
  'requestMyUserPictureUploadUrl',
  'confirmMyUserPictureUpload',
  'requestMyProjectMembershipPictureUploadUrl',
  'confirmMyProjectMembershipPictureUpload',
  'updateMyUser',
  'updateMyProjectMembership',
  'uploadMyProjectMembershipPicture',
  'markMyNotificationRead',
  'markAllMyNotificationsRead',
  'setMyNotificationPreference',
];

const operations = (map: object, kind: 'query' | 'mutation') =>
  Object.keys(map).map((name) => ({ kind, name, field: (map as Record<string, unknown>)[name] }));

const queries = operations(Query, 'query');
const mutations = operations(Mutation, 'mutation');
const scopedOperations = [
  ...queries.filter((o) => ![...PUBLIC_QUERIES, ...USER_SCOPED_QUERIES].includes(o.name)),
  ...mutations.filter((o) => ![...PUBLIC_MUTATIONS, ...USER_SCOPED_MUTATIONS].includes(o.name)),
];

const SCOPES = [
  { tenant: Tenant.Account, id: 'foreign-account' },
  { tenant: Tenant.AccountProject, id: 'foreign-account:foreign-project' },
  { tenant: Tenant.Organization, id: 'foreign-organization' },
  { tenant: Tenant.OrganizationProject, id: 'foreign-organization:foreign-project' },
];

/** Any handler other than the permission check being touched is a leak. */
function createContext(scope: (typeof SCOPES)[number], touched: string[]) {
  const isAuthorized = vi.fn().mockResolvedValue({ authorized: false, reason: 'NO_MATCHING' });
  const known: Record<string, unknown> = {
    auth: { isAuthorized, isPersonalScope: vi.fn().mockResolvedValue(false) },
    me: { hasActiveMfaEnrollmentForUser: vi.fn().mockResolvedValue(false) },
    organizations: { getOrganizations: vi.fn().mockResolvedValue({ organizations: [] }) },
  };
  const handlers = new Proxy(known, {
    get(target, property: string) {
      if (property in target) return target[property];
      touched.push(property);
      throw new Error(`handler "${property}" reached by a user with no account`);
    },
  });
  const resourceResolvers = new Proxy(
    {},
    { get: () => async () => ({ id: 'foreign-resource', scope }) }
  );
  const user = {
    userId: 'account-less-user',
    type: TokenType.Session,
    scope,
    isVerified: true,
    mfaVerified: true,
    tokenId: 'token-1',
    expiresAt: Math.floor(Date.now() / 1000) + 600,
  };
  return { context: { user, handlers, resourceResolvers }, isAuthorized };
}

function argsFor(scope: (typeof SCOPES)[number]) {
  return { scope, ids: ['foreign-id'], id: 'foreign-id', input: { scope, id: 'foreign-id' } };
}

describe('the operation lists match the schema', () => {
  it.each([
    ['queries', PUBLIC_QUERIES, USER_SCOPED_QUERIES, queries],
    ['mutations', PUBLIC_MUTATIONS, USER_SCOPED_MUTATIONS, mutations],
  ] as const)('every listed %s operation exists', (_kind, publicOps, userOps, all) => {
    const names = all.map((o) => o.name);
    for (const name of [...publicOps, ...userOps]) {
      expect(names, `${name} is listed but not defined`).toContain(name);
    }
  });

  it('has scoped operations to check', () => {
    expect(scopedOperations.length).toBeGreaterThan(80);
  });
});

describe.each(SCOPES)('a user with no account naming a foreign $tenant scope', (scope) => {
  it.each(scopedOperations.map((o) => [`${o.kind} ${o.name}`, o.field] as const))(
    'is refused by %s before any handler runs',
    async (_label, field) => {
      const touched: string[] = [];
      const { context, isAuthorized } = createContext(scope, touched);

      await expect(
        resolverOf(field)(undefined, argsFor(scope), context, {})
      ).rejects.toBeInstanceOf(AuthorizationError);

      expect(isAuthorized).toHaveBeenCalled();
      expect(touched).toEqual([]);
    }
  );
});

describe('without a session', () => {
  it.each(
    [...queries, ...mutations]
      .filter((o) => ![...PUBLIC_QUERIES, ...PUBLIC_MUTATIONS].includes(o.name))
      .map((o) => [`${o.kind} ${o.name}`, o.field] as const)
  )('%s refuses an unauthenticated caller', async (_label, field) => {
    const touched: string[] = [];
    const { context } = createContext(SCOPES[0], touched);

    await expect(
      resolverOf(field)(undefined, argsFor(SCOPES[0]), { ...context, user: null }, {})
    ).rejects.toBeInstanceOf(AuthenticationError);

    expect(touched).toEqual([]);
  });
});
