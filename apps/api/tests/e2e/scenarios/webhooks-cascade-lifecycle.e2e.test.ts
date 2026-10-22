/**
 * E2E: webhook cascades and lifecycle events.
 *
 * A project's subscription must be told about every way a user's access or an
 * entity can change, or a consumer that diffs state drifts:
 *  - deleting a GROUP revokes every membership, one `user.group_revoked` per member;
 *  - removing a PROJECT USER revokes the roles and groups the project gave them;
 *  - tags: create / update / link / unlink / delete;
 *  - deleting an API key (the owning user is the subject only for a user-owned key);
 *  - a user deleting their own account reaches the projects they belong to;
 *  - a user renaming themselves in an account scope (which names no project) reaches the
 *    projects they belong to with one `user.updated`.
 *
 * Deliveries are read from the database together with the stored event, and the
 * external envelope is rebuilt from that row with the real builder: delivery rows
 * do not keep the posted body. `grantsubjectuser` names whose access ended, and
 * `data.before` carries the ids of the pivot that ended.
 * POSTs go to a public HTTPS URL (example.com); a delivery may end up failed or
 * dead, which is enough: the pending row is the proof of matching.
 *
 * Prerequisites: E2E stack running (docker-compose.e2e.yml), DB migrated and seeded.
 */
import {
  CreateApiKeyDocument,
  CreateGroupDocument,
  CreateTagDocument,
  CreateUserDocument,
  DeleteApiKeyDocument,
  DeleteGroupDocument,
  DeleteTagDocument,
  DeleteUserDocument,
  Tenant,
  UpdateRoleDocument,
  UpdateTagDocument,
  UpdateUserDocument,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { apiClient } from '../helpers/api-client';
import {
  addProjectUserForE2e,
  assignUserRoleForE2e,
  closeDbHelper,
  getOrganizationRoleIdByName,
  query,
} from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

interface IdBody {
  data?: { id: string };
}

interface EventRow extends Record<string, unknown> {
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
    data?: Record<string, unknown>;
    projectIds?: string[];
  };
  occurred_at: Date;
}

const EVENT_TYPES = [
  'user.created',
  'user.updated',
  'user.deleted',
  'user.group_revoked',
  'user.role_revoked',
  'project.user_removed',
  'group.deleted',
  'tag.created',
  'tag.updated',
  'tag.linked',
  'tag.unlinked',
  'tag.deleted',
  'api_key.deleted',
] as const;

afterAll(async () => {
  await closeDbHelper();
});

async function deliveriesOf(subscriptionId: string): Promise<EventRow[]> {
  return query<EventRow>`
    SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
           e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
    FROM webhook_delivery_attempts d
    INNER JOIN event_log e ON e.id = d.event_id
    WHERE d.subscription_id = ${subscriptionId}::uuid
    ORDER BY e.sequence
  `;
}

/** Poll until `done(rows)` holds; the relay is asynchronous. */
async function waitForDeliveries(
  subscriptionId: string,
  label: string,
  done: (rows: EventRow[]) => boolean,
  timeoutMs = 25_000
): Promise<EventRow[]> {
  const deadline = Date.now() + timeoutMs;
  let rows: EventRow[] = [];
  while (Date.now() < deadline) {
    rows = await deliveriesOf(subscriptionId);
    if (done(rows)) return rows;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `Timed out waiting for ${label}; saw ${rows.map((r) => `${r.type}:${r.subject_user_id ?? '-'}`).join(', ')}`
  );
}

function envelopeOf(row: EventRow) {
  return buildCloudEventEnvelope(
    {
      id: row.id,
      sequence: Number(row.sequence),
      type: row.type as (typeof EVENT_TYPES)[number],
      category: row.category as 'iam',
      deliveryClass: row.delivery_class,
      scope: { tenant: row.scope_tenant as typeof Tenant.Organization, id: row.scope_id },
      actorUserId: row.actor_user_id,
      subjectUserId: row.subject_user_id,
      aggregate: row.payload.aggregate,
      data: row.payload.data ?? {},
      occurredAt: row.occurred_at,
    },
    'https://grant.e2e.invalid'
  );
}

const ofType = (rows: EventRow[], type: string) => rows.filter((r) => r.type === type);
const subjectsOf = (rows: EventRow[], type: string) =>
  ofType(rows, type)
    .map((r) => r.subject_user_id)
    .sort();

async function permissionId(name: string): Promise<string> {
  const rows = await query<{ id: string }>`
    SELECT id FROM permissions WHERE name = ${name} AND deleted_at IS NULL LIMIT 1
  `;
  expect(rows[0]?.id, `seeded permission ${name}`).toBeDefined();
  return rows[0]!.id;
}

