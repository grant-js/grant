/**
 * E2E: `data.before.externalKeys` on `user.deleted` and `project.user_removed`.
 *
 * A receiver that mirrors Grant into another system must be able to name the user a removal
 * or deletion concerns after Grant has forgotten them: the source-system key a CDM import
 * attached, without any e-mail, name or hash, and only the key of the project the delivery
 * is for. The import runs for real (route, queue, worker, services); the removal and the
 * deletion go through the real routes; the delivery body is rebuilt from the stored event
 * with the real builder, given the subscription's own project exactly as the delivery
 * worker does (delivery rows do not keep the posted body; the worker itself is covered in
 * `tests/unit/services/webhook-delivery.service.external-keys.test.ts`).
 *
 * Shapes covered:
 *  (a) an identity the import created, keyed by a source-system key: `project.user_removed`
 *      carries the key; `user.deleted` of a user carrying that marker on the global user
 *      (the shape an import writes for a created user; set directly because an
 *      import-created identity has no credentials to delete itself with);
 *  (b) an identity the import reused (an existing user resolved by address): the key comes
 *      from the membership row's `cdmSource.legacy.id`, and the address appears nowhere;
 *  (c) a Grant-native user: `externalKeys` is `[]` on both events;
 *  (d) a user in two projects, each marked by its own import: one `user.deleted`, and each
 *      project's delivery carries its own key only;
 *  (e) hard delete carries the keys as a soft delete does.
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron.
 */
