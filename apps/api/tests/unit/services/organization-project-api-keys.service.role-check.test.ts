import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { OrganizationProjectApiKeyService } from '@/services/organization-project-api-keys.service';

const organizationId = '10000000-0000-4000-8000-0000000000b1';
const projectId = '10000000-0000-4000-8000-0000000000b2';
const apiKeyId = '10000000-0000-4000-8000-0000000000b3';
const roleId = '10000000-0000-4000-8000-0000000000b4';
const userId = '10000000-0000-4000-8000-0000000000b5';

const name = (key: RoleKey) => ORGANIZATION_ROLE_DEFINITIONS[key].name;

function build(options: { callerRole: string; targetRole: string }) {
  const organizationMemberRepository = {
    getOrganizationMember: vi.fn().mockResolvedValue({ role: { name: options.callerRole } }),
  };
  const organizationProjectApiKeyRepository = {
    getByApiKeyAndOrganizationAndProject: vi.fn().mockResolvedValue({
      id: '10000000-0000-4000-8000-0000000000b6',
      organizationId,
      projectId,
      apiKeyId,
      organizationRoleId: roleId,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  };
  const roleRepository = {
    getRoles: vi.fn().mockResolvedValue({ roles: [{ id: roleId, name: options.targetRole }] }),
  };
  const service = new OrganizationProjectApiKeyService(
    organizationMemberRepository as never,
    {} as never,
    {} as never,
    organizationProjectApiKeyRepository as never,
    roleRepository as never,
    { userId } as never,
    {} as never
  );
  return service;
}

describe('OrganizationProjectApiKeyService role check', () => {
  describe('creating a key', () => {
    it('refuses a role outside the standard organization roles', async () => {
      const service = build({
        callerRole: name(RoleKey.OrganizationDev),
        targetRole: 'a custom role',
      });

      await expect(
        service.validateOrganizationProjectApiKeyRolePermission(organizationId, roleId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('refuses a role outside the standard organization roles for the highest standard caller', async () => {
      const service = build({
        callerRole: name(RoleKey.OrganizationOwner),
        targetRole: 'a custom role',
      });

      await expect(
        service.validateOrganizationProjectApiKeyRolePermission(organizationId, roleId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('refuses a caller whose own role is not a standard organization role', async () => {
      const service = build({
        callerRole: 'a custom role',
        targetRole: name(RoleKey.OrganizationViewer),
      });

      await expect(
        service.validateOrganizationProjectApiKeyRolePermission(organizationId, roleId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it.each([
      [RoleKey.OrganizationDev, RoleKey.OrganizationDev],
      [RoleKey.OrganizationDev, RoleKey.OrganizationAdmin],
    ])(
      'refuses a standard role of equal or higher level (%s creating %s)',
      async (caller, target) => {
        const service = build({ callerRole: name(caller), targetRole: name(target) });

        await expect(
          service.validateOrganizationProjectApiKeyRolePermission(organizationId, roleId)
        ).rejects.toBeInstanceOf(AuthorizationError);
      }
    );

    it('passes a standard role of lower level', async () => {
      const service = build({
        callerRole: name(RoleKey.OrganizationDev),
        targetRole: name(RoleKey.OrganizationViewer),
      });

      await expect(
        service.validateOrganizationProjectApiKeyRolePermission(organizationId, roleId)
      ).resolves.toBeUndefined();
    });
  });

  describe('managing a key (rotate, revoke, delete)', () => {
    it('refuses a key whose role is outside the standard organization roles', async () => {
      const service = build({
        callerRole: name(RoleKey.OrganizationOwner),
        targetRole: 'a custom role',
      });

      await expect(
        service.validateCanManageOrganizationProjectApiKey(organizationId, projectId, apiKeyId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('refuses a key whose standard role is of equal or higher level', async () => {
      const service = build({
        callerRole: name(RoleKey.OrganizationDev),
        targetRole: name(RoleKey.OrganizationAdmin),
      });

      await expect(
        service.validateCanManageOrganizationProjectApiKey(organizationId, projectId, apiKeyId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('passes a key whose standard role is of lower level', async () => {
      const service = build({
        callerRole: name(RoleKey.OrganizationAdmin),
        targetRole: name(RoleKey.OrganizationDev),
      });

      await expect(
        service.validateCanManageOrganizationProjectApiKey(organizationId, projectId, apiKeyId)
      ).resolves.toBeUndefined();
    });
  });
});
