import { type Resolver, Tenant, TokenType } from '@grantjs/schema';
import type { GraphQLResolveInfo } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GraphqlContext } from '@/graphql/types';
import * as authGuard from '@/lib/authorization/auth-guard';
import { requireMfaGraphQL } from '@/lib/authorization/mfa-graphql-guard';
import { requireMfaRest } from '@/lib/authorization/mfa-rest-guard';
import { AuthenticationError } from '@/lib/errors/error-classes';
import type { ContextRequest } from '@/types';

const orgProjectScope = { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' };

function graphqlUser(
  overrides: Partial<{
    type: TokenType;
    mfaVerified: boolean;
    scope: { tenant: Tenant; id: string };
  }> = {}
): GraphqlContext['user'] {
  return {
    type: TokenType.Session,
    userId: 'u1',
    tokenId: 's1',
    expiresAt: Date.now() + 60_000,
    mfaVerified: false,
    scope: orgProjectScope,
    ...overrides,
  } as GraphqlContext['user'];
}

function createGraphqlHandlers(
  overrides: {
    orgRequiresMfa?: boolean;
    userEnrolled?: boolean;
    isPersonal?: boolean;
  } = {}
) {
  const orgRequiresMfa = overrides.orgRequiresMfa ?? false;
  const userEnrolled = overrides.userEnrolled ?? false;
  const isPersonal = overrides.isPersonal ?? false;
  return {
    organizations: {
      getOrganizations: vi.fn().mockResolvedValue({
        organizations: [{ requireMfaForSensitiveActions: orgRequiresMfa }],
      }),
    },
    me: {
      hasActiveMfaEnrollmentForUser: vi.fn().mockResolvedValue(userEnrolled),
    },
    auth: {
      isPersonalScope: vi.fn().mockResolvedValue(isPersonal),
    },
  } as unknown as GraphqlContext['handlers'];
}

function minimalInfo(): GraphQLResolveInfo {
  return {} as GraphQLResolveInfo;
}

function callGuardedResolver<TResult>(
  wrapped: Resolver<TResult, Record<PropertyKey, never>, GraphqlContext, unknown>,
  parent: Record<PropertyKey, never>,
  args: unknown,
  ctx: GraphqlContext,
  info: GraphQLResolveInfo
): Promise<TResult> {
  const result =
    typeof wrapped === 'function'
      ? wrapped(parent, args, ctx, info)
      : wrapped.resolve(parent, args, ctx, info);
  return Promise.resolve(result);
}

describe('requireMfaGraphQL', () => {
  beforeEach(() => {
    vi.spyOn(authGuard, 'isAuthenticatedGraphQL').mockReturnValue(true);
  });

  it('throws AuthenticationError when not authenticated', async () => {
    vi.spyOn(authGuard, 'isAuthenticatedGraphQL').mockReturnValue(false);
    const inner = vi.fn();
    const wrapped = requireMfaGraphQL({}, inner);
    await expect(
      callGuardedResolver(
        wrapped,
        {},
        { input: { scope: orgProjectScope } },
        { user: null } as GraphqlContext,
        minimalInfo()
      )
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(inner).not.toHaveBeenCalled();
  });

  it('bypasses for ApiKey', async () => {
    const inner = vi.fn().mockResolvedValue('ok');
    const wrapped = requireMfaGraphQL({}, inner);
    const ctx = {
      user: graphqlUser({ type: TokenType.ApiKey, scope: orgProjectScope }),
      handlers: createGraphqlHandlers({ orgRequiresMfa: true, userEnrolled: true }),
    } as GraphqlContext;
    await expect(
      callGuardedResolver(wrapped, {}, { input: { scope: orgProjectScope } }, ctx, minimalInfo())
    ).resolves.toBe('ok');
    expect(inner).toHaveBeenCalled();
  });

  it('bypasses for ProjectApp', async () => {
    const inner = vi.fn().mockResolvedValue('ok');
    const wrapped = requireMfaGraphQL({}, inner);
    const ctx = {
      user: graphqlUser({ type: TokenType.ProjectApp, scope: orgProjectScope }),
      handlers: createGraphqlHandlers({ orgRequiresMfa: true, userEnrolled: true }),
    } as GraphqlContext;
    await expect(
      callGuardedResolver(wrapped, {}, { input: { scope: orgProjectScope } }, ctx, minimalInfo())
    ).resolves.toBe('ok');
  });

  it('continues when no scope on user or args', async () => {
    const inner = vi.fn().mockResolvedValue('ok');
    const wrapped = requireMfaGraphQL({}, inner);
    const ctx = {
      user: graphqlUser({ scope: undefined }),
      handlers: createGraphqlHandlers(),
    } as GraphqlContext;
    await expect(callGuardedResolver(wrapped, {}, {}, ctx, minimalInfo())).resolves.toBe('ok');
  });

  it('continues for non-organization tenant scope', async () => {
    const inner = vi.fn().mockResolvedValue('ok');
    const wrapped = requireMfaGraphQL({}, inner);
    const accountScope = { tenant: Tenant.Account, id: 'acc-1' };
    const ctx = {
      user: graphqlUser({ scope: accountScope }),
      handlers: createGraphqlHandlers({ orgRequiresMfa: true, userEnrolled: true }),
    } as GraphqlContext;
    await expect(callGuardedResolver(wrapped, {}, {}, ctx, minimalInfo())).resolves.toBe('ok');
  });

  it('continues when allowPersonalContext and scope is personal', async () => {
    const inner = vi.fn().mockResolvedValue('ok');
    const wrapped = requireMfaGraphQL({ allowPersonalContext: true }, inner);
    const ctx = {
      user: graphqlUser(),
      handlers: createGraphqlHandlers({ isPersonal: true }),
    } as GraphqlContext;
    await expect(
      callGuardedResolver(wrapped, {}, { input: { scope: orgProjectScope } }, ctx, minimalInfo())
    ).resolves.toBe('ok');
  });

  it('throws MFA_REQUIRED when org requires MFA and session not verified', async () => {
    const inner = vi.fn();
    const wrapped = requireMfaGraphQL({}, inner);
    const ctx = {
      user: graphqlUser(),
      handlers: createGraphqlHandlers({ orgRequiresMfa: true, userEnrolled: false }),
    } as GraphqlContext;
    await expect(
      callGuardedResolver(wrapped, {}, { input: { scope: orgProjectScope } }, ctx, minimalInfo())
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      reason: 'MFA_REQUIRED',
      metadata: { hasActiveEnrollment: false },
      originalError: undefined,
    });
    expect(inner).not.toHaveBeenCalled();
  });

  it('throws MFA_REQUIRED when user enrolled and not mfaVerified', async () => {
    const inner = vi.fn();
    const wrapped = requireMfaGraphQL({}, inner);
    const ctx = {
      user: graphqlUser(),
      handlers: createGraphqlHandlers({ orgRequiresMfa: false, userEnrolled: true }),
    } as GraphqlContext;
    await expect(
      callGuardedResolver(wrapped, {}, { input: { scope: orgProjectScope } }, ctx, minimalInfo())
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      reason: 'MFA_REQUIRED',
      metadata: { hasActiveEnrollment: true },
      originalError: undefined,
    });
  });

  it('runs resolver when mfaVerified', async () => {
    const inner = vi.fn().mockResolvedValue('ok');
    const wrapped = requireMfaGraphQL({}, inner);
    const ctx = {
      user: graphqlUser({ mfaVerified: true }),
      handlers: createGraphqlHandlers({ orgRequiresMfa: true, userEnrolled: true }),
    } as GraphqlContext;
    await expect(
      callGuardedResolver(wrapped, {}, { input: { scope: orgProjectScope } }, ctx, minimalInfo())
    ).resolves.toBe('ok');
  });

  it('uses scope from args.input.scope when user.scope missing', async () => {
    const inner = vi.fn().mockResolvedValue('ok');
    const wrapped = requireMfaGraphQL({}, inner);
    const ctx = {
      user: graphqlUser({ scope: undefined }),
      handlers: createGraphqlHandlers({
        orgRequiresMfa: true,
        userEnrolled: true,
        isPersonal: false,
      }),
    } as GraphqlContext;
    await expect(
      callGuardedResolver(wrapped, {}, { input: { scope: orgProjectScope } }, ctx, minimalInfo())
    ).rejects.toMatchObject({ reason: 'MFA_REQUIRED' });
  });
});

