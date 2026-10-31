import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { OrganizationMemberService } from '@/services/organization-members.service';

const organizationId = '10000000-0000-4000-8000-0000000000f1';
const callerId = '10000000-0000-4000-8000-0000000000f2';
const memberId = '10000000-0000-4000-8000-0000000000f3';
const newRoleId = '10000000-0000-4000-8000-0000000000f4';

const name = (key: RoleKey) => ORGANIZATION_ROLE_DEFINITIONS[key].name;
const CUSTOM = 'a custom role';

function build(options: { callerRole: string; memberRole: string; newRole: string }) {
  const roleByUser: Record<string, string> = {
    [callerId]: options.callerRole,
    [memberId]: options.memberRole,
  };
  const organizationMemberRepository = {
    getOrganizationMember: vi.fn().mockImplementation(async ({ userId }: { userId: string }) => ({
      userId,
      role: { id: `role-of-${userId}`, name: roleByUser[userId] },
    })),
  };
  const organizationUserRepository = {
    getOrganizationUsers: vi.fn().mockResolvedValue([{ userId: memberId }]),
    updateOrganizationUser: vi.fn(),
  };
  const organizationRoleRepository = {
    getOrganizationRoles: vi.fn().mockResolvedValue([{ roleId: newRoleId }]),
  };
  const roleRepository = {
    getRoles: vi.fn().mockResolvedValue({ roles: [{ id: newRoleId, name: options.newRole }] }),
  };
  const service = new OrganizationMemberService(
    organizationMemberRepository as never,
    organizationUserRepository as never,
    organizationRoleRepository as never,
    roleRepository as never,
    { userId: callerId } as never,
    { logUpdate: vi.fn() } as never,
    { publish: vi.fn() } as never
  );
  return { service, organizationUserRepository };
}

const changeRole = (service: OrganizationMemberService) =>
  service.updateOrganizationMember(memberId, {
    scope: { tenant: Tenant.Organization, id: organizationId },
    roleId: newRoleId,
  } as never);

describe('Member role changes require roles with a level', () => {
  it('refuses a new role that has no level', async () => {
    const { service, organizationUserRepository } = build({
      callerRole: name(RoleKey.OrganizationOwner),
      memberRole: name(RoleKey.OrganizationViewer),
      newRole: CUSTOM,
    });

    await expect(changeRole(service)).rejects.toBeInstanceOf(AuthorizationError);
    expect(organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
  });

  it('refuses a member whose current role has no level', async () => {
    const { service, organizationUserRepository } = build({
      callerRole: name(RoleKey.OrganizationOwner),
      memberRole: CUSTOM,
      newRole: name(RoleKey.OrganizationViewer),
    });

    await expect(changeRole(service)).rejects.toBeInstanceOf(AuthorizationError);
    expect(organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
  });

  it('refuses a caller whose own role has no level', async () => {
    const { service, organizationUserRepository } = build({
      callerRole: CUSTOM,
      memberRole: name(RoleKey.OrganizationViewer),
      newRole: name(RoleKey.OrganizationViewer),
    });

    await expect(changeRole(service)).rejects.toBeInstanceOf(AuthorizationError);
    expect(organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
  });

  it('refuses a standard role of equal level to the caller', async () => {
    const { service, organizationUserRepository } = build({
      callerRole: name(RoleKey.OrganizationAdmin),
      memberRole: name(RoleKey.OrganizationViewer),
      newRole: name(RoleKey.OrganizationAdmin),
    });

    await expect(changeRole(service)).rejects.toBeInstanceOf(AuthorizationError);
    expect(organizationUserRepository.updateOrganizationUser).not.toHaveBeenCalled();
  });

  it('passes a standard role of lower level for a member of lower level', async () => {
    const { service, organizationUserRepository } = build({
      callerRole: name(RoleKey.OrganizationAdmin),
      memberRole: name(RoleKey.OrganizationViewer),
      newRole: name(RoleKey.OrganizationDev),
    });

    await changeRole(service);

    expect(organizationUserRepository.updateOrganizationUser).toHaveBeenCalledWith(
      { organizationId, userId: memberId, roleId: newRoleId },
      undefined
    );
  });
});
