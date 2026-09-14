import type { NotificationModel } from '@grantjs/database';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  composeNotificationEmail: vi.fn(),
  getNotificationEmailHtml: vi.fn(async () => '<html>branded</html>'),
  getNotificationEmailSubject: vi.fn((content: { subject: string }) => content.subject),
  getNotificationEmailText: vi.fn(() => 'plain text'),
}));

vi.mock('@/lib/transaction-manager.lib', () => ({
  DrizzleTransactionalConnection: class {
    constructor(_db: unknown) {}
    withTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn({});
    }
  },
}));

vi.mock('@/lib/notifications', () => ({
  composeNotificationEmail: mocks.composeNotificationEmail,
}));

vi.mock('@/lib/email/templates', () => ({
  getNotificationEmailHtml: mocks.getNotificationEmailHtml,
  getNotificationEmailSubject: mocks.getNotificationEmailSubject,
  getNotificationEmailText: mocks.getNotificationEmailText,
}));

import { NotificationDeliveryService } from '@/services/notification-delivery.service';

const composed = {
  subject: 'Role "Developer" created',
  heading: 'Role "Developer" created',
  summary: 'A role was created',
  details: [],
  ctaUrl: 'https://app.example.test/en/dashboard/notifications',
  ctaLabel: 'View in Grant',
  preferencesUrl: 'https://app.example.test/en/dashboard/settings/notifications',
  footer: 'footer',
};

function notification(overrides: Partial<NotificationModel> = {}): NotificationModel {
  return {
    id: 'n-1',
    eventId: '10000000-0000-4000-8000-000000000001',
    recipientUserId: 'user-1',
    category: 'iam',
    type: 'role.created',
    channel: 'email',
    title: 'Role created',
    body: 'A role was created',
    refEntity: 'role',
    refId: 'role-1',
    status: 'pending',
    seenAt: null,
    readAt: null,
    attemptCount: 0,
    nextRetryAt: null,
    errorDetails: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('NotificationDeliveryService', () => {
  const notifications = {
    claimDueEmail: vi.fn(),
    updateResult: vi.fn(),
  };
  const authMethods = { getEmailsByUserIds: vi.fn() };
  const email = { sendNotification: vi.fn() };
  const eventLog = { getByIds: vi.fn() };
  const displayContext = { resolve: vi.fn() };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

  const service = new NotificationDeliveryService(
    notifications as never,
    authMethods as never,
    email as never,
    eventLog as never,
    displayContext as never,
    {} as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.composeNotificationEmail.mockReturnValue(composed);
    notifications.updateResult.mockResolvedValue(undefined);
    email.sendNotification.mockResolvedValue(undefined);
    displayContext.resolve.mockResolvedValue({
      actorName: 'Alice',
      scopeName: 'Acme',
      roleName: null,
      entityName: 'Developer',
      permissionName: null,
      groupName: null,
      subjectName: null,
    });
  });

  it('sends branded html and text for claimed email notifications', async () => {
    notifications.claimDueEmail.mockResolvedValue([notification()]);
    authMethods.getEmailsByUserIds.mockResolvedValue(new Map([['user-1', 'user@example.test']]));
    eventLog.getByIds.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000001',
        sequence: 1,
        type: 'role.created',
        category: 'iam',
        deliveryClass: 'notification',
        scopeTenant: Tenant.Organization,
        scopeId: 'org-1',
        actorUserId: 'actor-1',
        subjectUserId: null,
        payload: {
          aggregate: { kind: 'role', id: 'role-1' },
          data: { after: { name: 'Developer' } },
        },
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        relayStatus: 'dispatched',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const delivered = await service.drain(logger as never);

    expect(delivered).toBe(1);
    expect(email.sendNotification).toHaveBeenCalledWith({
      to: 'user@example.test',
      subject: 'Role "Developer" created',
      text: 'plain text',
      html: '<html>branded</html>',
    });
    expect(notifications.updateResult).toHaveBeenCalledWith(
      'n-1',
      expect.objectContaining({ status: 'delivered' })
    );
  });

  it('still sends branded html when event_log is missing', async () => {
    notifications.claimDueEmail.mockResolvedValue([notification()]);
    authMethods.getEmailsByUserIds.mockResolvedValue(new Map([['user-1', 'user@example.test']]));
    eventLog.getByIds.mockResolvedValue([]);

    await service.drain(logger as never);

    expect(mocks.composeNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        event: null,
        fallbackTitle: 'Role created',
        fallbackBody: 'A role was created',
      })
    );
    expect(email.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ html: '<html>branded</html>' })
    );
  });
});
