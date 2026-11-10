/**
 * `organizationMembers` accepts an `organizationProject` scope (a project API key's own scope) and
 * reads the members of that project's organization, read-only. The organization is derived from
 * the composite id and the project must belong to it. Mutations stay organization-scope only.
 */
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError, BadRequestError } from '@/lib/errors';
import { OrganizationMemberService } from '@/services/organization-members.service';

const orgA = '10000000-0000-4000-8000-0000000000a1';
const orgB = '10000000-0000-4000-8000-0000000000b1';
const projectA = '10000000-0000-4000-8000-0000000000a2';
const projectB = '10000000-0000-4000-8000-0000000000b2';

const page = { members: [], totalCount: 0, hasNextPage: false };

function build(linked: Array<[string, string]>) {
  const organizationMemberRepository = {
    getOrganizationMembers: vi.fn().mockResolvedValue(page),
  };
  const organizationProjectRepository = {
    getOrganizationProjects: vi
      .fn()
      .mockImplementation(
        async ({ organizationId, projectId }: { organizationId: string; projectId: string }) =>
          linked.filter(([o, p]) => o === organizationId && p === projectId).map(() => ({}))
      ),
  };
  const service = new OrganizationMemberService(
    organizationMemberRepository as never,
    {} as never,
    {} as never,
    {} as never,
    null,
    {} as never,
    {} as never,
    organizationProjectRepository as never
  );
  return { service, organizationMemberRepository, organizationProjectRepository };
}

describe('getOrganizationMembers scope handling', () => {
  it('reads the organization of the project scope, as an organization scope', async () => {
    const { service, organizationMemberRepository } = build([[orgA, projectA]]);

    const result = await service.getOrganizationMembers({
      scope: { tenant: Tenant.OrganizationProject, id: `${orgA}:${projectA}` },
    } as never);

    expect(result).toBe(page);
    const passed = organizationMemberRepository.getOrganizationMembers.mock.calls[0][0];
    expect(passed.scope).toEqual({ tenant: Tenant.Organization, id: orgA });
  });

  it('refuses a project that does not belong to the named organization', async () => {
    const { service, organizationMemberRepository } = build([
      [orgA, projectA],
      [orgB, projectB],
    ]);

    await expect(
      service.getOrganizationMembers({
        scope: { tenant: Tenant.OrganizationProject, id: `${orgA}:${projectB}` },
      } as never)
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(organizationMemberRepository.getOrganizationMembers).not.toHaveBeenCalled();
  });

  it('refuses a malformed composite id', async () => {
    const { service, organizationMemberRepository } = build([[orgA, projectA]]);

    await expect(
      service.getOrganizationMembers({
        scope: { tenant: Tenant.OrganizationProject, id: orgA },
      } as never)
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(organizationMemberRepository.getOrganizationMembers).not.toHaveBeenCalled();
  });

  it('leaves the organization scope unchanged and does not look up projects', async () => {
    const { service, organizationMemberRepository, organizationProjectRepository } = build([]);

    await service.getOrganizationMembers({
      scope: { tenant: Tenant.Organization, id: orgA },
    } as never);

    expect(organizationProjectRepository.getOrganizationProjects).not.toHaveBeenCalled();
    expect(organizationMemberRepository.getOrganizationMembers.mock.calls[0][0].scope).toEqual({
      tenant: Tenant.Organization,
      id: orgA,
    });
  });

  it('refuses any other tenant', async () => {
    const { service } = build([]);

    await expect(
      service.getOrganizationMembers({
        scope: { tenant: Tenant.Account, id: orgA },
      } as never)
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('member mutations stay organization-scope only', () => {
  it('rejects an organizationProject scope on update and remove', async () => {
    const { service } = build([[orgA, projectA]]);
    const scope = { tenant: Tenant.OrganizationProject, id: `${orgA}:${projectA}` };

    await expect(
      service.updateOrganizationMember('u', { scope, roleId: 'r' } as never)
    ).rejects.toBeInstanceOf(BadRequestError);
    await expect(service.removeOrganizationMember('u', { scope } as never)).rejects.toBeInstanceOf(
      BadRequestError
    );
  });
});
