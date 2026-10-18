import type { EventLogModel } from '@grantjs/database';
import { describe, expect, it } from 'vitest';

import { mapEventLogToDomainEvent } from '@/lib/events/event-log-mapper.lib';

const projectId = '10000000-0000-4000-8000-0000000000a1';

const row = (payload: unknown): EventLogModel =>
  ({
    id: 'e-1',
    sequence: 7,
    type: 'role.updated',
    category: 'iam',
    deliveryClass: 'notification',
    scopeTenant: 'organization',
    scopeId: 'org-1',
    actorUserId: null,
    subjectUserId: null,
    payload,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    relayStatus: 'pending',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }) as EventLogModel;

describe('mapEventLogToDomainEvent project ids', () => {
  it('carries the recorded project ids onto the domain event', () => {
    const event = mapEventLogToDomainEvent(
      row({ aggregate: { kind: 'role', id: 'r-1' }, data: {}, projectIds: [projectId] })
    );

    expect(event.projectIds).toEqual([projectId]);
    expect(event.scope).toEqual({ tenant: 'organization', id: 'org-1' });
  });

  it('leaves the key off for a payload written before ADR 0012, or with no projects', () => {
    expect(mapEventLogToDomainEvent(row({ data: {} }))).not.toHaveProperty('projectIds');
    expect(mapEventLogToDomainEvent(row({ data: {}, projectIds: [] }))).not.toHaveProperty(
      'projectIds'
    );
  });
});