describe('Webhook cascades and lifecycle events', () => {
  let owner: TestUser;
  let ownerUserId: string;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let subscriptionId: string;
  let groupId: string;
  let memberA: string;
  let memberB: string;
  let projectRoleId: string;

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });
  const gql = <T>(document: Parameters<typeof print>[0], variables: Record<string, unknown>) =>
    graphqlRequest<T>({ query: print(document), accessToken: owner.accessToken, variables });

  async function createProjectUser(
    name: string,
    extra: { groupIds?: string[]; roleIds?: string[]; tagIds?: string[] } = {}
  ): Promise<string> {
    const res = await gql<{ createUser?: { id: string } }>(CreateUserDocument, {
      input: { name, scope: projectScope(), ...extra },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    return res.body.data!.createUser!.id;
  }

  async function createGroup(name: string): Promise<string> {
    const res = await gql<{ createGroup?: { id: string } }>(CreateGroupDocument, {
      input: { name, description: 'e2e', scope: projectScope() },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    return res.body.data!.createGroup!.id;
  }

  async function activeMemberships(group: string): Promise<number> {
    const rows = await query<{ n: string }>`
      SELECT COUNT(*)::text AS n FROM user_groups
      WHERE group_id = ${group}::uuid AND deleted_at IS NULL
    `;
    return Number(rows[0]!.n);
  }

  it('Setup: owner, organization, project and a subscription to the cascade and lifecycle events', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Cascade Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Cascade Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as IdBody).data!.id;

    const profile = await owner.getProfile();
    ownerUserId = (profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } })
      .data!.accounts![0]!.owner!.id;

    const res = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: projectScope(),
        url: 'https://example.com/grant-e2e-cascade',
        eventTypes: [...EVENT_TYPES],
        description: 'E2E cascades and lifecycle',
        active: true,
      });
    expect(res.status).toBe(201);
    subscriptionId = (res.body as IdBody).data!.id;
  });

  it('a group with two members: creating the members delivers user.created for each', async () => {
    groupId = await createGroup(`E2E Cascade Group ${Date.now()}`);
    memberA = await createProjectUser('E2E Member A', { groupIds: [groupId] });
    memberB = await createProjectUser('E2E Member B', { groupIds: [groupId] });
    expect(await activeMemberships(groupId)).toBe(2);

    const rows = await waitForDeliveries(
      subscriptionId,
      'user.created x2',
      (r) => ofType(r, 'user.created').length >= 2
    );
    expect(subjectsOf(rows, 'user.created')).toEqual([memberA, memberB].sort());

    // Ids and timestamps only: the user's name never travels.
    const created = envelopeOf(ofType(rows, 'user.created')[0]!);
    expect(created.data.after).toEqual({
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(JSON.stringify(created)).not.toContain('E2E Member');
  });

  it('deleting the group removes every membership and delivers one user.group_revoked per member', async () => {
    const res = await gql<{ deleteGroup?: { id: string } }>(DeleteGroupDocument, {
      id: groupId,
      scope: projectScope(),
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    // The bug this slice fixes: a soft delete left the memberships active.
    expect(await activeMemberships(groupId)).toBe(0);

    const rows = await waitForDeliveries(
      subscriptionId,
      'user.group_revoked x2 and group.deleted',
      (r) => ofType(r, 'user.group_revoked').length >= 2 && ofType(r, 'group.deleted').length >= 1
    );
    expect(subjectsOf(rows, 'user.group_revoked')).toEqual([memberA, memberB].sort());
    for (const row of ofType(rows, 'user.group_revoked')) {
      const envelope = envelopeOf(row);
      expect(envelope.grantsubjectuser).toEqual({ userId: row.subject_user_id });
      expect(envelope.data.before).toMatchObject({ userId: row.subject_user_id, groupId });
      expect(Object.keys(envelope.data.before ?? {}).sort()).toEqual(['groupId', 'id', 'userId']);
    }
  });

  it('removing a project user revokes their project role and group, then delivers project.user_removed', async () => {
    const roleRes = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Cascade Role ${Date.now()}`,
        description: 'project role',
        scope: projectScope(),
      });
    expect(roleRes.status).toBe(201);
    projectRoleId = (roleRes.body as IdBody).data!.id;

    const group = await createGroup(`E2E Cascade Group B ${Date.now()}`);
    const member = await createProjectUser('E2E Member C', {
      groupIds: [group],
      roleIds: [projectRoleId],
    });

    const res = await gql<{ deleteUser?: { id: string } }>(DeleteUserDocument, {
      id: member,
      scope: projectScope(),
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const rows = await waitForDeliveries(
      subscriptionId,
      'the revokes and project.user_removed for the removed member',
      (r) =>
        ['user.role_revoked', 'user.group_revoked', 'project.user_removed'].every((type) =>
          ofType(r, type).some((row) => row.subject_user_id === member)
        )
    );
    for (const type of ['user.role_revoked', 'user.group_revoked', 'project.user_removed']) {
      const row = ofType(rows, type).find((r) => r.subject_user_id === member)!;
      expect(envelopeOf(row).grantsubjectuser).toEqual({ userId: member });
    }

    const active = await query<{ n: string }>`
      SELECT (
        (SELECT COUNT(*) FROM user_roles WHERE user_id = ${member}::uuid AND role_id = ${projectRoleId}::uuid AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM user_groups WHERE user_id = ${member}::uuid AND group_id = ${group}::uuid AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM project_user_groups WHERE user_id = ${member}::uuid AND group_id = ${group}::uuid AND deleted_at IS NULL)
      )::text AS n
    `;
    expect(Number(active[0]!.n)).toBe(0);
  });

  it('tags: create, update, link, unlink and delete are all delivered', async () => {
    const createTag = async (name: string) => {
      const res = await gql<{ createTag?: { id: string } }>(CreateTagDocument, {
        input: { name, color: 'blue', scope: projectScope() },
      });
      expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
      return res.body.data!.createTag!.id;
    };
    const tagA = await createTag(`e2e-tag-a-${Date.now()}`);
    const tagB = await createTag(`e2e-tag-b-${Date.now()}`);

    const updated = await gql(UpdateTagDocument, {
      id: tagA,
      input: { color: 'teal', scope: projectScope() },
    });
    expect(updated.body.errors, JSON.stringify(updated.body.errors)).toBeUndefined();

    // Link A to the role; then replace A with B, which unlinks A and links B.
    // (An empty `tagIds` list is a no-op in the role update handler, so it cannot unlink.)
    for (const tagIds of [[tagA], [tagB]]) {
      const res = await gql(UpdateRoleDocument, {
        id: projectRoleId,
        input: { scope: projectScope(), tagIds },
      });
      expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    }

    // Deleting B while it is on the role must unlink it first, then delete it.
    const deleted = await gql(DeleteTagDocument, { id: tagB, scope: projectScope() });
    expect(deleted.body.errors, JSON.stringify(deleted.body.errors)).toBeUndefined();

    const about = (rows: EventRow[], type: string, tagId: string) =>
      ofType(rows, type).filter(
        (r) =>
          r.payload.aggregate?.id === tagId ||
          (r.payload.data?.after as { tagId?: string } | undefined)?.tagId === tagId
      );
    const rows = await waitForDeliveries(
      subscriptionId,
      'the tag events',
      (r) =>
        about(r, 'tag.created', tagA).length >= 1 &&
        about(r, 'tag.created', tagB).length >= 1 &&
        about(r, 'tag.updated', tagA).length >= 1 &&
        about(r, 'tag.linked', tagA).length >= 1 &&
        about(r, 'tag.unlinked', tagA).length >= 1 &&
        about(r, 'tag.linked', tagB).length >= 1 &&
        about(r, 'tag.unlinked', tagB).length >= 1 &&
        about(r, 'tag.deleted', tagB).length >= 1
    );

    const linked = envelopeOf(about(rows, 'tag.linked', tagA)[0]!);
    expect(linked.subject).toMatch(/^roleTag\//);
    expect(linked.data.after).toEqual({ tagId: tagA, targetKind: 'role', targetId: projectRoleId });
    // Unlinked by the role update (A) and by the tag delete cascade (B): same shape.
    for (const tagId of [tagA, tagB]) {
      const unlinked = envelopeOf(about(rows, 'tag.unlinked', tagId)[0]!);
      expect(unlinked.data.after).toEqual({ tagId, targetKind: 'role', targetId: projectRoleId });
      expect(unlinked.grantsubjectuser).toBeNull();
    }
  });

  it('an API key owned by a project user: deleting it names that user; an organization-project key names none', async () => {
    // A project role that lets the owner create and delete API keys as a project user.
    const keyRole = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Key Role ${Date.now()}`,
        description: 'api keys',
        scope: projectScope(),
        permissionIds: [
          await permissionId('permissions.names.ApiKey.Create'),
          await permissionId('permissions.names.ApiKey.Delete'),
        ],
      });
    expect(keyRole.status).toBe(201);
    await addProjectUserForE2e(projectId, ownerUserId);
    await assignUserRoleForE2e(ownerUserId, (keyRole.body as IdBody).data!.id);

    const userScope = { tenant: Tenant.ProjectUser, id: `${projectId}:${ownerUserId}` };
    const userKey = await gql<{ createApiKey?: { id: string } }>(CreateApiKeyDocument, {
      input: { name: 'E2E user-owned key', scope: userScope },
    });
    expect(userKey.body.errors, JSON.stringify(userKey.body.errors)).toBeUndefined();
    const userKeyId = userKey.body.data!.createApiKey!.id;

    const orgKey = await gql<{ createApiKey?: { id: string } }>(CreateApiKeyDocument, {
      input: {
        name: 'E2E org-project key',
        scope: projectScope(),
        roleId: (await getOrganizationRoleIdByName(org.id, 'roles.names.organizationAdmin'))!,
      },
    });
    expect(orgKey.body.errors, JSON.stringify(orgKey.body.errors)).toBeUndefined();
    const orgKeyId = orgKey.body.data!.createApiKey!.id;

    const delUser = await gql(DeleteApiKeyDocument, { input: { id: userKeyId, scope: userScope } });
    expect(delUser.body.errors, JSON.stringify(delUser.body.errors)).toBeUndefined();
    const delOrg = await gql(DeleteApiKeyDocument, {
      input: { id: orgKeyId, scope: projectScope() },
    });
    expect(delOrg.body.errors, JSON.stringify(delOrg.body.errors)).toBeUndefined();

    const rows = await waitForDeliveries(subscriptionId, 'api_key.deleted x2', (r) =>
      [userKeyId, orgKeyId].every((id) =>
        ofType(r, 'api_key.deleted').some((row) => row.payload.aggregate?.id === id)
      )
    );
    const eventFor = (id: string) =>
      ofType(rows, 'api_key.deleted').find((row) => row.payload.aggregate?.id === id)!;

    expect(envelopeOf(eventFor(userKeyId)).grantsubjectuser).toEqual({ userId: ownerUserId });
    expect(envelopeOf(eventFor(orgKeyId)).grantsubjectuser).toBeNull();
  });

  it('a user deleting their own account delivers user.deleted to the project they belong to', async () => {
    const member = await TestUser.create();
    const profile = await member.getProfile();
    const memberUserId = (
      profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } }
    ).data!.accounts![0]!.owner!.id;
    await addProjectUserForE2e(projectId, memberUserId);

    const res = await member.deleteAccount();
    expect(res.status).toBe(200);

    // The relay enqueue after commit is coalesced, so an event that lands while a relay run
    // is draining can wait for the one-minute sweep: allow for it.
    const rows = await waitForDeliveries(
      subscriptionId,
      'user.deleted',
      (r) => ofType(r, 'user.deleted').some((row) => row.subject_user_id === memberUserId),
      90_000
    );
    const row = ofType(rows, 'user.deleted').find((r) => r.subject_user_id === memberUserId)!;
    expect(row.payload.projectIds).toContain(projectId);

    const envelope = envelopeOf(row);
    expect(envelope.grantsubjectuser).toEqual({ userId: memberUserId });
    expect(envelope.data.after).toEqual({ id: memberUserId, hardDelete: false });
    // The name of a user who asked to be erased is not in the event.
    expect(JSON.stringify(row.payload)).not.toContain(member.name);
  });

  it('a user renaming themselves in an organization scope delivers one user.updated to the project they belong to', async () => {
    const member = await TestUser.create({ withOrgAccount: true });
    await owner.inviteMember(org.id, member.email);
    await member.acceptInvitation(org.id);
    const profile = await member.getProfile();
    const memberUserId = (
      profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } }
    ).data!.accounts![0]!.owner!.id;
    await addProjectUserForE2e(projectId, memberUserId);

    // An organization scope names no project: only the user's own memberships reach the subscription.
    const res = await graphqlRequest<{ updateUser?: { id: string } }>({
      query: print(UpdateUserDocument),
      accessToken: member.accessToken,
      variables: {
        id: memberUserId,
        input: { scope: { tenant: Tenant.Organization, id: org.id }, name: 'E2E Renamed Member' },
      },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const rows = await waitForDeliveries(
      subscriptionId,
      'user.updated',
      (r) => ofType(r, 'user.updated').some((row) => row.subject_user_id === memberUserId),
      90_000
    );
    const updated = ofType(rows, 'user.updated').filter((r) => r.subject_user_id === memberUserId);
    expect(updated).toHaveLength(1);
    expect(updated[0]!.payload.projectIds).toContain(projectId);

    // The names of the changed fields travel, never their values.
    const envelope = envelopeOf(updated[0]!);
    expect(envelope.data.after).toMatchObject({ id: memberUserId, changedFields: ['name'] });
    expect(JSON.stringify(updated[0]!.payload)).not.toContain('E2E Renamed Member');
  });
});
