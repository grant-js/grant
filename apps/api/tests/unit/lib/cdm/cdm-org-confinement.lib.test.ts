import { describe, expect, it } from 'vitest';

import { isConfinedToOrganization } from '@/lib/cdm/cdm-org-confinement.lib';

const ORG = 'org-a';
const OTHER = 'org-b';

describe('isConfinedToOrganization', () => {
  it.each([
    ['one project of the organization', { projectOrganizationIds: [[ORG]], organizationIds: [] }],
    [
      'many projects of the organization',
      { projectOrganizationIds: [[ORG], [ORG]], organizationIds: [] },
    ],
    ['only an organization membership', { projectOrganizationIds: [], organizationIds: [ORG] }],
    ['both kinds, all inside', { projectOrganizationIds: [[ORG]], organizationIds: [ORG] }],
  ])('is confined with %s', (_label, facts) => {
    expect(isConfinedToOrganization(facts, ORG)).toBe(true);
  });

  it.each([
    ['no membership at all', { projectOrganizationIds: [], organizationIds: [] }],
    [
      'a project of another organization',
      { projectOrganizationIds: [[ORG], [OTHER]], organizationIds: [] },
    ],
    [
      'a project that belongs to no organization',
      { projectOrganizationIds: [[ORG], []], organizationIds: [] },
    ],
    [
      'a project shared with another organization',
      { projectOrganizationIds: [[ORG, OTHER]], organizationIds: [] },
    ],
    [
      'an organization membership elsewhere',
      { projectOrganizationIds: [[ORG]], organizationIds: [ORG, OTHER] },
    ],
    [
      'only a foreign organization membership',
      { projectOrganizationIds: [], organizationIds: [OTHER] },
    ],
  ])('is not confined with %s', (_label, facts) => {
    expect(isConfinedToOrganization(facts, ORG)).toBe(false);
  });
});
