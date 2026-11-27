/**
 * `POST /api/organizations/:id/ownership-transfer` is owner-only: the email and MFA gate, which is
 * not skipped for a personal context, then `Organization:TransferOwnership`. The scope the request
 * was authorized in must be the organization in the path. Recorded by stand-ins that tag the
 * handlers they return, then read back off the router, so the route's wiring is what is asserted.
 */
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '@/types';

type Tagged = ((...args: unknown[]) => unknown) & { __guard?: string; __options?: unknown };

vi.mock('@/lib/authorization', () => ({
  authorizeRestRoute: (options: unknown) => {
    const handler: Tagged = () => undefined;
    handler.__guard = 'authorize';
    handler.__options = options;
    return handler;
  },
  requireEmailThenMfaRest: (...options: unknown[]) => {
    const handler: Tagged = () => undefined;
    handler.__guard = 'emailThenMfa';
    handler.__options = options;
    return handler;
  },
}));

const { createOrganizationRoutes } = await import('@/rest/routes/organizations.routes');

const PATH = '/:id/ownership-transfer';
const organizationId = '10000000-0000-4000-8000-0000000000c1';
const callerId = '10000000-0000-4000-8000-0000000000c2';
const targetId = '10000000-0000-4000-8000-0000000000c3';

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: Tagged }[] };
}

function routeStack(context: Partial<RequestContext> = {}) {
  const router = createOrganizationRoutes(context as RequestContext);
  const layer = (router.stack as unknown as RouteLayer[]).find(
    (candidate) => candidate.route?.path === PATH && candidate.route.methods.post
  );
  expect(layer, `POST ${PATH} is registered`).toBeDefined();
  return layer?.route?.stack.map((entry) => entry.handle) ?? [];
}

describe('POST /:id/ownership-transfer', () => {
  it('is gated by email and MFA, then by Organization:TransferOwnership', () => {
    const guards = routeStack()
      .filter((handle) => handle.__guard !== undefined)
      .map((handle) => ({ guard: handle.__guard, options: handle.__options }));

    expect(guards).toEqual([
      {
        guard: 'emailThenMfa',
        options: [{ allowPersonalContext: false }, { allowPersonalContext: false }],
      },
      {
        guard: 'authorize',
        options: { resource: ResourceSlug.Organization, action: ResourceAction.TransferOwnership },
      },
    ]);
  });

  describe('the handler', () => {
    const body = (scope: unknown) => ({ scope, newOwnerId: targetId, leaveOrganization: true });
    const run = async (
      req: Record<string, unknown>,
      transferOwnership = vi.fn().mockResolvedValue({ ok: true })
    ) => {
      const context = {
        user: { userId: callerId },
        handlers: { organizationMembers: { transferOwnership } },
      };
      const stack = routeStack(context as never);
      const handler = stack[stack.length - 1] as (...args: unknown[]) => Promise<void>;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await handler({ params: { id: organizationId }, ...req }, res);
      return { res, transferOwnership };
    };

    it('transfers in the scope of the path organization, as the calling user', async () => {
      const scope = { tenant: Tenant.Organization, id: organizationId };
      const { res, transferOwnership } = await run({ body: body(scope) });

      expect(transferOwnership).toHaveBeenCalledWith(
        {
          scope,
          newOwnerId: targetId,
          previousOwnerRoleId: undefined,
          leaveOrganization: true,
        },
        callerId
      );
      expect(res.json).toHaveBeenCalled();
    });

    it.each([
      ['another organization', { tenant: Tenant.Organization, id: targetId }],
      ['another tenant', { tenant: Tenant.Account, id: organizationId }],
    ])('refuses a scope naming %s than the path', async (_label, scope) => {
      const transferOwnership = vi.fn();

      await expect(run({ body: body(scope) }, transferOwnership)).rejects.toThrow(
        'scope must be the organization in the path'
      );
      expect(transferOwnership).not.toHaveBeenCalled();
    });
  });
});
