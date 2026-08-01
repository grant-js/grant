import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationGeneratorConsumer } from '@/lib/notifications/notification-generator.consumer';

vi.mock('@/lib/notifications/notification-renderer', () => ({
  renderNotification: () => ({
    title: 'Role assigned',
    body: 'You were assigned a role',
    refEntity: 'userRole',
    refId: 'role-1',
  }),
}));

vi.mock('@/lib/notifications/notification-preferences.lib', () => ({
  resolvePreferenceEnabled: () => true,
}));

function event(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: 'evt-1',
    sequence: 1,
    type: 'user.role_assigned',
    category: 'iam',
    deliveryClass: 'notification',
    scope: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
    actorUserId: 'actor-1',
    subjectUserId: 'subject-1',
    data: {},
    occurredAt: new Date(),
    ...overrides,
  } as DomainEvent;
}

describe('NotificationGeneratorConsumer link eligibility', () => {
  const audience = { resolve: vi.fn() };
  const preferences = { getForResolution: vi.fn() };
  const notifications = { upsert: vi.fn() };
  const displayContext = { resolve: vi.fn() };
  const organizationUsers = { getOrganizationUsers: vi.fn() };
  const projectUsers = { getProjectUsers: vi.fn() };

  const consumer = new NotificationGeneratorConsumer(
    audience as never,
    preferences as never,
    notifications as never,
    displayContext as never,
    organizationUsers as never,
    projectUsers as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
    preferences.getForResolution.mockResolvedValue([]);
    displayContext.resolve.mockResolvedValue({});
    notifications.upsert.mockResolvedValue(undefined);
  });

  it('keeps aggregate refs for org members and remaps project members to projectMembership', async () => {
    audience.resolve.mockResolvedValue(['org-member', 'project-only']);
    organizationUsers.getOrganizationUsers.mockResolvedValue([{ userId: 'org-member' }]);
    projectUsers.getProjectUsers.mockResolvedValue([
      { userId: 'org-member' },
      { userId: 'project-only' },
    ]);

    await consumer.process(event());

    const upserts = notifications.upsert.mock.calls.map((call) => call[0]);
    const orgMemberInApp = upserts.find(
      (row) => row.recipientUserId === 'org-member' && row.channel === 'in_app'
    );
    const projectOnlyInApp = upserts.find(
      (row) => row.recipientUserId === 'project-only' && row.channel === 'in_app'
    );

    expect(orgMemberInApp).toMatchObject({
      refEntity: 'userRole',
      refId: 'role-1',
    });
    expect(projectOnlyInApp).toMatchObject({
      refEntity: 'projectMembership',
      refId: 'proj-1',
    });
  });

  it('nulls refs for personal project recipients who are not project members', async () => {
    audience.resolve.mockResolvedValue(['outsider']);
    organizationUsers.getOrganizationUsers.mockResolvedValue([]);
    projectUsers.getProjectUsers.mockResolvedValue([]);

    await consumer.process(
      event({
        scope: { tenant: Tenant.AccountProject, id: 'acct-1:proj-2' },
      })
    );

    const upsert = notifications.upsert.mock.calls.find(
      (call) => call[0].channel === 'in_app'
    )?.[0];
    expect(upsert).toMatchObject({
      recipientUserId: 'outsider',
      refEntity: null,
      refId: null,
    });
  });

  it('uses projectMembership refs for personal project members', async () => {
    audience.resolve.mockResolvedValue(['member-1']);
    organizationUsers.getOrganizationUsers.mockResolvedValue([]);
    projectUsers.getProjectUsers.mockResolvedValue([{ userId: 'member-1' }]);

    await consumer.process(
      event({
        scope: { tenant: Tenant.AccountProject, id: 'acct-1:proj-2' },
      })
    );

    const upsert = notifications.upsert.mock.calls.find(
      (call) => call[0].channel === 'in_app'
    )?.[0];
    expect(upsert).toMatchObject({
      refEntity: 'projectMembership',
      refId: 'proj-2',
    });
  });
});
