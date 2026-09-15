import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const email = JSON.parse(
    readFileSync(join(process.cwd(), '../../packages/@grantjs/i18n/locales/en/email.json'), 'utf8')
  ) as Record<string, unknown>;

  function lookup(obj: unknown, parts: string[]): unknown {
    let current = obj;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  return {
    defaultLocale: 'en' as const,
    translateStatic: (key: string, _locale?: string, params?: Record<string, unknown>) => {
      const rest = key.startsWith('email.') ? key.slice('email.'.length) : key;
      const value = lookup(email, rest.split('.'));
      let str = typeof value === 'string' ? value : key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replaceAll(`{{${k}}}`, String(v ?? ''));
        }
      }
      return str;
    },
  };
});

vi.mock('@/config', () => ({
  config: { security: { frontendUrl: 'https://app.example.test' } },
}));

import type { NotificationDisplayContext } from '@/lib/notifications/notification-display-context';
import { composeNotificationEmail } from '@/lib/notifications/notification-email-composer';

const ctx: NotificationDisplayContext = {
  actorName: 'Alice Admin',
  scopeName: 'Acme Corp',
  roleName: 'Developer',
  entityName: 'Developer',
  permissionName: 'Read users',
  groupName: 'Editors',
  subjectName: 'Bob Member',
};

function event(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: 'evt-1',
    sequence: 1,
    type: 'role.created',
    category: 'iam',
    deliveryClass: 'notification',
    scope: { tenant: Tenant.Organization, id: 'org-1' },
    actorUserId: 'actor-1',
    subjectUserId: 'subject-1',
    aggregate: { kind: 'role', id: 'role-1' },
    data: { after: { name: 'Developer' } },
    occurredAt: new Date('2026-01-14T12:00:00.000Z'),
    ...overrides,
  } as DomainEvent;
}

describe('composeNotificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('composes named-entity copy with details and a Grant CTA', () => {
    const composed = composeNotificationEmail({
      event: event(),
      ctx,
      recipientUserId: 'owner-1',
      refEntity: 'role',
      refId: 'role-1',
      fallbackTitle: 'Role created',
      fallbackBody: null,
    });

    expect(composed.subject).toBe('Role "Developer" created');
    expect(composed.summary).toContain('Role "Developer" was created by Alice Admin in Acme Corp.');
    expect(composed.details.map((row) => row.label)).toEqual(
      expect.arrayContaining(['When', 'Actor', 'Workspace', 'Entity', 'Role'])
    );
    expect(composed.ctaUrl).toBe(
      'https://app.example.test/en/dashboard/organizations/org-1/roles/role-1'
    );
    expect(composed.preferencesUrl).toContain('/dashboard/settings/notifications');
  });

  it('uses observer copy for subject assignments', () => {
    const composed = composeNotificationEmail({
      event: event({
        type: 'user.role_assigned',
        aggregate: { kind: 'userRole', id: 'ur-1' },
        data: { after: { roleId: 'role-1' } },
      }),
      ctx,
      recipientUserId: 'owner-1',
      refEntity: 'userRole',
      refId: 'ur-1',
      fallbackTitle: 'Role assigned',
      fallbackBody: null,
    });

    expect(composed.summary).toContain('Bob Member was assigned the role "Developer"');
    expect(
      composed.details.some((row) => row.label === 'Member' && row.value === 'Bob Member')
    ).toBe(true);
  });

  it('falls back to stored title/body when the event is missing', () => {
    const composed = composeNotificationEmail({
      event: null,
      ctx: {
        actorName: null,
        scopeName: null,
        roleName: null,
        entityName: null,
        permissionName: null,
        groupName: null,
        subjectName: null,
      },
      recipientUserId: 'user-1',
      refEntity: null,
      refId: null,
      fallbackTitle: 'Stored title',
      fallbackBody: 'Stored body',
    });

    expect(composed.subject).toBe('Stored title');
    expect(composed.summary).toBe('Stored body');
    expect(composed.ctaUrl).toBe('https://app.example.test/en/dashboard/notifications');
  });
});
