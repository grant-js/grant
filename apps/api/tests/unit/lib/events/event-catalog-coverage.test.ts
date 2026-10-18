import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EVENT_CATALOG, EVENT_TYPES, isKnownEventType } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

const SERVICES_DIR = join(__dirname, '../../../../src/services');

/**
 * Extract every event type passed to `this.events.publish({ type: '...' })`, or built by
 * the tag pivot helper: `this.events.publish(tagLinkEvent('tag.linked', ...))`.
 */
function collectEmittedEventTypes(): string[] {
  const types = new Set<string>();
  const publishRe =
    /(?:events\.publish\(\s*\{\s*type:|events\.publish\(\s*tagLinkEvent\(\s*)\s*'([^']+)'/g;

  for (const file of readdirSync(SERVICES_DIR)) {
    if (!file.endsWith('.service.ts')) continue;
    const source = readFileSync(join(SERVICES_DIR, file), 'utf8');
    let match: RegExpExecArray | null;
    while ((match = publishRe.exec(source)) !== null) {
      types.add(match[1]);
    }
  }

  return [...types];
}

describe('event catalog coverage', () => {
  it('every catalog entry has a valid category and delivery class', () => {
    for (const type of EVENT_TYPES) {
      const entry = EVENT_CATALOG[type];
      expect(entry).toBeDefined();
      expect(['security', 'iam', 'membership', 'integrations']).toContain(entry.category);
      expect(['transactional', 'notification']).toContain(entry.deliveryClass);
      // An empty audience is how a webhook-only event stays out of the notification
      // generator; it is only allowed for transactional entries.
      if (entry.audienceRule.primitives.length === 0) {
        expect(entry.deliveryClass, `${type} has no audience`).toBe('transactional');
      }
    }
  });

  it('keeps the webhook-only lifecycle events out of notifications', () => {
    const webhookOnly = [
      'user.created',
      'user.updated',
      'user.deleted',
      'project.user_updated',
      'api_key.deleted',
      'tag.created',
      'tag.updated',
      'tag.deleted',
      'tag.linked',
      'tag.unlinked',
    ] as const;

    for (const type of webhookOnly) {
      expect(EVENT_CATALOG[type].audienceRule.primitives, type).toEqual([]);
      expect(EVENT_CATALOG[type].deliveryClass, type).toBe('transactional');
    }
    // Every other entry still names who is told.
    const others = EVENT_TYPES.filter((type) => !(webhookOnly as readonly string[]).includes(type));
    for (const type of others) {
      expect(EVENT_CATALOG[type].audienceRule.primitives.length, type).toBeGreaterThan(0);
    }
  });

  it('every event type emitted by a service is registered in the catalog', () => {
    const emitted = collectEmittedEventTypes();
    // Sanity: the first slice should actually emit something.
    expect(emitted.length).toBeGreaterThan(0);

    for (const type of emitted) {
      expect(isKnownEventType(type), `event type "${type}" is not in EVENT_CATALOG`).toBe(true);
    }
  });

  it('emits the Phase 1 IAM slice', () => {
    const emitted = new Set(collectEmittedEventTypes());
    expect(emitted.has('role.created')).toBe(true);
    expect(emitted.has('permission.updated')).toBe(true);
    expect(emitted.has('api_key.created')).toBe(true);
    expect(emitted.has('api_key.rotated')).toBe(true);
    expect(emitted.has('api_key.revoked')).toBe(true);
    expect(emitted.has('user.role_assigned')).toBe(true);
    expect(emitted.has('user.role_revoked')).toBe(true);
  });

  it('emits project sync summary events from the job service', () => {
    const emitted = new Set(collectEmittedEventTypes());
    expect(emitted.has('project_sync.completed')).toBe(true);
    expect(emitted.has('project_sync.failed')).toBe(true);
  });

  it('emits the IAM transparency slice 2 CRUD and assignment events', () => {
    const emitted = new Set(collectEmittedEventTypes());
    const slice2 = [
      'role.updated',
      'role.deleted',
      'permission.created',
      'permission.deleted',
      'group.created',
      'group.updated',
      'group.deleted',
      'resource.created',
      'resource.updated',
      'resource.deleted',
      'role.permission_assigned',
      'role.permission_revoked',
      'user.permission_assigned',
      'user.permission_revoked',
      'group.permission_assigned',
      'group.permission_revoked',
      'role.group_assigned',
      'role.group_revoked',
      'user.group_assigned',
      'user.group_revoked',
    ] as const;

    for (const type of slice2) {
      expect(emitted.has(type), `expected service emit for "${type}"`).toBe(true);
    }
  });

  it('emits the membership lifecycle slice 3 events', () => {
    const emitted = new Set(collectEmittedEventTypes());
    const slice3 = [
      'organization.invitation_accepted',
      'organization.invitation_revoked',
      'organization.member_added',
      'organization.member_role_changed',
      'organization.member_removed',
      'project.user_added',
      'project.user_removed',
      'project.user_profile_updated',
    ] as const;

    for (const type of slice3) {
      expect(emitted.has(type), `expected service emit for "${type}"`).toBe(true);
    }
  });

  it('emits the cascade and lifecycle events', () => {
    const emitted = new Set(collectEmittedEventTypes());
    const lifecycle = [
      'user.created',
      'user.updated',
      'user.deleted',
      'project.user_updated',
      'api_key.deleted',
      'tag.created',
      'tag.updated',
      'tag.deleted',
      'tag.linked',
      'tag.unlinked',
    ] as const;

    for (const type of lifecycle) {
      expect(emitted.has(type), `expected service emit for "${type}"`).toBe(true);
    }
  });

  it('emits the security lifecycle slice events', () => {
    const emitted = new Set(collectEmittedEventTypes());
    const securitySlice = [
      'signing_key.created',
      'signing_key.rotated',
      'user.mfa_enabled',
      'user.mfa_disabled',
      'user.mfa_recovery_codes_regenerated',
      'user.session_revoked',
      'user.sessions_revoked',
      'user.password_changed',
    ] as const;

    for (const type of securitySlice) {
      expect(emitted.has(type), `expected service emit for "${type}"`).toBe(true);
    }
  });
});
