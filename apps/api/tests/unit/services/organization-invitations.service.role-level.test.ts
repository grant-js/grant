import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { OrganizationInvitationService } from '@/services/organization-invitations.service';

const organizationId = '10000000-0000-4000-8000-0000000000f5';
const callerId = '10000000-0000-4000-8000-0000000000f6';
const roleId = '10000000-0000-4000-8000-0000000000f7';

const name = (key: RoleKey) => ORGANIZATION_ROLE_DEFINITIONS[key].name;
const CUSTOM = 'a custom role';

function build(options: { callerRole: string; invitedRole: string }) {
  return new OrganizationInvitationService(
    {
      getOrganizationMember: vi.fn().mockResolvedValue({ role: { name: options.callerRole } }),
    } as never,
    {
      getRoles: vi.fn().mockResolvedValue({ roles: [{ id: roleId, name: options.invitedRole }] }),
    } as never,
    {} as never,
    {} as never,
    { userId: callerId } as never,
    {} as never,
    {} as never,
    {} as never
  );
}

describe('Invitations require roles with a level', () => {
  it('refuses an invitation with a role that has no level', async () => {
    const service = build({
      callerRole: name(RoleKey.OrganizationOwner),
      invitedRole: CUSTOM,
    });

    await expect(
      service.validateInvitationRolePermission(organizationId, roleId)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('refuses an invitation from an inviter whose own role has no level', async () => {
    const service = build({
      callerRole: CUSTOM,
      invitedRole: name(RoleKey.OrganizationViewer),
    });

    await expect(
      service.validateInvitationRolePermission(organizationId, roleId)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('refuses an invitation with a standard role of equal level', async () => {
    const service = build({
      callerRole: name(RoleKey.OrganizationAdmin),
      invitedRole: name(RoleKey.OrganizationAdmin),
    });

    await expect(
      service.validateInvitationRolePermission(organizationId, roleId)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('passes an invitation with a standard role of lower level', async () => {
    const service = build({
      callerRole: name(RoleKey.OrganizationAdmin),
      invitedRole: name(RoleKey.OrganizationDev),
    });

    await expect(
      service.validateInvitationRolePermission(organizationId, roleId)
    ).resolves.toBeUndefined();
  });
});
