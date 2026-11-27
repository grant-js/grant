/**
 * Transferring ownership is guarded like deleting the organization: the email and MFA gate, which
 * is not skipped for a personal context, and `Organization:TransferOwnership` (held by the Owner
 * group only; the service also checks the caller holds Owner). The guards are recorded by
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
const { transferOrganizationOwnershipResolver } =
  await import('@/graphql/resolvers/organization-members/mutations/transfer-organization-ownership.resolver');
const mutation = Mutation as unknown as Record<string, Guarded>;

describe('the transferOrganizationOwnership mutation', () => {
  it('requires Organization:TransferOwnership', () => {
    expect(mutation.transferOrganizationOwnership?.options).toEqual({
      resource: ResourceSlug.Organization,
      action: ResourceAction.TransferOwnership,
    });
  });

  it('is behind the email and MFA gate, not skipped for a personal context, like deleteOrganization', () => {
    expect(mutation.transferOrganizationOwnership?.gates).toEqual([
      { allowPersonalContext: false },
      { allowPersonalContext: false },
    ]);
    expect(mutation.transferOrganizationOwnership?.gates).toEqual(
      mutation.deleteOrganization?.gates
    );
  });

  it('is served by the transfer resolver', () => {
    expect(mutation.transferOrganizationOwnership?.resolver).toBe(
      transferOrganizationOwnershipResolver
    );
  });
});

describe('transferOrganizationOwnershipResolver', () => {
  const input = { scope: { tenant: 'organization', id: 'org' }, newOwnerId: 'u2' };

  it('hands the input and the calling user to the members handler', async () => {
    const transferOwnership = vi.fn().mockResolvedValue({ ok: true });
    const result = await (
      transferOrganizationOwnershipResolver as unknown as (...args: unknown[]) => Promise<unknown>
    )(
      {},
      { input },
      { user: { userId: 'u1' }, handlers: { organizationMembers: { transferOwnership } } }
    );

    expect(transferOwnership).toHaveBeenCalledWith(input, 'u1');
    expect(result).toEqual({ ok: true });
  });

  it('refuses a request with no user', async () => {
    const transferOwnership = vi.fn();
    await expect(
      (
        transferOrganizationOwnershipResolver as unknown as (...args: unknown[]) => Promise<unknown>
      )({}, { input }, { handlers: { organizationMembers: { transferOwnership } } })
    ).rejects.toThrow();
    expect(transferOwnership).not.toHaveBeenCalled();
  });
});
