import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';

const loggerWarn = vi.hoisted(() => vi.fn());

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: loggerWarn,
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

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
    sendProjectEmailChanged?: ReturnType<typeof vi.fn>;
    getProjects?: ReturnType<typeof vi.fn>;
    /** `false` builds the handler without the after-commit hook. */
    withAfterCommit?: boolean;
  } = {}
) {
  // Callbacks queued for after the commit; nothing runs until a test flushes them.
  const queued: Array<{ fn: () => void | Promise<void>; label?: string }> = [];
  const scheduleAfterCommit = vi.fn((fn: () => void | Promise<void>, label?: string) => {
    queued.push({ fn, label });
  });
  const flushAfterCommit = async () => {
    for (const { fn } of queued.splice(0)) await fn();
  };
  const sendProjectEmailChanged =
    overrides.sendProjectEmailChanged ?? vi.fn().mockResolvedValue(undefined);
  const getProjects =
    overrides.getProjects ??
    vi.fn().mockResolvedValue({ projects: [{ id: projectId, name: 'Docs' }], totalCount: 1 });
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
    {} as never,
    { sendProjectEmailChanged } as never,
    { getProjects } as never,
    overrides.withAfterCommit === false ? undefined : scheduleAfterCommit
  );

  return {
    handler,
    scheduleAfterCommit,
    flushAfterCommit,
    queued,
    sendProjectEmailChanged,
    getProjects,
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
      { userId, email: 'ada@example.com', operation: 'operator-create-user' },
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

  it('names the operation on setProjectUserEmail so the audit row says who wrote the address', async () => {
    const { handler, setOrReplaceEmailMethod } = createHandler();

    await handler.setProjectUserEmail({
      input: { userId, email: ' Ada@Example.com', scope: projectScope },
    });

    expect(setOrReplaceEmailMethod).toHaveBeenCalledWith(
      { userId, email: 'ada@example.com', operation: 'operator-set-email' },
      expect.anything()
    );
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

  describe('notice to the previous address', () => {
    const changed = () =>
      vi.fn().mockResolvedValue({
        method: { id: 'method-1' },
        operation: 'changed',
        previousEmail: 'old@example.com',
      });

    beforeEach(() => {
      loggerWarn.mockClear();
    });

    it('queues one notice to the previous address on a change, and sends nothing before the commit', async () => {
      const { handler, scheduleAfterCommit, sendProjectEmailChanged, flushAfterCommit } =
        createHandler({ setOrReplaceEmailMethod: changed() });

      await handler.setProjectUserEmail({
        input: { userId, email: 'New@Example.com', scope: projectScope },
      });

      expect(scheduleAfterCommit).toHaveBeenCalledTimes(1);
      expect(sendProjectEmailChanged).not.toHaveBeenCalled();

      await flushAfterCommit();

      expect(sendProjectEmailChanged).toHaveBeenCalledTimes(1);
      expect(sendProjectEmailChanged).toHaveBeenCalledWith({
        to: 'old@example.com',
        appName: 'Docs',
      });
      // The new address never reaches the port: the call carries the recipient and the name.
      expect(JSON.stringify(sendProjectEmailChanged.mock.calls)).not.toContain('new@example.com');
    });

    it('reads the app name before the commit, never inside the queued callback', async () => {
      const { handler, getProjects, flushAfterCommit } = createHandler({
        setOrReplaceEmailMethod: changed(),
      });

      await handler.setProjectUserEmail({
        input: { userId, email: 'new@example.com', scope: projectScope },
      });

      expect(getProjects).toHaveBeenCalledTimes(1);
      expect(getProjects).toHaveBeenCalledWith({ ids: [projectId], limit: 1 });
      getProjects.mockClear();
      await flushAfterCommit();
      expect(getProjects).not.toHaveBeenCalled();
    });

    it('falls back to the generic name when the project name cannot be read', async () => {
      const { handler, sendProjectEmailChanged, flushAfterCommit } = createHandler({
        setOrReplaceEmailMethod: changed(),
        getProjects: vi.fn().mockRejectedValue(new Error('boom')),
      });

      await handler.setProjectUserEmail({
        input: { userId, email: 'new@example.com', scope: projectScope },
      });
      await flushAfterCommit();

      expect(sendProjectEmailChanged).toHaveBeenCalledWith({ to: 'old@example.com' });
      expect(loggerWarn).toHaveBeenCalledWith(
        expect.objectContaining({ projectId, userId }),
        expect.any(String)
      );
    });

    it('sends nothing when the address was added, not changed', async () => {
      const { handler, scheduleAfterCommit, sendProjectEmailChanged, flushAfterCommit } =
        createHandler();

      await handler.setProjectUserEmail({
        input: { userId, email: 'new@example.com', scope: projectScope },
      });
      await flushAfterCommit();

      expect(scheduleAfterCommit).not.toHaveBeenCalled();
      expect(sendProjectEmailChanged).not.toHaveBeenCalled();
    });

    it('sends nothing when set-email is a no-op', async () => {
      const { handler, scheduleAfterCommit, sendProjectEmailChanged, flushAfterCommit } =
        createHandler({
          setOrReplaceEmailMethod: vi.fn().mockResolvedValue({
            method: { id: 'method-1' },
            operation: null,
          }),
        });

      await handler.setProjectUserEmail({
        input: { userId, email: 'ada@example.com', scope: projectScope },
      });
      await flushAfterCommit();

      expect(scheduleAfterCommit).not.toHaveBeenCalled();
      expect(sendProjectEmailChanged).not.toHaveBeenCalled();
    });

    it('sends nothing on createUser with an email, which is always an added address', async () => {
      const { handler, scheduleAfterCommit, sendProjectEmailChanged, flushAfterCommit } =
        createHandler();

      await handler.createUser({
        input: { name: 'Member', scope: projectScope, email: 'ada@example.com' },
        actorUserId,
      });
      await flushAfterCommit();

      expect(scheduleAfterCommit).not.toHaveBeenCalled();
      expect(sendProjectEmailChanged).not.toHaveBeenCalled();
    });

    it('sends nothing when the mutation fails before the commit', async () => {
      const { handler, scheduleAfterCommit, sendProjectEmailChanged, flushAfterCommit } =
        createHandler({
          setOrReplaceEmailMethod: changed(),
          getUsers: vi.fn().mockResolvedValue({ users: [], totalCount: 0 }),
        });

      await expect(
        handler.setProjectUserEmail({
          input: { userId, email: 'new@example.com', scope: projectScope },
        })
      ).rejects.toBeInstanceOf(NotFoundError);
      await flushAfterCommit();

      expect(scheduleAfterCommit).not.toHaveBeenCalled();
      expect(sendProjectEmailChanged).not.toHaveBeenCalled();
    });

    it('does not fail the mutation when the send is rejected, and logs ids without the address', async () => {
      const rejection = Object.assign(new Error('rejected recipient old@example.com'), {
        code: 'EMAIL_SEND_ERROR',
      });
      const { handler, sendProjectEmailChanged, flushAfterCommit } = createHandler({
        setOrReplaceEmailMethod: changed(),
        sendProjectEmailChanged: vi.fn().mockRejectedValue(rejection),
      });

      const user = await handler.setProjectUserEmail({
        input: { userId, email: 'new@example.com', scope: projectScope },
      });
      await expect(flushAfterCommit()).resolves.toBeUndefined();

      expect(user.id).toBe(userId);
      expect(sendProjectEmailChanged).toHaveBeenCalledTimes(1);
      expect(loggerWarn).toHaveBeenCalledTimes(1);
      const logged = JSON.stringify(loggerWarn.mock.calls);
      expect(logged).toContain(userId);
      expect(logged).toContain(projectId);
      expect(logged).toContain('EMAIL_SEND_ERROR');
      expect(logged).not.toContain('old@example.com');
      expect(logged).not.toContain('new@example.com');
    });

    it('sends at once, still without failing, when no after-commit hook is wired', async () => {
      const { handler, sendProjectEmailChanged } = createHandler({
        setOrReplaceEmailMethod: changed(),
        sendProjectEmailChanged: vi.fn().mockRejectedValue(new Error('down')),
        withAfterCommit: false,
      });

      const user = await handler.setProjectUserEmail({
        input: { userId, email: 'new@example.com', scope: projectScope },
      });

      expect(user.id).toBe(userId);
      expect(sendProjectEmailChanged).toHaveBeenCalledTimes(1);
    });
  });
});