describe('requireMfaRest', () => {
  const next = vi.fn();
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });

  beforeEach(() => {
    vi.clearAllMocks();
    json.mockReturnValue(undefined);
    status.mockReturnValue({ json });
  });

  function reqWithContext(user: unknown, h: unknown): ContextRequest {
    return {
      headers: {},
      query: {},
      body: {},
      context: { user, handlers: h },
    } as ContextRequest;
  }

  const restHandlers = createGraphqlHandlers;

  it('returns 401 when no user', async () => {
    const middleware = requireMfaRest();
    const req = {
      headers: {},
      query: {},
      body: {},
      context: { user: null, handlers: restHandlers() },
    } as ContextRequest;
    await middleware(req as never, { status } as never, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for ApiKey', async () => {
    const middleware = requireMfaRest();
    const h = restHandlers({ orgRequiresMfa: true, userEnrolled: true });
    const req = reqWithContext(graphqlUser({ type: TokenType.ApiKey }) as never, h as never);
    await middleware(req as never, { status } as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next when no scope', async () => {
    const middleware = requireMfaRest();
    const h = restHandlers();
    const req = reqWithContext(graphqlUser({ scope: undefined }) as never, h as never);
    await middleware(req as never, { status } as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 MFA_REQUIRED when org requires MFA', async () => {
    const middleware = requireMfaRest();
    const h = restHandlers({ orgRequiresMfa: true, userEnrolled: false });
    const req = reqWithContext(graphqlUser() as never, h as never);
    await middleware(req as never, { status } as never, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MFA_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when mfaVerified', async () => {
    const middleware = requireMfaRest();
    const h = restHandlers({ orgRequiresMfa: true, userEnrolled: true });
    const req = reqWithContext(graphqlUser({ mfaVerified: true }) as never, h as never);
    await middleware(req as never, { status } as never, next);
    expect(next).toHaveBeenCalled();
  });
});
