import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EVENT_CATALOG, EVENT_TYPES, isKnownEventType } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

const SERVICES_DIR = join(__dirname, '../../../../src/services');

/** Extract every event type passed to `this.events.publish({ type: '...' })`. */
function collectEmittedEventTypes(): string[] {
  const types = new Set<string>();
  const publishRe = /events\.publish\(\s*\{\s*type:\s*'([^']+)'/g;

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
      expect(entry.audienceRule.primitives.length).toBeGreaterThan(0);
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
    expect(emitted.has('api_key.revoked')).toBe(true);
    expect(emitted.has('user.role_assigned')).toBe(true);
    expect(emitted.has('user.role_revoked')).toBe(true);
  });
});
