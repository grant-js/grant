/**
 * The scale fixtures exist to be weighed, not to be executed — so the one thing
 * that must hold is that what gets weighed is a document the API would actually
 * accept. A payload ceiling measured from bytes the REST route would reject is
 * not a measurement of anything.
 *
 * **That was the stated goal, and for a while it was not the asserted one.**
 * `startProjectSyncRequestSchema` accepts a document without looking inside a
 * permission's `condition`; `PermissionService.createPermission` validates it against
 * `permissionConditionSchema` and refuses. The generator emitted
 * `{ field, operator, value }`, which passes the first check and fails the second — so
 * every fixture "validated", and every real import died on its first permission with
 * `Invalid condition structure: Invalid input`.
 *
 * It cost an account cycle to find, on a deploy whose purpose was to time an import that
 * could never have run (`2026-09-09-aws-followups-closeout-measurements.md`, § ADR 0002).
 * The lesson is narrow and worth keeping: *a fixture is only as valid as the strictest
 * validator that will see it*, and the request schema is not that validator.
 *
 * **It was not one defect but three, and the other two were found the same way — by
 * finally running an import.** Slice 12 built `tests/tools/measure-cdm-import.ts` and
 * pointed it at a real database, which surfaced, in order:
 *
 *   1. the permission `condition` shape above;
 *   2. `findBy: CdmFindBy.Id` user resolvers carrying freshly generated UUIDs. In CDM
 *      that means "assign to the user with this id" — `expand-cdm-sync-input.lib.ts`
 *      provisions nothing for it — so every id-resolved user failed with
 *      `NotFoundError: User not found` as soon as a group was linked to it;
 *   3. a hand-copied colour list containing `slate`, which is not in `TAG_COLORS`, so
 *      `TagService.createTag` rejected any tag that drew it.
 *
 * All three share one shape: a value `startProjectSyncRequestSchema` does not inspect,
 * rejected by a service the fixture was never run through. The assertions below cover
 * the three known instances; `tests/e2e/scenarios/cdm-scale-import.e2e.test.ts` covers
 * the family, by importing the smallest profile for real.
 */
import { TAG_COLORS } from '@grantjs/constants';
import { permissionConditionSchema } from '@grantjs/core';
import { CdmFindBy, Tenant } from '@grantjs/schema';
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

      it('produces permission conditions the service will also accept', () => {
        // The assertion whose absence let a whole account cycle be spent timing an
        // import that could not run. The route schema admits the document; this is the
        // validator that actually sees each condition, one entity at a time.
        const cdm = generateCdmAtScale(profile);
        const conditions = (cdm.permissions ?? [])
          .map((permission) => permission.condition)
          .filter((condition) => condition != null);

        // Guards against a vacuous pass: if the generator ever stops emitting conditions,
        // every assertion below becomes trivially true and this test stops testing.
        expect(conditions.length).toBeGreaterThan(0);

        for (const condition of conditions) {
          const result = permissionConditionSchema.safeParse(condition);
          expect(
            result.error?.issues[0]?.message ?? null,
            `condition rejected: ${JSON.stringify(condition)}`
          ).toBeNull();
        }
      });

      it('resolves every user by a key that provisions one', () => {
        // Defect 2. `findBy: Id` is a lookup, not a creation key: a self-contained
        // document cannot reference a user id that already exists, so an id resolver here
        // is always an import that fails partway through rather than a document that is
        // merely odd.
        const cdm = generateCdmAtScale(profile);

        expect(cdm.users.length).toBeGreaterThan(0);
        for (const user of cdm.users) {
          expect(user.key.findBy, `user ${user.key.value} must not resolve by id`).not.toBe(
            CdmFindBy.Id
          );
        }
      });

      it('colours every tag with one the tag service accepts', () => {
        // Defect 3. Asserted against `TAG_COLORS` rather than against a list repeated
        // here — a second copy of the canonical list is the thing that broke.
        const cdm = generateCdmAtScale(profile);
        const tags = cdm.tags ?? [];

        expect(tags.length).toBeGreaterThan(0);
        for (const tag of tags) {
          expect(TAG_COLORS, `tag ${tag.key} has colour ${tag.color}`).toContain(tag.color);
        }
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
