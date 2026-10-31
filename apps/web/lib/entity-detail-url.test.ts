import { describe, expect, it } from 'vitest';

import {
  getEntityCreateUrl,
  getEntityDetailUrl,
  getProjectOAuthConnectionsUrl,
} from '@/lib/entity-detail-url';

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

describe('api-keys entity segment', () => {
  it('builds the create and detail URLs in both project trees', () => {
    expect(
      getEntityCreateUrl({ organizationId: 'org-1', projectId: 'p-1', entitySegment: 'api-keys' })
    ).toBe('/dashboard/organizations/org-1/projects/p-1/api-keys/new');
    expect(
      getEntityCreateUrl({ accountId: 'acct-1', projectId: 'p-1', entitySegment: 'api-keys' })
    ).toBe('/dashboard/accounts/acct-1/projects/p-1/api-keys/new');
    expect(
      getEntityDetailUrl({
        organizationId: 'org-1',
        projectId: 'p-1',
        entitySegment: 'api-keys',
        entityId: 'key-1',
      })
    ).toBe('/dashboard/organizations/org-1/projects/p-1/api-keys/key-1');
    expect(
      getEntityDetailUrl({
        accountId: 'acct-1',
        projectId: 'p-1',
        entitySegment: 'api-keys',
        entityId: 'key-1',
      })
    ).toBe('/dashboard/accounts/acct-1/projects/p-1/api-keys/key-1');
  });
});
