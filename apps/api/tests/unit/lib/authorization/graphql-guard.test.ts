/**
 * `authorizeGraphQLResolver` authorizes against `context.user.scope`; the resolver acts on the
 * scope in its own arguments. The guard refuses an operation whose arguments name another scope,
 * before it looks anything up and before it evaluates a permission.
 *
 * The arguments are what the guard reads, not the request body: a literal written inline in the
 * document never appears in `variables`, so these tests pass the scope through `args` and give the
 * context no request at all.
 */
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant, TokenType } from '@grantjs/schema';
import type { GraphQLResolveInfo } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import type { GraphqlContext } from '@/graphql/types';
import { requireEmailVerificationGraphQL } from '@/lib/authorization/email-verification-graphql-guard';
import {
  authorizeGraphQLResolver,
  isAuthorizedGraphQLResolver,
} from '@/lib/authorization/graphql-guard';
import { requireMfaGraphQL } from '@/lib/authorization/mfa-graphql-guard';
import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors/error-classes';

const projectA = { tenant: Tenant.OrganizationProject, id: 'org-a:project-a' };
const projectB = { tenant: Tenant.OrganizationProject, id: 'org-b:project-b' };
const organizationA = { tenant: Tenant.Organization, id: 'org-a' };

type Scope = { tenant: Tenant | string; id: string };

function setup(
  options: { authorizedScope?: Scope | null; type?: TokenType; target?: object | null } = {}
) {
  const {
    authorizedScope = projectA,
    type = TokenType.Session,
    target = { id: 'target' },
  } = options;
  const inner = vi.fn(async () => 'ran');
  const isAuthorized = vi.fn(async () => ({ authorized: true }));
  const projectResolver = vi.fn(async () => target);
  const context = {
    user: { type, userId: 'user-1', isVerified: true, scope: authorizedScope },
    handlers: { auth: { isAuthorized } },
    resourceResolvers: { project: projectResolver },
  } as unknown as GraphqlContext;

  const guarded = authorizeGraphQLResolver(
    {
      resource: ResourceSlug.User,
      action: ResourceAction.Update,
      resourceResolver: 'project',
    },
    inner
  ) as (
    parent: unknown,
    args: unknown,
    ctx: GraphqlContext,
    info: GraphQLResolveInfo
  ) => Promise<string>;

  const call = (args: unknown, ctx: GraphqlContext = context) =>
    guarded({}, args, ctx, {} as GraphQLResolveInfo);

  return { call, inner, isAuthorized, projectResolver, context };
}

async function refused(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown
  );
  expect(error).toBeInstanceOf(AuthorizationError);
  expect((error as Error).message).toBe('Forbidden');
}

