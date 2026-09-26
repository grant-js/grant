import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationHandler } from '@/handlers/organizations.handler';

const trackProductEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/analytics', () => ({
  trackProductEventAfterCommit: (_schedule: unknown, event: unknown) => trackProductEvent(event),
}));

const ownerName = ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationOwner].name;

const mockOrganizations = { createOrganization: vi.fn() };
const mockOrganizationRoles = { seedOrganizationRoles: vi.fn() };
const mockOrganizationUsers = { addOrganizationUser: vi.fn() };
const callOrder: string[] = [];
const mockDb = {
  withTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    callOrder.push('tx-start');
    try {
      return await fn({});
    } finally {
      callOrder.push('tx-commit');
    }
  }),
};

function createHandler(): OrganizationHandler {
  return new OrganizationHandler(
    mockOrganizations as never,
    mockOrganizationRoles as never,
    mockOrganizationUsers as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    mockDb as never
  );
}

describe('OrganizationHandler createOrganization analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;
    trackProductEvent.mockImplementation(() => {
      callOrder.push('track');
    });
    mockOrganizations.createOrganization.mockResolvedValue({ id: 'org-1', name: 'Acme' });
    mockOrganizationRoles.seedOrganizationRoles.mockResolvedValue([
      { role: { id: 'role-1', name: ownerName } },
    ]);
    mockOrganizationUsers.addOrganizationUser.mockResolvedValue(undefined);
  });

  it('emits organization.created only after the transaction resolves', async () => {
    const handler = createHandler();
    const created = await handler.createOrganization(
      { input: { name: 'Acme' } } as never,
      'user-1'
    );

    expect(created).toMatchObject({ id: 'org-1' });
    expect(callOrder).toEqual(['tx-start', 'tx-commit', 'track']);
    expect(trackProductEvent).toHaveBeenCalledWith({
      name: 'organization.created',
      properties: {
        actorId: 'user-1',
        scopeTenant: Tenant.Organization,
        scopeId: 'org-1',
      },
    });
    expect(JSON.stringify(trackProductEvent.mock.calls)).not.toContain('Acme');
  });

  it('does not emit when the transaction fails', async () => {
    mockOrganizations.createOrganization.mockRejectedValue(new Error('db down'));
    const handler = createHandler();

    await expect(
      handler.createOrganization({ input: { name: 'Acme' } } as never, 'user-1')
    ).rejects.toThrow('db down');
    expect(trackProductEvent).not.toHaveBeenCalled();
  });
});
