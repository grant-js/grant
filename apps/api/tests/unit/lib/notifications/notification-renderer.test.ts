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

  it('renders project_sync.completed for import', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'project_sync.completed',
        category: 'integrations',
        aggregate: { kind: 'project', id: 'proj_1' },
        data: { after: { operation: 'import', jobId: 'job_1' } },
      },
      { ...ctx, scopeName: 'Grant Demo', roleName: null }
    );
    expect(rendered.title).toBe('Project sync completed');
    expect(rendered.body).toBe('CDM import completed in Grant Demo.');
  });

  it('renders api_key.rotated with key name', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'api_key.rotated',
        category: 'security',
        aggregate: { kind: 'apiKey', id: 'key_1' },
        data: { after: { name: 'CI Bot' } },
      },
      { ...ctx, roleName: null, entityName: null }
    );
    expect(rendered.title).toBe('API key "CI Bot" rotated');
    expect(rendered.body).toBe('API key "CI Bot" was rotated by Alice Admin in Acme Corp.');
  });

  it('renders role.updated with entity name', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'role.updated',
        aggregate: { kind: 'role', id: 'role_1' },
        data: { after: { name: 'Developer' } },
      },
      { ...ctx, roleName: null, entityName: 'Developer' }
    );
    expect(rendered.title).toBe('Role "Developer" updated');
    expect(rendered.body).toBe('Role "Developer" was updated by Alice Admin in Acme Corp.');
  });

  it('renders role.permission_assigned for a role link', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'role.permission_assigned',
        aggregate: { kind: 'rolePermission', id: 'rp_1' },
        data: { after: { roleId: 'role_1', permissionId: 'perm_1' } },
      },
      { ...ctx, roleName: null, entityName: null }
    );
    expect(rendered.title).toBe('Permission assigned');
    expect(rendered.body).toBe('A permission was assigned to a role by Alice Admin in Acme Corp.');
  });

  it('renders user.group_assigned for the subject', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'user.group_assigned',
        aggregate: { kind: 'userGroup', id: 'ug_1' },
        data: { after: { userId: 'user_subject', groupId: 'group_1' } },
      },
      { ...ctx, roleName: null, entityName: null }
    );
    expect(rendered.title).toBe('Group assigned');
    expect(rendered.body).toBe('A group was assigned to you by Alice Admin in Acme Corp.');
  });

  it('renders organization.invitation_accepted', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'organization.invitation_accepted',
        category: 'membership',
        aggregate: { kind: 'organizationInvitation', id: 'inv_1' },
      },
      { ...ctx, roleName: null }
    );
    expect(rendered.title).toBe('Invitation accepted — Acme Corp');
    expect(rendered.body).toBe('An invitation to Acme Corp was accepted by Alice Admin.');
  });

  it('renders organization.member_removed', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'organization.member_removed',
        category: 'membership',
        aggregate: { kind: 'organizationMember', id: 'org_1:user_subject' },
      },
      { ...ctx, roleName: null }
    );
    expect(rendered.title).toBe('Member removed');
    expect(rendered.body).toBe('A member was removed by Alice Admin in Acme Corp.');
  });

  it('renders project.user_added', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'project.user_added',
        category: 'membership',
        aggregate: { kind: 'projectUser', id: 'pu_1' },
      },
      { ...ctx, scopeName: 'Grant Demo', roleName: null }
    );
    expect(rendered.title).toBe('Project member added');
    expect(rendered.body).toBe('A member was added to the project by Alice Admin in Grant Demo.');
  });

  it('renders user.mfa_enabled', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'user.mfa_enabled',
        category: 'security',
        aggregate: { kind: 'userMfaFactor', id: 'factor_1' },
      },
      { ...ctx, roleName: null }
    );
    expect(rendered.title).toBe('MFA enabled');
    expect(rendered.body).toBe(
      'Multi-factor authentication was enabled on your account by Alice Admin.'
    );
  });

  it('renders user.session_revoked', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'user.session_revoked',
        category: 'security',
        aggregate: { kind: 'userSession', id: 'sess_1' },
      },
      { ...ctx, roleName: null }
    );
    expect(rendered.title).toBe('Session revoked');
    expect(rendered.body).toBe('A session was revoked on your account by Alice Admin.');
  });

  it('renders user.password_changed', () => {
    const rendered = renderNotification(
      {
        ...baseEvent,
        type: 'user.password_changed',
        category: 'security',
        aggregate: { kind: 'userAuthenticationMethod', id: 'uam_1' },
      },
      { ...ctx, roleName: null }
    );
    expect(rendered.title).toBe('Password changed');
    expect(rendered.body).toBe('Your password was changed by Alice Admin.');
  });
});
