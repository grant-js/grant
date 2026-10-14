/**
 * Minting an import upload URL is a write capability handed out before anything is written, so it
 * must be guarded exactly as starting the import is: the email and MFA gate, and
 * `ProjectSyncJob:update` resolved against the project (ADR 0009). The guards are recorded by
 * stand-ins, so what is asserted is the wiring in `mutations.ts`, not the authorizer.
 */
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { describe, expect, it, vi } from 'vitest';

interface Guarded {
  gates: unknown[];
  options: unknown;
  resolver: unknown;
}

vi.mock('@/lib/authorization', () => ({
  authenticateGraphQLResolver: (resolver: unknown) => resolver,
  authorizeGraphQLResolver: (options: unknown, resolver: unknown) => ({ options, resolver }),
  requireEmailThenMfaGraphQL: (
    email: unknown,
    mfa: unknown,
    inner: { options: unknown; resolver: unknown }
  ) =>
    ({ gates: [email, mfa], options: inner.options, resolver: inner.resolver }) satisfies Guarded,
}));

const { Mutation } = await import('@/graphql/resolvers/mutations');
const mutation = Mutation as unknown as Record<string, Guarded>;

describe('the import upload URL mutation is guarded like the import it feeds', () => {
  it('carries the same gates and the same permission as startProjectSync', () => {
    const upload = mutation.requestProjectSyncUploadUrl;
    const start = mutation.startProjectSync;

    expect(upload).toBeDefined();
    expect(upload?.gates).toEqual(start?.gates);
    expect(upload?.options).toEqual(start?.options);
  });

  it('requires ProjectSyncJob:update resolved against the project', () => {
    expect(mutation.requestProjectSyncUploadUrl?.options).toEqual({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Update,
      resourceResolver: 'project',
    });
  });

  it('is behind the email and MFA gate, which is not skipped for a personal context', () => {
    expect(mutation.requestProjectSyncUploadUrl?.gates).toEqual([
      { allowPersonalContext: true },
      { allowPersonalContext: true },
    ]);
  });
});
