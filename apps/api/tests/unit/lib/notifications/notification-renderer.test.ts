import type { DomainEvent } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import type { NotificationDisplayContext } from '@/lib/notifications/notification-display-context';
import { renderNotification } from '@/lib/notifications/notification-renderer';

const baseEvent = {
  id: 'evt_1',
  sequence: 1,
  category: 'iam',
  deliveryClass: 'notification',
  scope: { tenant: 'organization', id: 'org_1' },
  actorUserId: 'user_actor',
  subjectUserId: 'user_subject',
  aggregate: { kind: 'userRole', id: 'ur_1' },
  data: {},
  occurredAt: new Date('2026-01-01T00:00:00.000Z'),
} as DomainEvent;

const ctx: NotificationDisplayContext = {
  actorName: 'Alice Admin',
  scopeName: 'Acme Corp',
  roleName: 'Developer',
  entityName: null,
};

describe('renderNotification', () => {
  it('includes role, actor, and scope for role assignment', () => {
    const rendered = renderNotification(
      { ...baseEvent, type: 'user.role_assigned', data: { after: { roleId: 'role_1' } } },
      ctx
    );
    expect(rendered.title).toBe('Role "Developer" assigned');
    expect(rendered.body).toBe(
      'You were assigned the role "Developer" by Alice Admin in Acme Corp.'
    );
  });

  it('uses project name when scope is a project workspace', () => {
    const rendered = renderNotification(
      { ...baseEvent, type: 'user.role_assigned', data: { after: { roleId: 'role_1' } } },
      { ...ctx, scopeName: 'Grant Demo' }
    );
    expect(rendered.body).toBe(
      'You were assigned the role "Developer" by Alice Admin in Grant Demo.'
    );
  });

  it('falls back when display context is empty', () => {
    const rendered = renderNotification({
      ...baseEvent,
      type: 'user.role_assigned',
      data: { after: { roleId: 'role_1' } },
    });
    expect(rendered.title).toBe('Role assigned');
    expect(rendered.body).toBe('A role was assigned to you.');
  });

  it('uses organization name for invitation', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'organization.invitation_sent',
        category: 'membership',
        aggregate: { kind: 'organizationInvitation', id: 'inv_1' },
      },
      { ...ctx, roleName: null }
    );
    expect(rendered.title).toBe('Invitation to Acme Corp');
    expect(rendered.body).toBe('You were invited to join Acme Corp by Alice Admin.');
  });
});
