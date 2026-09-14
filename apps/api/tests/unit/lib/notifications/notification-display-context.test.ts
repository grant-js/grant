import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationDisplayContextResolver } from '@/lib/notifications/notification-display-context';

const mockGetFixedT = vi.fn();
vi.mock('@/i18n', () => ({
  translateStatic: (key: string, locale?: string) => mockGetFixedT(locale)(key),
}));

function event(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: 'evt-1',
    sequence: 1,
    type: 'user.role_assigned',
    category: 'iam',
    deliveryClass: 'notification',
    scope: { tenant: Tenant.Account, id: 'acct-1' },
    actorUserId: null,
    subjectUserId: 'user-1',
    data: {},
    occurredAt: new Date(),
    ...overrides,
  } as DomainEvent;
}

describe('NotificationDisplayContextResolver', () => {
  const users = { getUsers: vi.fn() };
  const organizations = { getOrganizations: vi.fn() };
  const accounts = { getAccounts: vi.fn() };
  const projects = { getProjects: vi.fn() };
  const roles = { getRoles: vi.fn() };
  const permissions = { getPermissions: vi.fn() };
  const groups = { getGroups: vi.fn() };

  const resolver = new NotificationDisplayContextResolver(
    users as never,
    organizations as never,
    accounts as never,
    projects as never,
    roles as never,
    permissions as never,
    groups as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
    users.getUsers.mockResolvedValue({ users: [] });
    accounts.getAccounts.mockResolvedValue({ accounts: [{ id: 'acct-1' }] });
    permissions.getPermissions.mockResolvedValue({ permissions: [] });
    groups.getGroups.mockResolvedValue({ groups: [] });
    mockGetFixedT.mockReturnValue((key: string) => `translated:${key}`);
  });

  it('translates a system role name looked up from the repository', async () => {
    roles.getRoles.mockResolvedValue({ roles: [{ name: 'roles.names.personalAccountOwner' }] });
    const ctx = await resolver.resolve(event({ data: { after: { roleId: 'role-1' } } }));
    expect(ctx.roleName).toBe('translated:common.roles.names.personalAccountOwner');
    expect(mockGetFixedT).toHaveBeenCalledWith(undefined);
  });

  it('translates a system role name carried on the event payload', async () => {
    const ctx = await resolver.resolve(
      event({ data: { after: { roleName: 'roles.names.organizationAccountOwner' } } })
    );
    expect(ctx.roleName).toBe('translated:common.roles.names.organizationAccountOwner');
    expect(roles.getRoles).not.toHaveBeenCalled();
  });

  it('leaves a custom role name untouched', async () => {
    roles.getRoles.mockResolvedValue({ roles: [{ name: 'Grants Reviewer' }] });
    const ctx = await resolver.resolve(event({ data: { after: { roleId: 'role-2' } } }));
    expect(ctx.roleName).toBe('Grants Reviewer');
    expect(mockGetFixedT).not.toHaveBeenCalled();
  });

  it('returns null when neither payload nor lookup has a role', async () => {
    roles.getRoles.mockResolvedValue({ roles: [] });
    const ctx = await resolver.resolve(event({ data: {} }));
    expect(ctx.roleName).toBeNull();
  });

  it('resolves permission, group, actor, and subject names', async () => {
    users.getUsers.mockResolvedValue({
      users: [
        { id: 'actor-1', name: 'Alice Admin' },
        { id: 'user-1', name: 'Bob Member' },
      ],
    });
    permissions.getPermissions.mockResolvedValue({
      permissions: [{ name: 'Read users' }],
    });
    groups.getGroups.mockResolvedValue({ groups: [{ name: 'Editors' }] });
    roles.getRoles.mockResolvedValue({ roles: [] });

    const ctx = await resolver.resolve(
      event({
        actorUserId: 'actor-1',
        data: { after: { permissionId: 'perm-1', groupId: 'group-1' } },
      })
    );

    expect(ctx.actorName).toBe('Alice Admin');
    expect(ctx.subjectName).toBe('Bob Member');
    expect(ctx.permissionName).toBe('Read users');
    expect(ctx.groupName).toBe('Editors');
  });
});
