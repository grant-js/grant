/**
 * E2E: operator set-password write path and `project.user_password_set`.
 *
 * Owner/Admin may set a project user's password. Dev/Viewer may not, until
 * ProjectUser:SetPassword is granted to Dev's group. The write is `admin-set`, so a CDM
 * import never overwrites it. The event is published for every non-import project credential
 * write that changes the stored hash (and only then), carries ids and source only, and neither
 * the password nor any hash reaches an event, a webhook payload, a log or an audit row.
 * A CDM import is silent: it emits no `project.user_password_set`.
 */
import {
  CdmFindBy,
  CdmPasswordAlgorithm,
  CreateProjectAppDocument,
  CreateUserDocument,
  SetProjectUserPasswordDocument,
  Tenant,
} from '@grantjs/schema';
import { hashSync } from 'bcrypt';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { cdmWithRoleTemplate } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { containerLogsAvailable, readContainerLogs } from '../helpers/container-logs';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { postImport, resolveJob, scopeForOrganizationProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

/** Sentinels: none of these strings may appear anywhere but the credential row itself. */
const SENTINEL_PASSWORD = 'Sentinel-Passw0rd-Zq81!';
const SENTINEL_HASH_PASSWORD = 'Sentinel-Imp0rted-Hash-Qw3!';
const WEAK_PASSWORD = 'weak-sentinel-pw';
const STRONG_PASSWORD = 'Operator-Set-Passw0rd-7!';
const OTHER_PASSWORD = 'Operator-Other-Passw0rd-9!';

const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';
const ROLE_VIEWER = 'roles.names.organizationViewer';

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
    data?: { after?: Record<string, unknown> } & Record<string, unknown>;
    projectIds?: string[];
  };
  occurred_at: Date;
}

interface CredentialRow extends Record<string, unknown> {
  hash: string;
  source: string;
  updated_at: Date;
}

afterAll(async () => {
  await closeDbHelper();
});