import { CdmFindBy, DeleteUserDocument, ProjectSyncJobStatus, Tenant } from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { cdmWithRoleTemplate } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { addProjectUserForE2e, closeDbHelper, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

interface DeliveredEvent extends Record<string, unknown> {
  id: string;
  sequence: number | string;
  type: string;
  category: string;
  delivery_class: 'transactional' | 'notification';
  scope_tenant: string;
  scope_id: string;
  actor_user_id: string | null;
  subject_user_id: string | null;
  payload: {
    aggregate?: { kind: string; id: string };
    data?: { before?: Record<string, unknown> };
    projectIds?: string[];
  };
  occurred_at: Date;
  subscription_project_id: string;
}

afterAll(async () => {
  await closeDbHelper();
});

const suffix = Date.now();

async function createAccountProject(owner: TestUser, name: string): Promise<string> {
  const res = await apiClient()
    .post('/api/projects')
    .set('Authorization', owner.authHeader)
    .send({ name, scope: { id: owner.accountId, tenant: 'account' } });
  expect(res.status).toBe(201);
  return (res.body as { data: { id: string } }).data.id;
}

async function subscribe(owner: TestUser, projectId: string): Promise<string> {
  const res = await apiClient()
    .post('/api/webhook-subscriptions')
    .set('Authorization', owner.authHeader)
    .send({
      scope: { tenant: Tenant.AccountProject, id: `${owner.accountId}:${projectId}` },
      url: 'https://example.com/grant-e2e-external-keys',
      eventTypes: ['user.deleted', 'project.user_removed'],
      description: 'E2E external keys',
      active: true,
    });
  expect(res.status).toBe(201);
  return (res.body as { data: { id: string } }).data.id;
}

async function importUsers(
  owner: TestUser,
  projectId: string,
  roleKey: string,
  users: NonNullable<CdmDocumentInput['users']>
): Promise<void> {
  const scope = scopeForAccountProject(owner.accountId, projectId);
  const imported = await postImport(
    owner.authHeader,
    projectId,
    scope,
    cdmWithRoleTemplate(roleKey, { users })
  );
  expect(imported.status).toBe(202);
  await resolveJob(
    owner.authHeader,
    projectId,
    scope,
    imported.job,
    ProjectSyncJobStatus.Completed
  );
}

function importedUser(
  key: string,
  findBy: CdmFindBy,
  roleKey: string,
  metadata: Record<string, unknown>
): NonNullable<CdmDocumentInput['users']>[number] {
  return {
    key: { value: key, findBy },
    name: 'Imported Person',
    roles: [roleKey],
    groups: [],
    permissions: [],
    tags: [],
    primaryTag: null,
    apiKeys: [],
    metadata,
  };
}

async function deliveriesOf(subscriptionId: string): Promise<DeliveredEvent[]> {
  return query<DeliveredEvent>`
    SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
           e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at,
           s.project_id AS subscription_project_id
    FROM webhook_delivery_attempts d
    INNER JOIN event_log e ON e.id = d.event_id
    INNER JOIN webhook_subscriptions s ON s.id = d.subscription_id
    WHERE d.subscription_id = ${subscriptionId}::uuid
    ORDER BY e.sequence
  `;
}

/**
 * The delivery about `userId`: the subject, or `before.id` (a hard delete nulls the subject
 * column) for `user.deleted`, `before.userId` for `project.user_removed`.
 */
const isAbout = (row: DeliveredEvent, userId: string) =>
  row.subject_user_id === userId ||
  row.payload.data?.before?.id === userId ||
  row.payload.data?.before?.userId === userId;

async function waitForEvent(
  subscriptionId: string,
  type: string,
  userId: string,
  timeoutMs = 90_000
): Promise<DeliveredEvent> {
  const deadline = Date.now() + timeoutMs;
  let rows: DeliveredEvent[] = [];
  while (Date.now() < deadline) {
    rows = await deliveriesOf(subscriptionId);
    const found = rows.find((r) => r.type === type && isAbout(r, userId));
    if (found) return found;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${type} about ${userId}; saw ${rows.map((r) => r.type)}`);
}

/** The body the delivery worker posts: the stored event, built for the subscription's project. */
function bodyOf(row: DeliveredEvent) {
  return buildCloudEventEnvelope(
    {
      id: row.id,
      sequence: Number(row.sequence),
      type: row.type as 'user.deleted',
      category: 'iam',
      deliveryClass: row.delivery_class,
      scope: { tenant: row.scope_tenant as typeof Tenant.AccountProject, id: row.scope_id },
      actorUserId: row.actor_user_id,
      subjectUserId: row.subject_user_id,
      aggregate: row.payload.aggregate,
      data: row.payload.data ?? {},
      occurredAt: row.occurred_at,
    },
    'https://grant.e2e.invalid',
    { projectId: row.subscription_project_id }
  );
}

describe('data.before.externalKeys on user.deleted and project.user_removed', () => {
  let owner: TestUser;
  let projectA: string;
  let projectB: string;
  let subA: string;
  let subB: string;

  const removeFromProject = async (projectId: string, userId: string) => {
    const res = await graphqlRequest<{ deleteUser?: { id: string } }>({
      query: print(DeleteUserDocument),
      accessToken: owner.accessToken,
      variables: {
        id: userId,
        scope: { tenant: Tenant.AccountProject, id: `${owner.accountId}:${projectId}` },
      },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
  };

  const personalData = (user: TestUser) => [user.email, user.email.toLowerCase(), user.name];

  it('setup: two projects of one account, each with a subscription', async () => {
    owner = await TestUser.create();
    projectA = await createAccountProject(owner, `E2E External Keys A ${suffix}`);
    projectB = await createAccountProject(owner, `E2E External Keys B ${suffix}`);
    subA = await subscribe(owner, projectA);
    subB = await subscribe(owner, projectB);
  });

  it('(a) an identity the import created: project.user_removed carries its key, never the address in its metadata', async () => {
    const key = `src-key-${suffix}`;
    await importUsers(owner, projectA, `role-a-${suffix}`, [
      importedUser(key, CdmFindBy.Key, `role-a-${suffix}`, {
        legacy: { id: `legacy-created-${suffix}`, email: 'someone@example.test' },
      }),
    ]);
    const rows = await query<{ id: string }>`
      SELECT u.id::text AS id FROM users u
      WHERE u.metadata->'cdmImport'->>'projectId' = ${projectA}
        AND u.metadata->'cdmImport'->>'externalKey' = ${key}
    `;
    expect(rows).toHaveLength(1);
    const createdUserId = rows[0]!.id;

    await removeFromProject(projectA, createdUserId);

    const event = await waitForEvent(subA, 'project.user_removed', createdUserId);
    const body = bodyOf(event);
    expect(body.data.before).toMatchObject({
      projectId: projectA,
      userId: createdUserId,
      externalKeys: [{ projectId: projectA, externalKey: key }],
    });
    expect(JSON.stringify(body)).not.toMatch(/example\.test|Imported Person/);
  }, 120_000);

  it('(a) user.deleted of a user marked on the global user carries the key', async () => {
    const member = await TestUser.create();
    const key = `src-key-global-${suffix}`;
    await query`
      UPDATE users SET metadata = ${JSON.stringify({
        cdmImport: { projectId: projectA, kind: 'user', externalKey: key },
        cdmSource: { legacy: { id: `legacy-global-${suffix}`, email: 'someone@example.test' } },
      })}::jsonb
      WHERE id = ${member.userId!}::uuid
    `;
    await addProjectUserForE2e(projectA, member.userId!);

    expect((await member.deleteAccount()).status).toBe(200);

    const body = bodyOf(await waitForEvent(subA, 'user.deleted', member.userId!));
    expect(body.data.before).toEqual({
      id: member.userId,
      externalKeys: [{ projectId: projectA, externalKey: key }],
    });
    const serialised = JSON.stringify(body);
    for (const value of [...personalData(member), 'example.test']) {
      expect(serialised).not.toContain(value);
    }
  }, 120_000);

  it('(b) an identity the import reused: the key is the importer id on the membership row, and the address appears nowhere', async () => {
    const reused = await TestUser.create();
    const legacyId = `legacy-reused-${suffix}`;
    await importUsers(owner, projectA, `role-r-${suffix}`, [
      importedUser(reused.email, CdmFindBy.Email, `role-r-${suffix}`, {
        legacy: { id: legacyId },
      }),
    ]);
    // The identity was reused, not created: the global user carries no marker for this project.
    const global = await query<{ marked: boolean }>`
      SELECT (metadata ? 'cdmImport') AS marked FROM users WHERE id = ${reused.userId!}::uuid
    `;
    expect(global[0]?.marked).toBe(false);

    await removeFromProject(projectA, reused.userId!);

    const body = bodyOf(await waitForEvent(subA, 'project.user_removed', reused.userId!));
    expect(body.data.before?.externalKeys).toEqual([
      { projectId: projectA, externalKey: legacyId },
    ]);
    const serialised = JSON.stringify(body);
    for (const value of personalData(reused)) {
      expect(serialised).not.toContain(value);
    }
    expect(serialised).not.toMatch(/passwordHash|\$2[aby]\$/);
  }, 120_000);

  it('(c) a Grant-native user carries [] on project.user_removed and on user.deleted', async () => {
    const removed = await TestUser.create();
    await addProjectUserForE2e(projectA, removed.userId!);
    await removeFromProject(projectA, removed.userId!);
    const removalBody = bodyOf(await waitForEvent(subA, 'project.user_removed', removed.userId!));
    expect(removalBody.data.before?.externalKeys).toEqual([]);

    const deleted = await TestUser.create();
    await addProjectUserForE2e(projectA, deleted.userId!);
    expect((await deleted.deleteAccount()).status).toBe(200);
    const deletionBody = bodyOf(await waitForEvent(subA, 'user.deleted', deleted.userId!));
    expect(deletionBody.data.before).toEqual({ id: deleted.userId, externalKeys: [] });
  }, 180_000);

  it('(d) one user in two projects: each project’s delivery carries its own key only', async () => {
    const shared = await TestUser.create();
    const keyA = `legacy-shared-a-${suffix}`;
    const keyB = `legacy-shared-b-${suffix}`;
    await importUsers(owner, projectA, `role-sa-${suffix}`, [
      importedUser(shared.email, CdmFindBy.Email, `role-sa-${suffix}`, { legacy: { id: keyA } }),
    ]);
    await importUsers(owner, projectB, `role-sb-${suffix}`, [
      importedUser(shared.email, CdmFindBy.Email, `role-sb-${suffix}`, { legacy: { id: keyB } }),
    ]);

    expect((await shared.deleteAccount()).status).toBe(200);

    const eventA = await waitForEvent(subA, 'user.deleted', shared.userId!);
    const eventB = await waitForEvent(subB, 'user.deleted', shared.userId!);
    // One stored event, fanned out to both projects; the stored snapshot holds both entries.
    expect(eventA.id).toBe(eventB.id);
    expect(eventA.payload.data?.before?.externalKeys).toHaveLength(2);

    const bodyA = bodyOf(eventA);
    const bodyB = bodyOf(eventB);
    expect(bodyA.data.before?.externalKeys).toEqual([{ projectId: projectA, externalKey: keyA }]);
    expect(bodyB.data.before?.externalKeys).toEqual([{ projectId: projectB, externalKey: keyB }]);
    expect(JSON.stringify(bodyA)).not.toContain(keyB);
    expect(JSON.stringify(bodyB)).not.toContain(keyA);
  }, 180_000);

  it('(e) hard delete carries the keys as a soft delete does', async () => {
    const erased = await TestUser.create();
    const legacyId = `legacy-erased-${suffix}`;
    await importUsers(owner, projectA, `role-e-${suffix}`, [
      importedUser(erased.email, CdmFindBy.Email, `role-e-${suffix}`, { legacy: { id: legacyId } }),
    ]);

    expect((await erased.deleteAccount(true)).status).toBe(200);

    const body = bodyOf(await waitForEvent(subA, 'user.deleted', erased.userId!));
    expect(body.data.after).toEqual({ id: erased.userId, hardDelete: true });
    expect(body.data.before).toEqual({
      id: erased.userId,
      externalKeys: [{ projectId: projectA, externalKey: legacyId }],
    });
    for (const value of personalData(erased)) {
      expect(JSON.stringify(body)).not.toContain(value);
    }
  }, 120_000);
});
