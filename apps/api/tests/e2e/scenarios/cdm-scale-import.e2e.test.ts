/**
 * E2E: the smallest scale fixture, imported for real.
 *
 * The scale fixtures exist to be measured, and for three releases nothing ever applied
 * one. Each of the three defects that produced cost the same way — a value
 * `startProjectSyncRequestSchema` does not inspect, rejected by a service further in:
 *
 *   1. a permission `condition` shape `permissionConditionSchema` refuses (#422, found
 *      by a deployed import that died on its first permission);
 *   2. `findBy: Id` user resolvers carrying generated UUIDs, which provision nothing and
 *      then fail on the first group link;
 *   3. a hand-copied tag colour list containing `slate`, which `TAG_COLORS` does not.
 *
 * `cdm-scale-fixtures.test.ts` asserts each of those three, and will keep doing so. This
 * asserts the *family*: the document goes through the real route, the real queue, the
 * real worker, and the real services, and something is actually created at the end. A
 * fourth defect of the same shape fails here without anyone having to predict it.
 *
 * `starter` only — 124 entities, a couple of seconds. The larger profiles are what
 * `pnpm --filter grant-api measure:cdm-import` is for, and they do not belong in a suite
 * that has to finish.
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron.
 */
import { ProjectSyncJobStatus } from '@grantjs/schema';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CDM_SCALE_PROFILES, generateCdmAtScale } from '../../helpers/cdm-scale-fixtures';
import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

const STARTER = CDM_SCALE_PROFILES[0]!;

afterAll(async () => {
  await closeDbHelper();
});

describe('the smallest scale fixture imports end to end', () => {
  let owner: TestUser;
  let projectId: string;
  let scope: ReturnType<typeof scopeForAccountProject>;

  beforeAll(async () => {
    owner = await TestUser.create();
    const projectRes = await apiClient()
      .post('/api/projects')
      .set('Authorization', owner.authHeader)
      .send({
        name: 'CDM scale import',
        description: 'Applies the starter scale profile',
        scope: { id: owner.accountId, tenant: 'account' },
      });
    expect(projectRes.status).toBe(201);
    projectId = projectRes.body.data?.id as string;
    scope = scopeForAccountProject(owner.accountId, projectId);
  });

  it(`applies the \`${STARTER.name}\` profile and creates what it declares`, async () => {
    const cdm = generateCdmAtScale(STARTER);

    const { status, job } = await postImport(owner.authHeader, projectId, scope, cdm);
    expect(status).toBe(202);

    const completed = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      job,
      ProjectSyncJobStatus.Completed
    );

    expect(completed.operation).toBe('IMPORT');

    // The counts, not just the status. A completed job that applied nothing is exactly
    // as useless as a failed one for the thing this file is guarding, and two of the
    // three defects above would have produced a partial import rather than a clean
    // failure if they had landed one entity type later.
    const result = completed.result as Record<string, number> | null;
    expect(result).not.toBeNull();
    expect(result?.tagsCreated).toBe(STARTER.tags);
    expect(result?.resourcesCreated).toBe(STARTER.resources);
    expect(result?.permissionsCreated).toBe(STARTER.resources * STARTER.actionsPerResource);
    expect(result?.rolesCreated).toBe(STARTER.roles);
    expect(result?.groupsCreated).toBeGreaterThan(0);

    // `projectUsersEnsured`, not `usersCreated`. An email identity is **global**, not
    // per-project, and the generator is deterministic — so the second import of this
    // document, into any project, resolves all 25 users instead of creating them and
    // `usersCreated` is legitimately 0. The per-project link is the count that holds on
    // a pristine database and on a reused one, which is what a suite that runs twice
    // needs.
    expect(result?.projectUsersEnsured).toBe(STARTER.users);
  }, 120_000);
});
