/**
 * Unit tests for ProjectHandler.setProjectExportableApiKeySecrets: project scope only, the
 * project is the one in the scope, and a REST path id that names another project is refused
 * before any write.
 */
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectHandler } from '@/handlers/projects.handler';
import { BadRequestError, ValidationError } from '@/lib/errors';

const ownerId = '10000000-0000-4000-8000-000000000001';
const projectId = '20000000-0000-4000-8000-000000000042';
const otherProjectId = '20000000-0000-4000-8000-000000000043';
const tx = { tx: true };

function createHandler() {
  const setExportableApiKeySecrets = vi
    .fn()
    .mockResolvedValue({ id: projectId, exportableApiKeySecrets: true });
  const withTransaction = vi.fn(async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx));
  const handler = new ProjectHandler(
    {} as never,
    {} as never,
    { setExportableApiKeySecrets } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    null,
    {} as never,
    {} as never,
    { withTransaction } as never,
    {} as never
  );
  return { handler, setExportableApiKeySecrets, withTransaction };
}

describe('ProjectHandler.setProjectExportableApiKeySecrets', () => {
  let ctx: ReturnType<typeof createHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createHandler();
  });

  it.each([
    ['OrganizationProject', Tenant.OrganizationProject, `${ownerId}:${projectId}`],
    ['AccountProject', Tenant.AccountProject, `${ownerId}:${projectId}`],
  ])(
    'sets the flag of the project in an %s scope, in one transaction',
    async (_label, tenant, id) => {
      const project = await ctx.handler.setProjectExportableApiKeySecrets({
        input: { scope: { tenant, id }, enabled: true },
      });

      expect(project).toEqual({ id: projectId, exportableApiKeySecrets: true });
      expect(ctx.withTransaction).toHaveBeenCalledTimes(1);
      expect(ctx.setExportableApiKeySecrets).toHaveBeenCalledWith({ projectId, enabled: true }, tx);
    }
  );

  it.each([
    ['an organization scope', { tenant: Tenant.Organization, id: ownerId }],
    ['a personal account scope', { tenant: Tenant.Account, id: ownerId }],
    [
      'an organization project-user scope',
      { tenant: Tenant.OrganizationProjectUser, id: `${ownerId}:${projectId}:${ownerId}` },
    ],
  ])('refuses %s with a ValidationError and writes nothing', async (_label, scope) => {
    await expect(
      ctx.handler.setProjectExportableApiKeySecrets({ input: { scope, enabled: true } })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(ctx.withTransaction).not.toHaveBeenCalled();
    expect(ctx.setExportableApiKeySecrets).not.toHaveBeenCalled();
  });

  it('refuses a project scope whose id carries no project', async () => {
    await expect(
      ctx.handler.setProjectExportableApiKeySecrets({
        input: { scope: { tenant: Tenant.OrganizationProject, id: ownerId }, enabled: true },
      })
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(ctx.setExportableApiKeySecrets).not.toHaveBeenCalled();
  });

  it('accepts a REST path id that names the scope project', async () => {
    await ctx.handler.setProjectExportableApiKeySecrets({
      input: {
        scope: { tenant: Tenant.OrganizationProject, id: `${ownerId}:${projectId}` },
        enabled: false,
      },
      pathProjectId: projectId,
    });

    expect(ctx.setExportableApiKeySecrets).toHaveBeenCalledWith({ projectId, enabled: false }, tx);
  });

  it('refuses a REST path id that names another project than the scope, before any write', async () => {
    await expect(
      ctx.handler.setProjectExportableApiKeySecrets({
        input: {
          scope: { tenant: Tenant.OrganizationProject, id: `${ownerId}:${projectId}` },
          enabled: true,
        },
        pathProjectId: otherProjectId,
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(ctx.withTransaction).not.toHaveBeenCalled();
    expect(ctx.setExportableApiKeySecrets).not.toHaveBeenCalled();
  });
});
