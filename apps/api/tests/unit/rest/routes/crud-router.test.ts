import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

/**
 * Locks the middleware contract of the router factory extracted in slice 7.
 *
 * Its JSDoc calls the order load-bearing — `validate` → `requireEmailThenMfaRest`
 * → `authorizeRestRoute` → handler — but nothing asserted it, so a reordering
 * would have been a silent behaviour change across `groups`, `roles` and
 * `permissions` at once. The two facts that matter:
 *
 *   - GET is deliberately the one route with **no** MFA guard.
 *   - Authorization runs **after** MFA, so a step-up challenge is raised before
 *     a permission denial. Swapping them leaks whether a resource exists to a
 *     caller who has not completed MFA.
 */
const marks = {
  validate: vi.fn((config: unknown) => Object.assign(() => {}, { mark: 'validate', config })),
  mfa: vi.fn((..._args: unknown[]) => Object.assign(() => {}, { mark: 'mfa' })),
  authorize: vi.fn((config: unknown) => Object.assign(() => {}, { mark: 'authorize', config })),
};

vi.mock('@/middleware/validation.middleware', () => ({
  validate: (config: unknown) => marks.validate(config),
}));

vi.mock('@/lib/authorization', () => ({
  requireEmailThenMfaRest: (...args: unknown[]) => marks.mfa(...args),
  authorizeRestRoute: (config: unknown) => marks.authorize(config),
}));

const sendSuccessResponse = vi.fn();
vi.mock('@/rest/utils/response', () => ({
  sendSuccessResponse: (...args: unknown[]) => sendSuccessResponse(...args),
}));

vi.mock('@/rest/utils/list-query', () => ({
  queryListCommons: () => ({
    requestedFields: ['id'],
    sort: null,
    scope: { id: 's', tenant: 'a' },
  }),
}));

const { createCrudRouter } = await import('@/rest/routes/common/crud-router');

const anySchema = z.object({}).passthrough();

const handlers = {
  list: vi.fn(async () => ({ items: [], totalCount: 0, hasNextPage: false })),
  create: vi.fn(async () => ({ id: 'new' })),
  update: vi.fn(async () => ({ id: 'updated' })),
  remove: vi.fn(async () => ({ id: 'removed' })),
};

function buildRouter() {
  return createCrudRouter({
    resource: ResourceSlug.Role,
    schemas: {
      list: anySchema,
      create: anySchema,
      update: anySchema,
      params: anySchema,
      scopeQuery: anySchema,
    },
    list: handlers.list,
    create: handlers.create,
    update: handlers.update,
    remove: handlers.remove,
  });
}

type Layer = {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
};

function routeFor(router: ReturnType<typeof buildRouter>, method: string, path: string) {
  const layer = (router.stack as Layer[]).find(
    (l) => l.route?.path === path && l.route.methods[method]
  );
  if (!layer?.route) throw new Error(`no ${method.toUpperCase()} ${path}`);
  return layer.route.stack.map((entry) => (entry.handle as { mark?: string }).mark ?? 'handler');
}

let router: ReturnType<typeof buildRouter>;

beforeEach(() => {
  vi.clearAllMocks();
  router = buildRouter();
});

describe('registered routes', () => {
  it('registers exactly the four CRUD routes', () => {
    const routes = (router.stack as Layer[])
      .filter((l) => l.route)
      .map((l) => `${Object.keys(l.route!.methods)[0].toUpperCase()} ${l.route!.path}`)
      .sort();

    expect(routes).toEqual(['DELETE /:id', 'GET /', 'PATCH /:id', 'POST /']);
  });
});

describe('middleware order', () => {
  it('runs validate then authorize on GET, with no MFA guard', () => {
    expect(routeFor(router, 'get', '/')).toEqual(['validate', 'authorize', 'handler']);
  });

  it.each([
    ['post', '/'],
    ['patch', '/:id'],
    ['delete', '/:id'],
  ])('runs validate then MFA then authorize on %s %s', (method, path) => {
    expect(routeFor(router, method, path)).toEqual(['validate', 'mfa', 'authorize', 'handler']);
  });

  it('never places authorization before the MFA guard', () => {
    for (const [method, path] of [
      ['post', '/'],
      ['patch', '/:id'],
      ['delete', '/:id'],
    ] as const) {
      const stack = routeFor(router, method, path);
      expect(stack.indexOf('mfa')).toBeLessThan(stack.indexOf('authorize'));
    }
  });

  it('allows personal context on both MFA arguments', () => {
    expect(marks.mfa).toHaveBeenCalledWith(
      { allowPersonalContext: true },
      { allowPersonalContext: true }
    );
  });
});

describe('authorization actions', () => {
  it('maps each route to its own resource action', () => {
    const actions = marks.authorize.mock.calls.map(([config]) => config);

    expect(actions).toEqual([
      { resource: ResourceSlug.Role, action: ResourceAction.Query },
      { resource: ResourceSlug.Role, action: ResourceAction.Create },
      { resource: ResourceSlug.Role, action: ResourceAction.Update },
      { resource: ResourceSlug.Role, action: ResourceAction.Delete },
    ]);
  });
});

describe('validation targets', () => {
  it('validates the query on list and the body on create', () => {
    const [listConfig, createConfig] = marks.validate.mock.calls.map(([config]) => config);

    expect(Object.keys(listConfig as object)).toEqual(['query']);
    expect(Object.keys(createConfig as object)).toEqual(['body']);
  });

  it('validates params, body and scope query on update', () => {
    const updateConfig = marks.validate.mock.calls[2][0] as object;

    expect(Object.keys(updateConfig).sort()).toEqual(['body', 'params', 'query']);
  });

  it('validates params and scope query on delete, but no body', () => {
    const deleteConfig = marks.validate.mock.calls[3][0] as object;

    expect(Object.keys(deleteConfig).sort()).toEqual(['params', 'query']);
  });
});

describe('handler dispatch', () => {
  const res = {} as never;

  async function invoke(method: string, path: string, req: unknown) {
    const layer = (router.stack as Layer[]).find(
      (l) => l.route?.path === path && l.route.methods[method]
    )!;
    const final = layer.route!.stack.at(-1)!.handle as (r: unknown, s: unknown) => Promise<void>;
    await final(req, res);
  }

  it('creates with the parsed body and responds 201', async () => {
    await invoke('post', '/', { body: { name: 'n' } });

    expect(handlers.create).toHaveBeenCalledWith({ name: 'n' });
    expect(sendSuccessResponse).toHaveBeenCalledWith(res, { id: 'new' }, 201);
  });

  it('folds the scope query into the update input', async () => {
    await invoke('patch', '/:id', {
      params: { id: 'r1' },
      query: { scopeId: 'acct:proj', tenant: Tenant.AccountProject },
      body: { name: 'n' },
    });

    expect(handlers.update).toHaveBeenCalledWith('r1', {
      name: 'n',
      scope: { id: 'acct:proj', tenant: Tenant.AccountProject },
    });
  });

  it('passes the scope as a separate argument on delete', async () => {
    await invoke('delete', '/:id', {
      params: { id: 'r1' },
      query: { scopeId: 'acct:proj', tenant: Tenant.AccountProject },
    });

    expect(handlers.remove).toHaveBeenCalledWith('r1', {
      id: 'acct:proj',
      tenant: Tenant.AccountProject,
    });
  });

  it('responds with the list result without a status override', async () => {
    await invoke('get', '/', { query: {} });

    expect(sendSuccessResponse).toHaveBeenCalledWith(res, {
      items: [],
      totalCount: 0,
      hasNextPage: false,
    });
  });
});
