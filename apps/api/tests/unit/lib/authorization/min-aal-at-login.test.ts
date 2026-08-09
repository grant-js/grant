import { TokenType } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GraphqlContext } from '@/graphql/types';
import {
  assertMinAalAtLoginGraphql,
  graphqlMinAalAtLoginMiddleware,
  minAalAtLoginRestMiddleware,
  SAFE_AAL1_GRAPHQL_OPERATION_NAMES,
  SAFE_AAL1_REST_FULL_PATHS,
} from '@/lib/authorization/min-aal-at-login';
import { AuthorizationError } from '@/lib/errors';
import type { ContextRequest } from '@/types';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    minAalAtLogin: 'aal2' as 'aal1' | 'aal2',
    mfaStepUpMaxAgeSeconds: 0,
  },
}));

vi.mock('@/config', () => ({
  config: {
    auth: mockAuth,
  },
}));

function sessionUserAal1(
  overrides: Partial<{ mfaVerified: boolean; acr: string }> = {}
): GraphqlContext['user'] {
  return {
    type: TokenType.Session,
    userId: 'user-1',
    tokenId: 'sess-1',
    expiresAt: Date.now() + 60_000,
    mfaVerified: false,
    ...overrides,
  } as GraphqlContext['user'];
}

function createGqlContext(user: GraphqlContext['user'], hasEnrollment: boolean): GraphqlContext {
  return {
    user,
    handlers: {
      me: {
        hasActiveMfaEnrollmentForUser: vi.fn().mockResolvedValue(hasEnrollment),
      },
    } as unknown as GraphqlContext['handlers'],
    req: {} as GraphqlContext['req'],
    res: {} as GraphqlContext['res'],
  } as GraphqlContext;
}

describe('assertMinAalAtLoginGraphql', () => {
  beforeEach(() => {
    mockAuth.minAalAtLogin = 'aal2';
    mockAuth.mfaStepUpMaxAgeSeconds = 0;
  });

  it('returns when there is no user', async () => {
    const ctx = createGqlContext(null, true);
    await expect(assertMinAalAtLoginGraphql(ctx, 'CreateProject')).resolves.toBeUndefined();
    expect(ctx.handlers.me.hasActiveMfaEnrollmentForUser).not.toHaveBeenCalled();
  });

  it('returns when user is not a session token', async () => {
    const ctx = createGqlContext(
      {
        type: TokenType.ApiKey,
        userId: 'user-1',
        tokenId: 'key-1',
        expiresAt: Date.now() + 60_000,
        scope: { tenant: 'organization' as never, id: 'org-1' },
      } as GraphqlContext['user'],
      true
    );
    await expect(assertMinAalAtLoginGraphql(ctx, 'CreateProject')).resolves.toBeUndefined();
  });

  it('returns when minAalAtLogin is aal1', async () => {
    mockAuth.minAalAtLogin = 'aal1';
    const ctx = createGqlContext(sessionUserAal1(), true);
    await expect(assertMinAalAtLoginGraphql(ctx, 'CreateProject')).resolves.toBeUndefined();
  });

  it('returns when token already satisfies AAL2 (acr)', async () => {
    const ctx = createGqlContext(sessionUserAal1({ acr: 'aal2' }), true);
    await expect(assertMinAalAtLoginGraphql(ctx, 'CreateProject')).resolves.toBeUndefined();
  });

  it('returns when operationName is null (documents bypass when operation name absent)', async () => {
    const ctx = createGqlContext(sessionUserAal1(), true);
    await expect(assertMinAalAtLoginGraphql(ctx, null)).resolves.toBeUndefined();
  });

  it('returns when operationName is empty string', async () => {
    const ctx = createGqlContext(sessionUserAal1(), true);
    await expect(assertMinAalAtLoginGraphql(ctx, '')).resolves.toBeUndefined();
  });

  it('returns when user has no MFA enrollment', async () => {
    const ctx = createGqlContext(sessionUserAal1(), false);
    await expect(assertMinAalAtLoginGraphql(ctx, 'CreateProject')).resolves.toBeUndefined();
    expect(ctx.handlers.me.hasActiveMfaEnrollmentForUser).toHaveBeenCalledWith('user-1');
  });

  it('throws MFA_REQUIRED when enrolled, AAL1, and operation not allowlisted', async () => {
    const ctx = createGqlContext(sessionUserAal1(), true);
    await expect(assertMinAalAtLoginGraphql(ctx, 'CreateProject')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      reason: 'MFA_REQUIRED',
      metadata: { hasActiveEnrollment: true },
      originalError: undefined,
    });
  });

  it.each(Array.from(SAFE_AAL1_GRAPHQL_OPERATION_NAMES).filter((n) => n !== 'IntrospectionQuery'))(
    'allows SAFE_AAL1 op %s',
    async (op) => {
      const ctx = createGqlContext(sessionUserAal1(), true);
      await expect(assertMinAalAtLoginGraphql(ctx, op)).resolves.toBeUndefined();
    }
  );

  it('allows IntrospectionQuery when enrolled and AAL1', async () => {
    const ctx = createGqlContext(sessionUserAal1(), true);
    await expect(assertMinAalAtLoginGraphql(ctx, 'IntrospectionQuery')).resolves.toBeUndefined();
  });
});

