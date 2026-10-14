/**
 * `POST /api/projects/:id/sync/upload-url` carries the same authorization as
 * `POST /api/projects/:id/sync/jobs` (ADR 0009): the email and MFA gate, and
 * `ProjectSyncJob:update` resolved against the project. Recorded by stand-ins that tag the
 * handlers they return, then read back off the router, so the route's wiring is what is asserted.
 */
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '@/types';

type Tagged = ((...args: unknown[]) => void) & { __guard?: string; __options?: unknown };

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

const { createProjectsRouter } = await import('@/rest/routes/projects.routes');

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: Tagged }[] };
}

function guardsOf(path: string) {
  const router = createProjectsRouter({} as RequestContext);
  const layer = (router.stack as unknown as RouteLayer[]).find(
    (candidate) => candidate.route?.path === path && candidate.route.methods.post
  );
  expect(layer, `POST ${path} is registered`).toBeDefined();
  return (layer?.route?.stack ?? [])
    .map((entry) => entry.handle)
    .filter((handle) => handle.__guard !== undefined)
    .map((handle) => ({ guard: handle.__guard, options: handle.__options }));
}

describe('POST /:id/sync/upload-url authorization', () => {
  it('has exactly the guards of starting an import, in the same order', () => {
    expect(guardsOf('/:id/sync/upload-url')).toEqual(guardsOf('/:id/sync/jobs'));
  });

  it('is gated by email and MFA, then by ProjectSyncJob:update against the project', () => {
    expect(guardsOf('/:id/sync/upload-url')).toEqual([
      {
        guard: 'emailThenMfa',
        options: [{ allowPersonalContext: true }, { allowPersonalContext: true }],
      },
      {
        guard: 'authorize',
        options: {
          resource: ResourceSlug.ProjectSyncJob,
          action: ResourceAction.Update,
          resourceResolver: 'project',
        },
      },
    ]);
  });
});
