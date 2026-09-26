import type { DomainEvent } from '@grantjs/schema';
import { EVENT_TYPES, Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { projectDomainEvent } from '@/lib/analytics/project-domain-event';

const PROJECTED = new Set<string>([
  'organization.invitation_sent',
  'organization.invitation_accepted',
  'api_key.created',
  'api_key.revoked',
  'user.mfa_enabled',
  'user.mfa_disabled',
  'user.password_changed',
  'project_sync.completed',
  'project_sync.failed',
]);

function domainEvent(overrides: Partial<DomainEvent> & Pick<DomainEvent, 'type'>): DomainEvent {
  return {
    id: 'evt-1',
    sequence: 1,
    category: 'security',
    deliveryClass: 'notification',
    scope: { tenant: Tenant.Organization, id: 'org-1' },
    actorUserId: 'actor-1',
    subjectUserId: 'subject-1',
    aggregate: { kind: 'organizationInvitation', id: 'inv-1' },
    data: {},
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('projectDomainEvent', () => {
  it('returns null for every catalog type outside the allowlist', () => {
    for (const type of EVENT_TYPES) {
      if (PROJECTED.has(type)) continue;
      expect(projectDomainEvent(domainEvent({ type }))).toBeNull();
    }
  });

  it('maps invitation, credential, mfa, password, and sync milestones', () => {
    expect(projectDomainEvent(domainEvent({ type: 'organization.invitation_sent' }))).toMatchObject(
      {
        name: 'invitation.sent',
        properties: { scopeTenant: Tenant.Organization, scopeId: 'org-1', actorId: 'actor-1' },
      }
    );
    expect(
      projectDomainEvent(domainEvent({ type: 'organization.invitation_accepted' }))?.name
    ).toBe('invitation.accepted');
    expect(projectDomainEvent(domainEvent({ type: 'api_key.created' }))?.name).toBe(
      'api_key.created'
    );
    expect(projectDomainEvent(domainEvent({ type: 'api_key.revoked' }))?.name).toBe(
      'api_key.revoked'
    );
    expect(projectDomainEvent(domainEvent({ type: 'user.mfa_enabled' }))?.properties).toMatchObject(
      { enabled: true }
    );
    expect(
      projectDomainEvent(domainEvent({ type: 'user.mfa_disabled' }))?.properties
    ).toMatchObject({ enabled: false });
    expect(
      projectDomainEvent(
        domainEvent({
          type: 'user.password_changed',
          data: { after: { reason: 'reset' } },
        })
      )?.properties
    ).toMatchObject({ reason: 'reset' });
    expect(
      projectDomainEvent(
        domainEvent({
          type: 'project_sync.completed',
          aggregate: { kind: 'project', id: 'proj-1' },
          data: { after: { operation: 'import', warningCount: 2 } },
        })
      )?.properties
    ).toMatchObject({
      result: 'completed',
      operation: 'import',
      projectId: 'proj-1',
    });
    expect(
      projectDomainEvent(
        domainEvent({
          type: 'project_sync.failed',
          aggregate: { kind: 'project', id: 'proj-1' },
          data: { after: { operation: 'export' } },
        })
      )?.properties
    ).toMatchObject({ result: 'failed', operation: 'export', projectId: 'proj-1' });
  });

  it('omits an unrecognized password reason', () => {
    const projected = projectDomainEvent(
      domainEvent({
        type: 'user.password_changed',
        data: { after: { reason: 'email-reset-link' } },
      })
    );
    expect(projected?.properties?.reason).toBeUndefined();
  });

  it('does not copy emails, client ids, names, or error text', () => {
    const leaked = {
      email: 'leak-email@example.com',
      clientId: 'leak-client-id',
      name: 'leak-key-name',
      errorMessage: 'leak-error-message',
    };

    for (const type of [
      'organization.invitation_sent',
      'api_key.created',
      'project_sync.failed',
      'user.password_changed',
    ] as const) {
      const projected = projectDomainEvent(
        domainEvent({
          type,
          aggregate: { kind: 'project', id: 'proj-1' },
          data: { after: { ...leaked, reason: 'change', operation: 'import' } },
        })
      );
      expect(JSON.stringify(projected)).not.toContain('leak-');
    }
  });

  it('omits actorId when the domain event has no actor', () => {
    const projected = projectDomainEvent(
      domainEvent({ type: 'api_key.revoked', actorUserId: null })
    );
    expect(projected?.properties?.actorId).toBeUndefined();
  });
});
