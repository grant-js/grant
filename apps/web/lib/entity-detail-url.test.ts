import { describe, expect, it } from 'vitest';

import { getProjectOAuthConnectionsUrl } from '@/lib/entity-detail-url';

describe('getProjectOAuthConnectionsUrl', () => {
  it('builds the organization project connections page with a provider hash', () => {
    expect(
      getProjectOAuthConnectionsUrl({
        organizationId: 'org-1',
        projectId: 'project-1',
        provider: 'github',
      })
    ).toBe('/dashboard/organizations/org-1/projects/project-1/oauth-connections#github');
  });

  it('builds the personal project connections page with a provider hash', () => {
    expect(
      getProjectOAuthConnectionsUrl({
        accountId: 'acct-1',
        projectId: 'project-2',
        provider: 'google',
      })
    ).toBe('/dashboard/accounts/acct-1/projects/project-2/oauth-connections#google');
  });

  it('omits the hash when no provider is given', () => {
    expect(
      getProjectOAuthConnectionsUrl({
        organizationId: 'org-1',
        projectId: 'project-1',
      })
    ).toBe('/dashboard/organizations/org-1/projects/project-1/oauth-connections');
  });
});
