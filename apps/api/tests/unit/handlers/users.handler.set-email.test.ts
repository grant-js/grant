import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';

const actorUserId = '30000000-0000-4000-8000-0000000000aa';
const userId = '30000000-0000-4000-8000-0000000000bb';
const organizationId = '10000000-0000-4000-8000-000000000001';
const projectId = '20000000-0000-4000-8000-000000000042';
const projectScope = {
  tenant: Tenant.OrganizationProject,
  id: `${organizationId}:${projectId}`,
};
const orgScope = { tenant: Tenant.Organization, id: organizationId };

function createHandler(
  overrides: {
    authAuthorized?: boolean;
    createUser?: ReturnType<typeof vi.fn>;
    addProjectUser?: ReturnType<typeof vi.fn>;
    setOrReplaceEmailMethod?: ReturnType<typeof vi.fn>;
    publishProjectUserEmailChanged?: ReturnType<typeof vi.fn>;
    getProjectUsers?: ReturnType<typeof vi.fn>;
    getUsers?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const withTransaction = vi.fn(async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}));
  const createUser =
    overrides.createUser ?? vi.fn().mockResolvedValue({ id: userId, name: 'Member' });
  const addProjectUser = overrides.addProjectUser ?? vi.fn().mockResolvedValue({});
  const setOrReplaceEmailMethod =
    overrides.setOrReplaceEmailMethod ??
    vi.fn().mockResolvedValue({ method: { id: 'method-1' }, operation: 'added' });
  const publishProjectUserEmailChanged =
    overrides.publishProjectUserEmailChanged ?? vi.fn().mockResolvedValue(undefined);
  const getProjectUsers = overrides.getProjectUsers ?? vi.fn().mockResolvedValue([{ userId }]);
  const getUsers =
    overrides.getUsers ??
    vi.fn().mockResolvedValue({ users: [{ id: userId, name: 'Member' }], totalCount: 1 });
  const isAuthorized = vi.fn().mockResolvedValue({
    authorized: overrides.authAuthorized ?? true,
    reason: overrides.authAuthorized === false ? 'missing permission' : undefined,
  });
  const normalizeOperatorEmail = vi.fn((email: string) => email.trim().toLowerCase());

  const handler = new UserHandler(
    {} as never,
    { createUser, getUsers } as never,
    {} as never,
    { addProjectUser, getProjectUsers, publishProjectUserEmailChanged } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { normalizeOperatorEmail, setOrReplaceEmailMethod } as never,
    {} as never,
    { users: { has: vi.fn().mockResolvedValue(false) } } as never,
    {} as never,
    { withTransaction } as never,
    { isAuthorized } as never,
    {} as never,
    {} as never,
    {} as never
  );

  return {
    handler,
    withTransaction,
    createUser,
    addProjectUser,
    setOrReplaceEmailMethod,
    publishProjectUserEmailChanged,
    getProjectUsers,
    getUsers,
    isAuthorized,
    normalizeOperatorEmail,
  };
}

describe('UserHandler operator set-email', () => {
  it('checks ProjectUser:SetEmail before any insert when createUser includes email', async () => {
    const { handler, withTransaction, createUser, isAuthorized } = createHandler({
      authAuthorized: false,
    });

    await expect(
      handler.createUser({
        input: { name: 'Member', scope: projectScope, email: 'ada@example.com' },
        actorUserId,
      })
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(isAuthorized).toHaveBeenCalledWith(
      {
        permission: { resource: ResourceSlug.ProjectUser, action: ResourceAction.SetEmail },
        context: {},
      },
      actorUserId
    );
    expect(withTransaction).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects email on a non-project create', async () => {
    const { handler, withTransaction, createUser, isAuthorized } = createHandler();

    await expect(
      handler.createUser({
        input: {
          name: 'Member',
          scope: orgScope,
          email: 'ada@example.com',
          roleIds: ['10000000-0000-4000-8000-000000000099'],
        },
        actorUserId,
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(isAuthorized).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates a project user with an unverified email when SetEmail is granted', async () => {
    const {
      handler,
      createUser,
      addProjectUser,
      setOrReplaceEmailMethod,
      publishProjectUserEmailChanged,
      isAuthorized,
    } = createHandler();

    const user = await handler.createUser({
      input: { name: 'Member', scope: projectScope, email: 'Ada@Example.com' },
      actorUserId,
    });

    expect(user.id).toBe(userId);
    expect(isAuthorized).toHaveBeenCalled();
    expect(createUser).toHaveBeenCalled();
    expect(addProjectUser).toHaveBeenCalledWith(
      expect.objectContaining({ projectId, userId }),
      expect.anything()
    );
    expect(setOrReplaceEmailMethod).toHaveBeenCalledWith(
      { userId, email: 'ada@example.com' },
      expect.anything()
    );
    expect(publishProjectUserEmailChanged).toHaveBeenCalledWith(
      { projectId, userId, operation: 'added' },
      expect.anything()
    );
  });

  it('allows createUser without email when the actor lacks SetEmail', async () => {
    const { handler, isAuthorized, createUser, addProjectUser, setOrReplaceEmailMethod } =
      createHandler({ authAuthorized: false });

    await handler.createUser({
      input: { name: 'Member', scope: projectScope },
      actorUserId,
    });

    expect(isAuthorized).not.toHaveBeenCalled();
    expect(createUser).toHaveBeenCalled();
    expect(addProjectUser).toHaveBeenCalled();
    expect(setOrReplaceEmailMethod).not.toHaveBeenCalled();
  });

  it('requires project membership to set email', async () => {
    const { handler, setOrReplaceEmailMethod, getProjectUsers } = createHandler({
      getProjectUsers: vi.fn().mockResolvedValue([]),
    });

    await expect(
      handler.setProjectUserEmail({
        input: { userId, email: 'ada@example.com', scope: projectScope },
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(getProjectUsers).toHaveBeenCalledWith({ projectId, userId }, expect.anything());
    expect(setOrReplaceEmailMethod).not.toHaveBeenCalled();
  });

  it('does not publish when set-email is a no-op', async () => {
    const { handler, publishProjectUserEmailChanged } = createHandler({
      setOrReplaceEmailMethod: vi.fn().mockResolvedValue({
        method: { id: 'method-1' },
        operation: null,
      }),
    });

    await handler.setProjectUserEmail({
      input: { userId, email: 'ada@example.com', scope: projectScope },
    });

    expect(publishProjectUserEmailChanged).not.toHaveBeenCalled();
  });
});
