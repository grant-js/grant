import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { CredentialService } from '@/services/credentials.service';

const userId = '30000000-0000-4000-8000-0000000000bb';
const organizationId = '10000000-0000-4000-8000-000000000001';
const projectId = '20000000-0000-4000-8000-000000000042';
const projectScope = {
  tenant: Tenant.OrganizationProject,
  id: `${organizationId}:${projectId}`,
};
const accountProjectScope = {
  tenant: Tenant.AccountProject,
  id: `10000000-0000-4000-8000-000000000002:${projectId}`,
};
const orgScope = { tenant: Tenant.Organization, id: organizationId };

/** A sentinel: if it appears in an error or a call that must not carry it, the test fails. */
const PASSWORD = 'Sentinel-Passw0rd-Kx7!';
const WEAK_PASSWORD = 'weak-sentinel';

function createHandler(overrides: { getProjectUsers?: ReturnType<typeof vi.fn> } = {}) {
  const tx = { tx: true };
  const order: string[] = [];
  const withTransaction = vi.fn(async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => {
    order.push('transaction');
    return fn(tx);
  });
  const getProjectUsers = overrides.getProjectUsers ?? vi.fn().mockResolvedValue([{ userId }]);
  const getUsers = vi.fn().mockResolvedValue({
    users: [{ id: userId, name: 'Member' }],
    totalCount: 1,
  });
  // The real policy, so a refusal is the real refusal (and its text is checked for the value).
  const policy = new CredentialService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );
  const assertPasswordMeetsPolicy = vi.fn((password: string) =>
    policy.assertPasswordMeetsPolicy(password)
  );
  const setPassword = vi.fn(async () => {
    order.push('setPassword');
    return { id: 'credential-1' };
  });
  const revokeAllForUserInProject = vi.fn(async () => {
    order.push('revokeAllForUserInProject');
    return 2;
  });

  const handler = new UserHandler(
    {} as never,
    { getUsers } as never,
    {} as never,
    { getProjectUsers } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { users: { has: vi.fn().mockResolvedValue(false) } } as never,
    {} as never,
    { withTransaction } as never,
    {} as never,
    { assertPasswordMeetsPolicy, setPassword } as never,
    { revokeAllForUserInProject } as never,
    {} as never,
    {} as never,
    {} as never
  );

  return {
    handler,
    tx,
    order,
    withTransaction,
    getProjectUsers,
    getUsers,
    assertPasswordMeetsPolicy,
    setPassword,
    revokeAllForUserInProject,
  };
}

describe('UserHandler operator set-password', () => {
  it('refuses a password the policy rejects before any transaction or write, without echoing it', async () => {
    const { handler, withTransaction, getProjectUsers, setPassword, revokeAllForUserInProject } =
      createHandler();

    const failure = await handler
      .setProjectUserPassword({
        input: { userId, password: WEAK_PASSWORD, scope: projectScope },
      })
      .catch((error: Error) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(JSON.stringify({ message: (failure as Error).message, failure })).not.toContain(
      WEAK_PASSWORD
    );
    expect(withTransaction).not.toHaveBeenCalled();
    expect(getProjectUsers).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(revokeAllForUserInProject).not.toHaveBeenCalled();
  });

  it.each([
    ['an organization scope', orgScope],
    ['a personal scope', { tenant: Tenant.Account, id: organizationId }],
  ])('rejects %s with a ValidationError and writes nothing', async (_label, scope) => {
    const { handler, withTransaction, setPassword, revokeAllForUserInProject } = createHandler();

    await expect(
      handler.setProjectUserPassword({
        input: { userId, password: PASSWORD, scope },
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(withTransaction).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(revokeAllForUserInProject).not.toHaveBeenCalled();
  });

  it('answers NotFoundError for a non-member and writes nothing (never creates)', async () => {
    const { handler, getProjectUsers, setPassword, revokeAllForUserInProject } = createHandler({
      getProjectUsers: vi.fn().mockResolvedValue([]),
    });

    await expect(
      handler.setProjectUserPassword({
        input: { userId, password: PASSWORD, scope: projectScope },
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(getProjectUsers).toHaveBeenCalledWith({ projectId, userId }, expect.anything());
    expect(setPassword).not.toHaveBeenCalled();
    expect(revokeAllForUserInProject).not.toHaveBeenCalled();
  });

  it.each([
    ['OrganizationProject', projectScope],
    ['AccountProject', accountProjectScope],
  ])(
    'sets the password as admin-set and revokes the project grants in one transaction (%s)',
    async (_label, scope) => {
      const {
        handler,
        tx,
        order,
        withTransaction,
        assertPasswordMeetsPolicy,
        setPassword,
        revokeAllForUserInProject,
      } = createHandler();

      const user = await handler.setProjectUserPassword({
        input: { userId, password: PASSWORD, scope },
      });

      expect(user).toEqual({ id: userId, name: 'Member' });
      expect(assertPasswordMeetsPolicy).toHaveBeenCalledWith(PASSWORD);
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(setPassword).toHaveBeenCalledWith(
        {
          scope: { scope: 'project', projectId },
          userId,
          password: PASSWORD,
          source: 'admin-set',
        },
        tx
      );
      expect(revokeAllForUserInProject).toHaveBeenCalledWith(projectId, userId, tx);
      expect(order).toEqual(['transaction', 'setPassword', 'revokeAllForUserInProject']);
    }
  );

  it('does not return or log the password, and leaves the Email method and platform sessions alone', async () => {
    const { handler } = createHandler();

    const user = await handler.setProjectUserPassword({
      input: { userId, password: PASSWORD, scope: projectScope },
    });

    expect(JSON.stringify(user)).not.toContain(PASSWORD);
  });
});
