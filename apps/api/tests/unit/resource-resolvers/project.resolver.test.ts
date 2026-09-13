import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { createProjectResourceResolver } from '@/resource-resolvers/project.resolver';
import type { RequestContext } from '@/types';

describe('createProjectResourceResolver', () => {
  const scope = { tenant: Tenant.Organization, id: 'org-1' };
  const context = {
    handlers: {
      projects: {
        getScopedProjectIds: vi.fn().mockResolvedValue(['project-1']),
      },
    },
  } as unknown as RequestContext;

  it('resolves update-style args.id', async () => {
    const resolver = createProjectResourceResolver();
    await expect(
      resolver({
        resourceSlug: 'project',
        scope,
        context,
        request: { id: 'project-1', input: { name: 'Acme' } },
      })
    ).resolves.toEqual({ id: 'project-1', scope: { projects: ['project-1'] } });
  });

  it('resolves picture-upload args.input.projectId', async () => {
    const resolver = createProjectResourceResolver();
    await expect(
      resolver({
        resourceSlug: 'project',
        scope,
        context,
        request: { input: { projectId: 'project-1', filename: 'logo.png' } },
      })
    ).resolves.toEqual({ id: 'project-1', scope: { projects: ['project-1'] } });
  });
});