describe('authorizeGraphQLResolver: the scope the operation names', () => {
  it('runs the resolver when input.scope is the authorized scope', async () => {
    const { call, inner, isAuthorized } = setup();
    await expect(call({ input: { scope: projectA, name: 'x' } })).resolves.toBe('ran');
    expect(inner).toHaveBeenCalledOnce();
    expect(isAuthorized).toHaveBeenCalledOnce();
  });

  it('runs the resolver when args.scope is the authorized scope', async () => {
    const { call } = setup();
    await expect(call({ id: 'x', scope: projectA })).resolves.toBe('ran');
  });

  it('refuses an id that differs, without a lookup or a permission check', async () => {
    const { call, inner, isAuthorized, projectResolver } = setup();
    await refused(call({ input: { scope: projectB } }));
    expect(projectResolver).not.toHaveBeenCalled();
    expect(isAuthorized).not.toHaveBeenCalled();
    expect(inner).not.toHaveBeenCalled();
  });

  it('refuses a tenant that differs even when the id is the same', async () => {
    const { call, inner, isAuthorized, projectResolver } = setup();
    await refused(call({ input: { scope: { tenant: Tenant.Organization, id: projectA.id } } }));
    expect(projectResolver).not.toHaveBeenCalled();
    expect(isAuthorized).not.toHaveBeenCalled();
    expect(inner).not.toHaveBeenCalled();
  });

  it('refuses a differing args.scope', async () => {
    const { call, inner } = setup();
    await refused(call({ id: 'x', scope: projectB }));
    expect(inner).not.toHaveBeenCalled();
  });

  it('refuses when either of args.scope and args.input.scope differs', async () => {
    const { call, inner } = setup();
    await refused(call({ scope: projectA, input: { scope: projectB } }));
    await refused(call({ scope: projectB, input: { scope: projectA } }));
    expect(inner).not.toHaveBeenCalled();
  });

  it('leaves an operation that names no scope unchanged', async () => {
    const { call, inner, isAuthorized, projectResolver } = setup();
    await expect(call({ id: 'x', input: { name: 'x' } })).resolves.toBe('ran');
    await expect(call({})).resolves.toBe('ran');
    await expect(call(undefined)).resolves.toBe('ran');
    expect(inner).toHaveBeenCalledTimes(3);
    expect(projectResolver).toHaveBeenCalledTimes(3);
    expect(isAuthorized).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['an unknown tenant', { tenant: 'galaxy', id: projectA.id }],
    ['the system tenant', { tenant: Tenant.System, id: projectA.id }],
    ['a scope without an id', { tenant: Tenant.OrganizationProject }],
    ['a scope that is not an object', 'org-a:project-a'],
  ])('refuses %s', async (_label, scope) => {
    const { call, inner, isAuthorized } = setup();
    await refused(call({ input: { scope } }));
    expect(isAuthorized).not.toHaveBeenCalled();
    expect(inner).not.toHaveBeenCalled();
  });

  it('refuses an inline-literal input.scope that differs, which never reaches variables', async () => {
    // The context carries no request, so there is no `req.body.variables` to read: the guard
    // sees the scope only because the resolver arguments carry it.
    const { call, inner, context } = setup();
    expect((context as unknown as { req?: unknown }).req).toBeUndefined();
    await refused(call({ input: { scope: projectB } }));
    expect(inner).not.toHaveBeenCalled();
  });

  it('does not say whether the target exists', async () => {
    const { call, projectResolver } = setup({ target: null });
    await refused(call({ input: { scope: projectB } }));
    expect(projectResolver).not.toHaveBeenCalled();

    // Same scope and a missing target is the existing "not found", which only a permitted scope sees.
    await expect(call({ input: { scope: projectA } })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('still asks for a scope first when the request has none', async () => {
    const { call, inner } = setup({ authorizedScope: null });
    await expect(call({ input: { scope: projectB } })).rejects.toBeInstanceOf(BadRequestError);
    expect(inner).not.toHaveBeenCalled();
  });
});

describe('authorizeGraphQLResolver: API key and project app requests', () => {
  it.each([TokenType.ApiKey, TokenType.ProjectApp])(
    'a %s request is authorized in the token scope, so an input naming another scope is refused',
    async (type) => {
      const { call, inner, isAuthorized } = setup({ type, authorizedScope: organizationA });
      await refused(call({ input: { scope: projectA } }));
      await refused(call({ input: { scope: { tenant: Tenant.Organization, id: 'org-b' } } }));
      expect(isAuthorized).not.toHaveBeenCalled();
      expect(inner).not.toHaveBeenCalled();
    }
  );

  it.each([TokenType.ApiKey, TokenType.ProjectApp])(
    'a %s request naming the token scope is allowed',
    async (type) => {
      const { call } = setup({ type, authorizedScope: organizationA });
      await expect(call({ input: { scope: organizationA } })).resolves.toBe('ran');
    }
  );
});

describe('authorizeGraphQLResolver: the resolver object form', () => {
  it('guards { resolve } the same way', async () => {
    const inner = vi.fn(async () => 'ran');
    const guarded = authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.Update },
      { resolve: inner }
    ) as { resolve: (...args: unknown[]) => Promise<string> };
    const context = {
      user: { type: TokenType.Session, userId: 'u', scope: projectA },
      handlers: { auth: { isAuthorized: vi.fn(async () => ({ authorized: true })) } },
    };

    await refused(guarded.resolve({}, { input: { scope: projectB } }, context, {}));
    expect(inner).not.toHaveBeenCalled();
    await expect(guarded.resolve({}, { input: { scope: projectA } }, context, {})).resolves.toBe(
      'ran'
    );
  });
});

describe('the authorization mark', () => {
  const resolver = vi.fn();
  const authorized = authorizeGraphQLResolver(
    { resource: ResourceSlug.User, action: ResourceAction.Update },
    resolver
  );

  it('is set by authorizeGraphQLResolver and not on a bare resolver', () => {
    expect(isAuthorizedGraphQLResolver(authorized)).toBe(true);
    expect(isAuthorizedGraphQLResolver(resolver)).toBe(false);
    expect(isAuthorizedGraphQLResolver(undefined)).toBe(false);
  });

  it('survives the email and MFA gates that wrap it, and is not invented by them', () => {
    expect(isAuthorizedGraphQLResolver(requireMfaGraphQL({}, authorized))).toBe(true);
    expect(
      isAuthorizedGraphQLResolver(
        requireEmailVerificationGraphQL({}, requireMfaGraphQL({}, authorized))
      )
    ).toBe(true);
    expect(isAuthorizedGraphQLResolver(requireMfaGraphQL({}, resolver))).toBe(false);
  });
});
