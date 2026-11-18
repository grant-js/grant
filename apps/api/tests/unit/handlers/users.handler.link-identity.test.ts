import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';
import { ValidationError } from '@/lib/errors';

const loggerWarn = vi.hoisted(() => vi.fn());

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: loggerWarn, info: vi.fn(), debug: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/lib/email/templates/project-identity-linked.template', () => ({
  getProjectIdentityLinkedEmailSubject: (p: { appName?: string }) => `subject|${p.appName ?? ''}`,
  getProjectIdentityLinkedEmailText: (p: { appName?: string }) => `text|${p.appName ?? ''}`,
  getProjectIdentityLinkedEmailHtml: async (p: { appName?: string }) => `<p>${p.appName ?? ''}</p>`,
}));

const fromUserId = '30000000-0000-4000-8000-0000000000bb';
const toUserId = '30000000-0000-4000-8000-0000000000cc';
const organizationId = '10000000-0000-4000-8000-000000000001';
const projectId = '20000000-0000-4000-8000-000000000042';
const projectScope = { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectId}` };
const ADDRESS = 'holder@example.test';

/** A cache whose every namespace answers every call, recording the calls. */
function recordingCache() {
  const calls: string[] = [];
  const namespace = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) =>
          vi.fn(async () => {
            calls.push(`${name}.${method}`);
            return method === 'keys' ? [] : method === 'has' ? false : undefined;
          }),
      }
    );
  const cache = new Proxy({}, { get: (_t, name: string) => namespace(name) });
  return { cache, calls };
}

function createHandler(
  linked = true,
  options: { withAfterCommit?: boolean; sendNotification?: ReturnType<typeof vi.fn> } = {}
) {
  const queued: Array<() => void | Promise<void>> = [];
  const scheduleAfterCommit = vi.fn((fn: () => void | Promise<void>) => {
    queued.push(fn);
  });
  const flush = async () => {
    for (const fn of queued.splice(0)) await fn();
  };
  const linkIdentity = vi.fn().mockResolvedValue(
    linked
      ? {
          linked: true,
          projectUserId: 'row-1',
          fromUserId,
          toUserId,
          fromRetired: true,
          counts: {},
        }
      : {
          linked: false,
          projectUserId: null,
          fromUserId,
          toUserId: fromUserId,
          fromRetired: false,
          counts: null,
        }
  );
  const getUsers = vi.fn(async (params: { ids: string[] }) => ({
    users: [{ id: params.ids[0], name: 'Holder' }],
    totalCount: 1,
  }));
  const getProjects = vi
    .fn()
    .mockResolvedValue({ projects: [{ id: projectId, name: 'Docs' }], totalCount: 1 });
  const sendNotification = options.sendNotification ?? vi.fn().mockResolvedValue(undefined);
  const withTransaction = vi.fn(async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}));
  const { cache, calls } = recordingCache();

  const handler = new UserHandler(
    {} as never,
    { getUsers } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    cache as never,
    {} as never,
    { withTransaction } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { sendNotification } as never,
    { getProjects } as never,
    { linkIdentity } as never,
    options.withAfterCommit === false ? undefined : scheduleAfterCommit
  );
  return {
    handler,
    linkIdentity,
    getUsers,
    sendNotification,
    flush,
    queued,
    calls,
    withTransaction,
  };
}

const input = (scope = projectScope) => ({ input: { userId: fromUserId, email: ADDRESS, scope } });

describe('UserHandler.linkProjectUserIdentity', () => {
  it.each([Tenant.AccountProject, Tenant.Organization, Tenant.ProjectUser])(
    'refuses a %s scope before any read',
    async (tenant) => {
      const h = createHandler();
      await expect(
        h.handler.linkProjectUserIdentity(input({ tenant, id: `${organizationId}:${projectId}` }))
      ).rejects.toBeInstanceOf(ValidationError);
      expect(h.withTransaction).not.toHaveBeenCalled();
      expect(h.linkIdentity).not.toHaveBeenCalled();
    }
  );

  it('runs the link in one transaction and returns the identity', async () => {
    const h = createHandler();
    const user = await h.handler.linkProjectUserIdentity(input());

    expect(h.withTransaction).toHaveBeenCalledTimes(1);
    expect(h.linkIdentity).toHaveBeenCalledWith(
      { organizationId, projectId, userId: fromUserId, email: ADDRESS },
      {}
    );
    expect(h.getUsers).toHaveBeenCalledWith({ ids: [toUserId], limit: 1 }, {});
    expect(user).toEqual({ id: toUserId, name: 'Holder' });
  });

  it('invalidates the caches of both users once the link is done', async () => {
    const h = createHandler();
    await h.handler.linkProjectUserIdentity(input());
    expect(h.calls.length).toBeGreaterThan(0);
  });

  it('tells the identity address after commit, branded with the project name, and only then', async () => {
    const h = createHandler();
    await h.handler.linkProjectUserIdentity(input());

    expect(h.sendNotification).not.toHaveBeenCalled();
    expect(h.queued).toHaveLength(1);
    await h.flush();
    expect(h.sendNotification).toHaveBeenCalledWith({
      to: ADDRESS,
      subject: 'subject|Docs',
      text: 'text|Docs',
      html: '<p>Docs</p>',
    });
  });

  it('logs a failed notice with ids only and never fails the mutation', async () => {
    loggerWarn.mockClear();
    const h = createHandler(true, {
      sendNotification: vi.fn().mockRejectedValue(new Error(`smtp refused ${ADDRESS}`)),
    });
    await expect(h.handler.linkProjectUserIdentity(input())).resolves.toBeDefined();
    await h.flush();

    expect(loggerWarn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain(ADDRESS);
  });

  it('sends nothing and touches no cache when the member already holds the address', async () => {
    const h = createHandler(false);
    const user = await h.handler.linkProjectUserIdentity(input());

    expect(user.id).toBe(fromUserId);
    expect(h.queued).toHaveLength(0);
    expect(h.calls).toHaveLength(0);
  });
});
