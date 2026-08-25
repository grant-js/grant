/**
 * The scale fixtures exist to be weighed, not to be executed — so the one thing
 * that must hold is that what gets weighed is a document the API would actually
 * accept. A payload ceiling measured from bytes the REST route would reject is
 * not a measurement of anything.
 */
import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { startProjectSyncRequestSchema } from '@/rest/schemas/projects.schemas';

import { CDM_SCALE_PROFILES, generateCdmAtScale } from '../../../helpers/cdm-scale-fixtures';

const SCOPE = {
  id: '123e4567-e89b-12d3-a456-426614174005',
  tenant: Tenant.Organization,
};

describe('CDM scale fixtures', () => {
  for (const profile of CDM_SCALE_PROFILES) {
    describe(profile.name, () => {
      it('produces a document startProjectSyncRequestSchema accepts', () => {
        const cdm = generateCdmAtScale(profile);
        const result = startProjectSyncRequestSchema.safeParse({ scope: SCOPE, ...cdm });

        // Surface the first issue rather than a bare `false`; a shape drift in CDM
        // should say which field moved.
        expect(result.error?.issues[0] ?? null).toBeNull();
        expect(result.success).toBe(true);
      });

      it('generates the entity counts the profile declares', () => {
        const cdm = generateCdmAtScale(profile);

        expect(cdm.users).toHaveLength(profile.users);
        expect(cdm.resources).toHaveLength(profile.resources);
        expect(cdm.permissions).toHaveLength(profile.resources * profile.actionsPerResource);
        expect(cdm.roles).toHaveLength(profile.roles);
        expect(cdm.groups).toHaveLength(profile.groups);
        expect(cdm.tags).toHaveLength(profile.tags);
      });
    });
  }

  it('is deterministic — the same profile and seed produce identical bytes', () => {
    const profile = CDM_SCALE_PROFILES[1]!;

    expect(JSON.stringify(generateCdmAtScale(profile))).toBe(
      JSON.stringify(generateCdmAtScale(profile))
    );
  });

  it('carries gzip-resistant entropy rather than repeated filler', () => {
    // The guard the whole measurement rests on. Uniform filler compresses to
    // near nothing, which would make any tenant size look like it fits under
    // Lambda's 6 MB cap. If a future edit makes the fixtures repetitive, the
    // recorded ceiling silently becomes wrong — so assert distinctness here.
    const cdm = generateCdmAtScale(CDM_SCALE_PROFILES[1]!);
    const userKeys = cdm.users.map((u) => u.key.value);

    expect(new Set(userKeys).size).toBe(userKeys.length);

    const secrets = cdm.users.flatMap((u) => (u.apiKeys ?? []).map((k) => k.clientSecret));
    expect(secrets.length).toBeGreaterThan(0);
    expect(new Set(secrets).size).toBe(secrets.length);
  });
});