describe('graphqlMinAalAtLoginMiddleware', () => {
  beforeEach(() => {
    mockAuth.minAalAtLogin = 'aal2';
  });

  it('skips GET requests', () => {
    const next = vi.fn();
    const req = { method: 'GET', body: {} } as ContextRequest;
    graphqlMinAalAtLoginMiddleware(req as never, {} as never, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('POST continues when operation cannot be resolved (anonymous query; min-AAL not applied here)', async () => {
    const next = vi.fn();
    const req = {
      method: 'POST',
      body: { query: '{ __typename }' },
    } as ContextRequest;
    req.context = createGqlContext(sessionUserAal1(), true) as never;
    graphqlMinAalAtLoginMiddleware(req as never, {} as never, next);
    await flushMicrotasks();
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('minAalAtLoginRestMiddleware', () => {
  beforeEach(() => {
    mockAuth.minAalAtLogin = 'aal2';
  });

  it.each(Array.from(SAFE_AAL1_REST_FULL_PATHS))('allows SAFE_AAL1 REST path %s', async (path) => {
    const next = vi.fn();
    const req = {
      originalUrl: `${path}?x=1`,
      method: 'POST',
    } as ContextRequest;
    req.context = {
      user: sessionUserAal1(),
      handlers: {
        me: { hasActiveMfaEnrollmentForUser: vi.fn().mockResolvedValue(true) },
      },
    } as never;

    minAalAtLoginRestMiddleware(req as never, {} as never, next);
    await flushMicrotasks();
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]![0]).toBeUndefined();
  });

  it('calls next with AuthorizationError for non-allowlisted path when step-up required', async () => {
    const next = vi.fn();
    const req = {
      originalUrl: '/api/projects',
      method: 'POST',
    } as ContextRequest;
    req.context = {
      user: sessionUserAal1(),
      handlers: {
        me: { hasActiveMfaEnrollmentForUser: vi.fn().mockResolvedValue(true) },
      },
    } as never;

    minAalAtLoginRestMiddleware(req as never, {} as never, next);
    await flushMicrotasks();
    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0]![0];
    expect(err).toBeInstanceOf(AuthorizationError);
    expect((err as AuthorizationError).code).toBe('FORBIDDEN');
    expect((err as AuthorizationError).reason).toBe('MFA_REQUIRED');
    expect((err as AuthorizationError).metadata).toEqual({ hasActiveEnrollment: true });
    expect((err as AuthorizationError).originalError).toBeUndefined();
  });

  it('calls next with no error when not enrolled', async () => {
    const next = vi.fn();
    const req = {
      originalUrl: '/api/projects',
      method: 'POST',
    } as ContextRequest;
    req.context = {
      user: sessionUserAal1(),
      handlers: {
        me: { hasActiveMfaEnrollmentForUser: vi.fn().mockResolvedValue(false) },
      },
    } as never;

    minAalAtLoginRestMiddleware(req as never, {} as never, next);
    await flushMicrotasks();
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]![0]).toBeUndefined();
  });
});

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
