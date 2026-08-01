import type { NotificationPreferenceModel } from '@grantjs/database';
import { describe, expect, it } from 'vitest';

import {
  categoryChannelDefault,
  isLockedCategory,
  resolvePreferenceEnabled,
} from '@/lib/notifications/notification-preferences.lib';

function pref(overrides: Partial<NotificationPreferenceModel>): NotificationPreferenceModel {
  return {
    id: 'p',
    userId: 'u',
    scopeTenant: 'organization',
    scopeId: '',
    category: 'iam',
    channel: 'email',
    enabled: true,
    source: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as NotificationPreferenceModel;
}

describe('resolvePreferenceEnabled', () => {
  it('security is always enabled and locked', () => {
    expect(isLockedCategory('security')).toBe(true);
    expect(
      resolvePreferenceEnabled({
        category: 'security',
        channel: 'email',
        scopeId: 'org1',
        rows: [pref({ category: 'security', enabled: false, source: 'user' })],
      })
    ).toBe(true);
  });

  it('org_enforced wins over user preferences', () => {
    expect(
      resolvePreferenceEnabled({
        category: 'iam',
        channel: 'email',
        scopeId: 'org1',
        rows: [
          pref({ source: 'org_enforced', enabled: false }),
          pref({ source: 'user', scopeId: 'org1', enabled: true }),
        ],
      })
    ).toBe(false);
  });

  it('scope-specific user preference wins over global user preference', () => {
    expect(
      resolvePreferenceEnabled({
        category: 'iam',
        channel: 'email',
        scopeId: 'org1',
        rows: [
          pref({ source: 'user', scopeId: '', enabled: true }),
          pref({ source: 'user', scopeId: 'org1', enabled: false }),
        ],
      })
    ).toBe(false);
  });

  it('falls back to the category default when no rows match', () => {
    expect(
      resolvePreferenceEnabled({ category: 'iam', channel: 'email', scopeId: 'org1', rows: [] })
    ).toBe(categoryChannelDefault('iam', 'email'));
    expect(categoryChannelDefault('iam', 'in_app')).toBe(true);
    expect(categoryChannelDefault('iam', 'email')).toBe(false);
  });
});
