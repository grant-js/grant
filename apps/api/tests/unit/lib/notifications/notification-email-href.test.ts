import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config', () => ({
  config: { security: { frontendUrl: 'https://app.example.test' } },
}));

vi.mock('@/i18n', () => ({
  defaultLocale: 'en',
}));

import {
  absoluteFrontendUrl,
  buildNotificationDashboardPath,
  buildNotificationInboxPath,
  buildNotificationPreferencesPath,
} from '@/lib/notifications/notification-email-href';

describe('notification email href', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mirrors web deep-links for org project roles', () => {
    expect(
      buildNotificationDashboardPath({
        refEntity: 'role',
        refId: 'role-1',
        scope: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
      })
    ).toBe('/dashboard/organizations/org-1/projects/proj-1/roles/role-1');
  });

  it('never builds personal account project admin hrefs', () => {
    expect(
      buildNotificationDashboardPath({
        refEntity: 'role',
        refId: 'role-1',
        scope: { tenant: Tenant.AccountProject, id: 'acct-1:proj-2' },
      })
    ).toBeNull();
  });

  it('builds membership settings href without scope', () => {
    expect(
      buildNotificationDashboardPath({
        refEntity: 'projectMembership',
        refId: 'proj-1',
        scope: null,
      })
    ).toBe('/dashboard/settings/projects/proj-1');
  });

  it('prefixes locale on absolute URLs', () => {
    expect(absoluteFrontendUrl(buildNotificationInboxPath(), 'de')).toBe(
      'https://app.example.test/de/dashboard/notifications'
    );
    expect(absoluteFrontendUrl(buildNotificationPreferencesPath())).toBe(
      'https://app.example.test/en/dashboard/settings/notifications'
    );
  });
});