function isForbidden(res: {
  body: { errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
}): boolean {
  return Boolean(
    res.body.errors?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
  );
}

describe('Operator set-password', () => {
  let owner: TestUser;
  let admin: TestUser;
  let dev: TestUser;
  let viewer: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let projectAppId: string;
  let subscriptionId: string;
  let memberId: string;
  let memberEmail: string;
  let uniqueStamp: string;

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });

  const gql = <T>(
    token: string,
    document: Parameters<typeof print>[0],
    variables: Record<string, unknown>
  ) => graphqlRequest<T>({ query: print(document), accessToken: token, variables });

  const setPassword = (token: string, userId: string, password: string) =>
    gql<{ setProjectUserPassword?: { id: string } }>(token, SetProjectUserPasswordDocument, {
      input: { userId, password, scope: projectScope() },
    });

  async function createProjectUser(
    token: string,
    name: string,
    email?: string
  ): Promise<{ id?: string; errors?: unknown }> {
    const res = await gql<{ createUser?: { id: string } }>(token, CreateUserDocument, {
      input: { name, scope: projectScope(), ...(email !== undefined ? { email } : {}) },
    });
    return { id: res.body.data?.createUser?.id, errors: res.body.errors };
  }

  async function credentialOf(userId: string): Promise<CredentialRow | undefined> {
    const rows = await query<CredentialRow>`
      SELECT hash, source, updated_at
      FROM project_user_credentials
      WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL
    `;
    return rows[0];
  }

  async function passwordEvents(userId: string): Promise<EventRow[]> {
    return query<EventRow>`
      SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
             e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
      FROM event_log e
      WHERE e.type = ${'project.user_password_set'}
        AND e.subject_user_id = ${userId}::uuid
      ORDER BY e.sequence ASC
    `;
  }

  async function passwordEventCount(userId: string): Promise<number> {
    return (await passwordEvents(userId)).length;
  }

  async function userIdForEmail(email: string): Promise<string> {
    const rows = await query<{ user_id: string }>`
      SELECT user_id::text AS user_id
      FROM user_authentication_methods
      WHERE provider = 'email' AND provider_id = ${email} AND deleted_at IS NULL
    `;
    expect(rows).toHaveLength(1);
    return rows[0]!.user_id;
  }

  async function importPasswordUser(roleKey: string, email: string, hash: string): Promise<void> {
    const imported = await postImport(
      owner.authHeader,
      projectId,
      scopeForOrganizationProject(org.id, projectId),
      cdmWithRoleTemplate(roleKey, {
        users: [
          {
            key: { value: email, findBy: CdmFindBy.Email },
            name: 'E2E Imported Member',
            roles: [roleKey],
            groups: [],
            permissions: [],
            tags: [],
            primaryTag: null,
            apiKeys: [],
            password: { algorithm: CdmPasswordAlgorithm.Bcrypt, hash },
            metadata: null,
          },
        ],
      })
    );
    expect(imported.status, JSON.stringify(imported.body)).toBe(202);
    await resolveJob(
      owner.authHeader,
      projectId,
      scopeForOrganizationProject(org.id, projectId),
      imported.job
    );
  }

  it('Setup: org, project, app, roles, webhook subscription', async () => {
    uniqueStamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Set Password Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Set Password Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as IdBody).data!.id;

    const appRes = await gql<{ createProjectApp?: { id: string } }>(
      owner.accessToken,
      CreateProjectAppDocument,
      {
        input: {
          scope: projectScope(),
          name: 'E2E Set Password App',
          redirectUris: ['https://example.com/oauth/callback'],
          enabledProviders: ['email'],
          allowSignUp: false,
        },
      }
    );
    expect(appRes.body.errors, JSON.stringify(appRes.body.errors)).toBeUndefined();
    projectAppId = appRes.body.data!.createProjectApp!.id;

    const adminRoleId = await getOrganizationRoleIdByName(org.id, ROLE_ADMIN);
    const devRoleId = await getOrganizationRoleIdByName(org.id, ROLE_DEV);
    const viewerRoleId = await getOrganizationRoleIdByName(org.id, ROLE_VIEWER);
    expect(adminRoleId && devRoleId && viewerRoleId).toBeTruthy();

    const adminEmail = `e2e-set-pw-admin-${uniqueStamp}@test.grant.dev`;
    const devEmail = `e2e-set-pw-dev-${uniqueStamp}@test.grant.dev`;
    const viewerEmail = `e2e-set-pw-viewer-${uniqueStamp}@test.grant.dev`;

    await owner.inviteMember(org.id, adminEmail, adminRoleId!);
    await owner.inviteMember(org.id, devEmail, devRoleId!);
    await owner.inviteMember(org.id, viewerEmail, viewerRoleId!);

    admin = await TestUser.create({ email: adminEmail, withOrgAccount: true });
    dev = await TestUser.create({ email: devEmail, withOrgAccount: true });
    viewer = await TestUser.create({ email: viewerEmail, withOrgAccount: true });
    await admin.acceptInvitation(org.id);
    await dev.acceptInvitation(org.id);
    await viewer.acceptInvitation(org.id);

    const res = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: projectScope(),
        url: 'https://example.com/grant-e2e-set-password',
        eventTypes: ['project.user_password_set'],
        description: 'E2E operator set-password',
        active: true,
      });
    expect(res.status).toBe(201);
    subscriptionId = (res.body as IdBody).data!.id;

    memberEmail = `e2e-set-pw-member-${uniqueStamp}@test.grant.dev`;
    const created = await createProjectUser(
      owner.accessToken,
      'E2E Set Password Member',
      memberEmail
    );
    expect(created.errors, JSON.stringify(created.errors)).toBeUndefined();
    memberId = created.id!;
    expect(await credentialOf(memberId)).toBeUndefined();
  });

  it('Owner can set a project user password; it is stored as admin-set and the Email stays unverified', async () => {
    const res = await setPassword(owner.accessToken, memberId, STRONG_PASSWORD);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectUserPassword?.id).toBe(memberId);
    expect(JSON.stringify(res.body)).not.toContain(STRONG_PASSWORD);

    const credential = await credentialOf(memberId);
    expect(credential?.source).toBe('admin-set');
    expect(credential?.hash).toMatch(/^\$2[aby]\$/);
    expect(credential?.hash).not.toContain(STRONG_PASSWORD);

    const methods = await query<{ is_verified: boolean }>`
      SELECT is_verified FROM user_authentication_methods
      WHERE provider = 'email' AND provider_id = ${memberEmail} AND deleted_at IS NULL
    `;
    expect(methods[0]?.is_verified).toBe(false);
  });

  it('publishes project.user_password_set with ids and source only', async () => {
    const events = await passwordEvents(memberId);
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.subject_user_id).toBe(memberId);
    expect(event.payload.data?.after).toEqual({ projectId, userId: memberId, source: 'admin-set' });
    expect(event.scope_id).toBe(`${org.id}:${projectId}`);
    expect(JSON.stringify(event.payload)).not.toMatch(/"[^"]*(password|hash|secret)[^"]*"\s*:/i);
  });

  it('Admin can set a project user password', async () => {
    const res = await setPassword(admin.accessToken, memberId, OTHER_PASSWORD);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectUserPassword?.id).toBe(memberId);
  });

  it('the same password set twice writes a new hash and publishes again', async () => {
    const before = await credentialOf(memberId);
    const eventsBefore = await passwordEventCount(memberId);

    const res = await setPassword(owner.accessToken, memberId, OTHER_PASSWORD);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const after = await credentialOf(memberId);
    expect(after?.hash).not.toBe(before?.hash);
    expect(await passwordEventCount(memberId)).toBe(eventsBefore + 1);
  });

  it('Dev and Viewer are denied, and nothing is written or published', async () => {
    const before = await credentialOf(memberId);
    const eventsBefore = await passwordEventCount(memberId);

    expect(isForbidden(await setPassword(dev.accessToken, memberId, STRONG_PASSWORD))).toBe(true);
    expect(isForbidden(await setPassword(viewer.accessToken, memberId, STRONG_PASSWORD))).toBe(
      true
    );

    expect((await credentialOf(memberId))?.hash).toBe(before?.hash);
    expect(await passwordEventCount(memberId)).toBe(eventsBefore);
  });

  it('Dev can set a password after ProjectUser:SetPassword is granted to that role group', async () => {
    const permissionRows = await query<{ id: string }>`
      SELECT p.id
      FROM permissions p
      INNER JOIN resources r ON r.id = p.resource_id
      WHERE p.action = ${'SetPassword'}
        AND r.slug = ${'ProjectUser'}
        AND p.deleted_at IS NULL
      LIMIT 1
    `;
    const setPasswordPermissionId = permissionRows[0]?.id;
    expect(setPasswordPermissionId).toBeTruthy();

    const groupRows = await query<{ id: string }>`
      SELECT g.id
      FROM groups g
      INNER JOIN role_groups rg ON rg.group_id = g.id AND rg.deleted_at IS NULL
      INNER JOIN roles r ON r.id = rg.role_id AND r.deleted_at IS NULL
      INNER JOIN organization_roles orl ON orl.role_id = r.id AND orl.deleted_at IS NULL
      WHERE orl.organization_id = ${org.id}::uuid
        AND r.name = ${ROLE_DEV}
        AND g.name = ${'groups.names.userDev'}
        AND g.deleted_at IS NULL
      LIMIT 1
    `;
    const groupId = groupRows[0]?.id;
    expect(groupId).toBeTruthy();

    const current = await query<{ permission_id: string }>`
      SELECT permission_id
      FROM group_permissions
      WHERE group_id = ${groupId}::uuid AND deleted_at IS NULL
    `;
    const permissionIds = [
      ...new Set([...current.map((row) => row.permission_id), setPasswordPermissionId!]),
    ];

    const patch = await apiClient()
      .patch(`/api/groups/${groupId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ permissionIds });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    const grantedDevEmail = `e2e-set-pw-dev2-${uniqueStamp}@test.grant.dev`;
    await owner.inviteMember(
      org.id,
      grantedDevEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!
    );
    const grantedDev = await TestUser.create({ email: grantedDevEmail, withOrgAccount: true });
    await grantedDev.acceptInvitation(org.id);

    const res = await setPassword(grantedDev.accessToken, memberId, STRONG_PASSWORD);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectUserPassword?.id).toBe(memberId);
  });

  it('REST PUT /api/users/:id/password sets the password', async () => {
    const before = await credentialOf(memberId);
    const put = await apiClient()
      .put(`/api/users/${memberId}/password`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope(), password: OTHER_PASSWORD });
    expect(put.status, JSON.stringify(put.body)).toBe(200);
    expect(JSON.stringify(put.body)).not.toContain(OTHER_PASSWORD);

    const after = await credentialOf(memberId);
    expect(after?.hash).not.toBe(before?.hash);
    expect(after?.source).toBe('admin-set');
  });

  it('REST PUT is denied for Viewer', async () => {
    const put = await apiClient()
      .put(`/api/users/${memberId}/password`)
      .set('Authorization', viewer.authHeader)
      .send({ scope: projectScope(), password: STRONG_PASSWORD });
    expect(put.status).toBe(403);
  });

  it('a password the policy rejects is refused without a sample, before anything is written', async () => {
    const before = await credentialOf(memberId);
    const eventsBefore = await passwordEventCount(memberId);

    const graphql = await setPassword(owner.accessToken, memberId, WEAK_PASSWORD);
    expect(graphql.body.errors).toBeDefined();
    expect(JSON.stringify(graphql.body)).not.toContain(WEAK_PASSWORD);

    const rest = await apiClient()
      .put(`/api/users/${memberId}/password`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope(), password: WEAK_PASSWORD });
    expect(rest.status).toBe(400);
    expect(JSON.stringify(rest.body)).not.toContain(WEAK_PASSWORD);

    const emptyRest = await apiClient()
      .put(`/api/users/${memberId}/password`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope(), password: '' });
    expect(emptyRest.status).toBe(400);

    expect((await credentialOf(memberId))?.hash).toBe(before?.hash);
    expect(await passwordEventCount(memberId)).toBe(eventsBefore);
  });

  it('refuses a non-member and an organization scope, and never creates a credential', async () => {
    const outsider = await TestUser.create({ withOrgAccount: true });
    const profile = await outsider.getProfile();
    const outsiderId = (profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } })
      .data!.accounts![0]!.owner!.id;

    const missing = await setPassword(owner.accessToken, outsiderId, STRONG_PASSWORD);
    expect(missing.body.errors).toBeDefined();
    expect(
      missing.body.errors?.some(
        (e) => e.extensions?.code === 'NOT_FOUND' || e.message.toLowerCase().includes('not found')
      )
    ).toBe(true);
    expect(
      (
        await query<{ n: string }>`
          SELECT COUNT(*)::text AS n FROM project_user_credentials
          WHERE user_id = ${outsiderId}::uuid AND deleted_at IS NULL
        `
      )[0]?.n
    ).toBe('0');

    const before = await credentialOf(memberId);
    const orgScoped = await gql(owner.accessToken, SetProjectUserPasswordDocument, {
      input: {
        userId: memberId,
        password: STRONG_PASSWORD,
        scope: { tenant: Tenant.Organization, id: org.id },
      },
    });
    expect(orgScoped.body.errors).toBeDefined();
    expect((await credentialOf(memberId))?.hash).toBe(before?.hash);
  });

  it('revokes the target project app grants only, and leaves other members alone', async () => {
    const stamp = `${uniqueStamp}-${Math.random().toString(36).slice(2)}`;
    const otherId = (await createProjectUser(owner.accessToken, 'E2E Other Grant Member')).id!;
    const grantTokens = { target: `e2e-grant-target-${stamp}`, other: `e2e-grant-other-${stamp}` };
    for (const [token, userId] of [
      [grantTokens.target, memberId],
      [grantTokens.other, otherId],
    ] as const) {
      await query`
        INSERT INTO project_oauth_grants
          (project_app_id, user_id, scope_tenant, scope_id, token, expires_at)
        VALUES (${projectAppId}::uuid, ${userId}::uuid, ${Tenant.OrganizationProject},
                ${`${org.id}:${projectId}`}, ${token}, now() + interval '1 day')
      `;
    }

    const res = await setPassword(owner.accessToken, memberId, STRONG_PASSWORD);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const grants = await query<{ token: string; revoked: boolean }>`
      SELECT token, deleted_at IS NOT NULL AS revoked
      FROM project_oauth_grants
      WHERE token IN (${grantTokens.target}, ${grantTokens.other})
    `;
    expect(grants.find((g) => g.token === grantTokens.target)?.revoked).toBe(true);
    expect(grants.find((g) => g.token === grantTokens.other)?.revoked).toBe(false);
  });

  describe('CDM import (silent) and the admin-set guard', () => {
    const roleKey = () => `e2e-set-pw-${uniqueStamp}`;
    const hashOne = () => hashSync('Imported-Passw0rd-One-1', 4);
    const hashTwo = () => hashSync('Imported-Passw0rd-Two-2', 4);

    it('an import never overwrites an operator-set password and publishes nothing for it', async () => {
      const email = `e2e-set-pw-pingpong-${uniqueStamp}@test.grant.dev`;
      const created = await createProjectUser(owner.accessToken, 'E2E Ping Pong Member', email);
      expect(created.errors, JSON.stringify(created.errors)).toBeUndefined();
      const userId = created.id!;

      const set = await setPassword(owner.accessToken, userId, STRONG_PASSWORD);
      expect(set.body.errors, JSON.stringify(set.body.errors)).toBeUndefined();
      const before = await credentialOf(userId);
      const eventsBefore = await passwordEventCount(userId);

      await importPasswordUser(roleKey(), email, hashTwo());

      const after = await credentialOf(userId);
      expect(after?.source).toBe('admin-set');
      expect(after?.hash).toBe(before?.hash);
      expect(await passwordEventCount(userId)).toBe(eventsBefore);
    });

    it('an import emits no project.user_password_set, whether it writes, replaces or finds the same hash', async () => {
      const email = `e2e-set-pw-import-${uniqueStamp}@test.grant.dev`;
      const first = hashOne();

      await importPasswordUser(roleKey(), email, first);
      const userId = await userIdForEmail(email);
      expect((await credentialOf(userId))?.source).toBe('cdm-import');
      expect(await passwordEventCount(userId)).toBe(0);

      // Same hash again: nothing is written.
      await importPasswordUser(roleKey(), email, first);
      expect(await passwordEventCount(userId)).toBe(0);

      // A different hash replaces the import's own credential, and is still silent.
      const second = hashTwo();
      await importPasswordUser(roleKey(), email, second);
      expect((await credentialOf(userId))?.hash).toBe(second);
      expect(await passwordEventCount(userId)).toBe(0);
    });

    it('an operator set after an import replaces it, publishes only the admin-set write, and is then final', async () => {
      const email = `e2e-set-pw-after-import-${uniqueStamp}@test.grant.dev`;
      await importPasswordUser(roleKey(), email, hashOne());
      const userId = await userIdForEmail(email);

      const set = await setPassword(owner.accessToken, userId, STRONG_PASSWORD);
      expect(set.body.errors, JSON.stringify(set.body.errors)).toBeUndefined();
      const credential = await credentialOf(userId);
      expect(credential?.source).toBe('admin-set');

      await importPasswordUser(roleKey(), email, hashTwo());
      expect((await credentialOf(userId))?.hash).toBe(credential?.hash);

      const sources = (await passwordEvents(userId)).map((e) => e.payload.data?.after?.source);
      expect(sources).toEqual(['admin-set']);
    });
  });

  it('neither the password nor a hash reaches an event, a webhook payload, an audit row or the logs', async () => {
    const importEmail = `e2e-set-pw-sentinel-${uniqueStamp}@test.grant.dev`;
    const sentinelHash = hashSync(SENTINEL_HASH_PASSWORD, 4);

    const res = await setPassword(owner.accessToken, memberId, SENTINEL_PASSWORD);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const sentinelCredential = await credentialOf(memberId);

    const rest = await apiClient()
      .put(`/api/users/${memberId}/password`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope(), password: SENTINEL_PASSWORD });
    expect(rest.status, JSON.stringify(rest.body)).toBe(200);

    await importPasswordUser(`e2e-set-pw-${uniqueStamp}`, importEmail, sentinelHash);
    const importedUserId = await userIdForEmail(importEmail);

    const secrets = [SENTINEL_PASSWORD, sentinelHash, sentinelCredential!.hash];

    expect(await passwordEventCount(importedUserId)).toBe(0);
    const events = await passwordEvents(memberId);
    expect(events.length).toBeGreaterThan(0);
    for (const row of events) {
      for (const secret of secrets) {
        expect(JSON.stringify(row.payload)).not.toContain(secret);
      }
    }

    const credentialIds = (
      await query<{ id: string }>`
        SELECT id::text AS id FROM project_user_credentials
        WHERE project_id = ${projectId}::uuid AND user_id IN (${memberId}::uuid, ${importedUserId}::uuid)
      `
    ).map((row) => row.id);
    const auditRows = await query<{
      old_values: string | null;
      new_values: string | null;
      metadata: string | null;
      action: string;
    }>`
      SELECT action, old_values, new_values, metadata
      FROM project_user_credential_audit_logs
      WHERE project_user_credential_id IN (${credentialIds[0]}::uuid, ${credentialIds[1]}::uuid)
    `;
    expect(auditRows.length).toBeGreaterThan(0);
    for (const row of auditRows) {
      for (const secret of secrets) {
        expect(JSON.stringify(row)).not.toContain(secret);
      }
    }

    const deadline = Date.now() + 25_000;
    let deliveries: EventRow[] = [];
    while (Date.now() < deadline) {
      deliveries = await query<EventRow>`
        SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
               e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
        FROM webhook_delivery_attempts d
        INNER JOIN event_log e ON e.id = d.event_id
        WHERE d.subscription_id = ${subscriptionId}::uuid
          AND e.type = ${'project.user_password_set'}
      `;
      if (deliveries.length > 0) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    expect(deliveries.length).toBeGreaterThan(0);
    for (const row of deliveries) {
      const envelope = buildCloudEventEnvelope(
        {
          id: row.id,
          sequence: Number(row.sequence),
          type: 'project.user_password_set',
          category: row.category as 'membership',
          deliveryClass: row.delivery_class,
          scope: {
            tenant: row.scope_tenant as typeof Tenant.OrganizationProject,
            id: row.scope_id,
          },
          actorUserId: row.actor_user_id,
          subjectUserId: row.subject_user_id,
          aggregate: row.payload.aggregate,
          data: row.payload.data ?? {},
          occurredAt: row.occurred_at,
        },
        'https://grant.e2e.invalid'
      );
      const serialized = JSON.stringify(envelope);
      for (const secret of secrets) {
        expect(serialized).not.toContain(secret);
      }
      // Omitted, not redacted: a redacted key would be a smell.
      expect(serialized).not.toContain('[redacted]');
    }

    if (containerLogsAvailable()) {
      const logs = readContainerLogs();
      for (const secret of [SENTINEL_PASSWORD, WEAK_PASSWORD, sentinelHash]) {
        expect(logs).not.toContain(secret);
      }
    }
  });
});
