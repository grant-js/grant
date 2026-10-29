/**
 * E2E: a scoped operation acts only in the scope the request was authorized in.
 *
 * A session request is authorized against the scope it carries (`x-scope-*` headers, else the scope
 * in its variables or body); an API key request against the key's own scope. The operation acts on
 * the scope in its input. The transport guards refuse a request whose input names another scope
 * than the one it was authorized in, before any lookup or permission check, so nothing is written:
 * no row, no audit entry, no event in the outbox.
 *
 * Fixtures are synthetic: two organizations with one project each. A session user who owns
 * organization A sends organization-A scope headers (and, in a second pass, project-A headers) and
 * an input that names a project of organization B. The same calls with matching scopes succeed.
 * The two operator operations added with set-password (`setProjectUserPassword`,
 * `exportProjectUserCredentials`) are in the matrix.
 */
import {
  CreateApiKeyDocument,
  CreateUserDocument,
  DeleteUserDocument,
  ExportProjectUserCredentialsDocument,
  SetProjectUserEmailDocument,
  SetProjectUserPasswordDocument,
  Tenant,
  TokenType,
  UpdateUserDocument,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { mapEventLogToDomainEvent } from '../../../src/lib/events/event-log-mapper.lib';
import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { apiClient } from '../helpers/api-client';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';

// The seeded system user (SYSTEM_USER_ID default); API-key actors are attributed to it.
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID ?? '00000000-0000-0000-0000-000000000000';

const PASSWORD = 'Guard-Fixture-Passw0rd-7!';
const OTHER_PASSWORD = 'Guard-Fixture-Other-Passw0rd-9!';

interface IdBody {
  data?: { id: string };
}

interface Scope {
  tenant: Tenant;
  id: string;
}

interface GqlResult {
  status: number;
  body: {
    data?: Record<string, unknown> | null;
    errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
  };
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
    actor?: { tokenId: string; tokenType: string };
  };
  occurred_at: Date;
}

const isForbidden = (res: GqlResult): boolean =>
  Boolean(
    res.body.errors?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
  );

const scopeHeaders = (scope: Scope) => ({
  'x-scope-tenant': scope.tenant,
  'x-scope-id': scope.id,
});

describe('Authorized scope guard', () => {
  let uniqueStamp: string;

  // The Dev group is shared by the Dev role of every organization, so the ExportCredentials grant
  // made in setup would reach the Dev members of later scenarios (the export scenario asserts that
  // an ungranted Dev is denied). Put the group back to the permissions it had.
  afterAll(async () => {
    try {
      if (devGroup) {
        const restore = await apiClient()
          .patch(`/api/groups/${devGroup.id}`)
          .query({ scopeId: orgA.id, tenant: Tenant.Organization })
          .set('Authorization', ownerA.authHeader)
          .send({ permissionIds: devGroup.permissionIds });
        if (restore.status !== 200) {
          throw new Error(`could not restore the Dev group: ${JSON.stringify(restore.body)}`);
        }
      }
    } finally {
      await closeDbHelper();
    }
  });

  let ownerA: TestUser;
  let ownerB: TestUser;
  let exporter: TestUser;
  let orgA: { id: string };
  let orgB: { id: string };
  let projectAId: string;
  let projectBId: string;
  let memberA: string;
  let memberB: string;
  /** A project-managed user of project A: no authentication method, so operators may rename it. */
  let managedA: string;
  let keyToken: string;
  /** The id of the Admin key: the `sub` and `jti` of `keyToken`, recorded on the events it causes. */
  let keyId: string;
  let exportKeyToken: string;
  /** The permissions of the Dev group before the setup granted ExportCredentials to it. */
  let devGroup: { id: string; permissionIds: string[] } | undefined;

  const orgAScope = (): Scope => ({ tenant: Tenant.Organization, id: orgA.id });
  const projectAScope = (): Scope => ({
    tenant: Tenant.OrganizationProject,
    id: `${orgA.id}:${projectAId}`,
  });
  const projectBScope = (): Scope => ({
    tenant: Tenant.OrganizationProject,
    id: `${orgB.id}:${projectBId}`,
  });

  const gql = (
    token: string,
    document: Parameters<typeof print>[0],
    variables: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<GqlResult> =>
    graphqlRequest({ query: print(document), accessToken: token, variables, headers });

  // ---- what a refused call must leave untouched ------------------------------------------------

  /**
   * Everything a write to `targetUserId` in project B would touch, plus the audit and outbox rows
   * the actor (or the scope) would have produced. Two reads around a refused call must be equal.
   */
  async function footprint(targetUserId: string | null, actorUserId: string | null) {
    const scopeId = projectBScope().id;
    const target = targetUserId ?? '00000000-0000-0000-0000-000000000000';
    const actor = actorUserId ?? '00000000-0000-0000-0000-000000000000';

    const count = async (rows: Promise<Array<{ n: string }>>) => Number((await rows)[0]?.n ?? 0);

    return {
      user: await query<Record<string, unknown>>`
        SELECT name, deleted_at, updated_at FROM users WHERE id = ${target}::uuid
      `,
      membership: await query<Record<string, unknown>>`
        SELECT id, deleted_at, updated_at FROM project_users
        WHERE project_id = ${projectBId}::uuid AND user_id = ${target}::uuid
      `,
      emailMethods: await query<Record<string, unknown>>`
        SELECT provider_id, is_verified, updated_at FROM user_authentication_methods
        WHERE user_id = ${target}::uuid AND deleted_at IS NULL
        ORDER BY provider_id
      `,
      credentials: await query<Record<string, unknown>>`
        SELECT hash, source, updated_at FROM project_user_credentials
        WHERE project_id = ${projectBId}::uuid AND user_id = ${target}::uuid AND deleted_at IS NULL
      `,
      userAuditRows: await count(query<{ n: string }>`
        SELECT COUNT(*)::text AS n FROM user_audit_logs
        WHERE user_id = ${target}::uuid OR performed_by = ${actor}::uuid OR scope_id = ${scopeId}
      `),
      authMethodAuditRows: await count(query<{ n: string }>`
        SELECT COUNT(*)::text AS n FROM user_authentication_method_audit_logs a
        WHERE a.performed_by = ${actor}::uuid OR a.scope_id = ${scopeId}
          OR a.user_authentication_method_id IN (
            SELECT m.id FROM user_authentication_methods m WHERE m.user_id = ${target}::uuid
          )
      `),
      credentialAuditRows: await count(query<{ n: string }>`
        SELECT COUNT(*)::text AS n FROM project_user_credential_audit_logs
        WHERE performed_by = ${actor}::uuid OR scope_id = ${scopeId}
      `),
      outboxRows: await count(query<{ n: string }>`
        SELECT COUNT(*)::text AS n FROM event_log
        WHERE actor_user_id = ${actor}::uuid OR subject_user_id = ${target}::uuid
          OR scope_id = ${scopeId}
      `),
    };
  }

  async function sentinelUsers(name: string): Promise<number> {
    const rows = await query<{ n: string }>`
      SELECT COUNT(*)::text AS n FROM users WHERE name = ${name}
    `;
    return Number(rows[0]?.n ?? 0);
  }

  // ---- the operations under test ---------------------------------------------------------------

  interface Call {
    name: string;
    /** Who sends it: the organization-A owner, or the member that holds ExportCredentials. */
    actor: () => TestUser;
    send: (
      target: { userId: string; scope: Scope },
      headers?: Record<string, string>
    ) => Promise<{
      refused: boolean;
      ok: boolean;
      raw: unknown;
    }>;
  }

  const graphqlCall = (
    name: string,
    actor: () => TestUser,
    build: (target: { userId: string; scope: Scope }) => {
      document: Parameters<typeof print>[0];
      variables: Record<string, unknown>;
    },
    field: string
  ): Call => ({
    name,
    actor,
    send: async (target, headers) => {
      const { document, variables } = build(target);
      const res = await gql(actor().accessToken, document, variables, headers);
      return {
        refused: isForbidden(res),
        ok: !res.body.errors && Boolean(res.body.data?.[field]),
        raw: res.body,
      };
    },
  });

  const calls = (): Call[] => [
    graphqlCall(
      'setProjectUserEmail',
      () => ownerA,
      ({ userId, scope }) => ({
        document: SetProjectUserEmailDocument,
        variables: {
          input: {
            userId,
            email: `guard-set-${uniqueStamp}-${Math.random()}@test.grant.dev`,
            scope,
          },
        },
      }),
      'setProjectUserEmail'
    ),
    graphqlCall(
      'updateUser',
      () => ownerA,
      ({ userId, scope }) => ({
        document: UpdateUserDocument,
        variables: { id: userId, input: { scope, name: `Guard Renamed ${Math.random()}` } },
      }),
      'updateUser'
    ),
    graphqlCall(
      'setProjectUserPassword',
      () => ownerA,
      ({ userId, scope }) => ({
        document: SetProjectUserPasswordDocument,
        variables: { input: { userId, password: OTHER_PASSWORD, scope } },
      }),
      'setProjectUserPassword'
    ),
    graphqlCall(
      'exportProjectUserCredentials',
      () => exporter,
      ({ userId, scope }) => ({
        document: ExportProjectUserCredentialsDocument,
        variables: { input: { scope, userIds: [userId] } },
      }),
      'exportProjectUserCredentials'
    ),
    {
      name: 'createUser',
      actor: () => ownerA,
      send: async ({ scope }, headers) => {
        const res = await gql(
          ownerA.accessToken,
          CreateUserDocument,
          { input: { name: createdName(), scope } },
          headers
        );
        return { refused: isForbidden(res), ok: !res.body.errors, raw: res.body };
      },
    },
    {
      name: 'deleteUser',
      actor: () => ownerA,
      send: async ({ userId, scope }, headers) => {
        const res = await gql(
          ownerA.accessToken,
          DeleteUserDocument,
          { id: userId, scope },
          headers
        );
        return { refused: isForbidden(res), ok: !res.body.errors, raw: res.body };
      },
    },
    {
      name: 'PATCH /api/users/:id',
      actor: () => ownerA,
      send: async ({ userId, scope }, headers) => {
        const req = apiClient()
          .patch(`/api/users/${userId}`)
          .set('Authorization', ownerA.authHeader)
          .send({ scope, name: `Guard Rest Renamed ${Math.random()}` });
        for (const [name, value] of Object.entries(headers ?? {})) req.set(name, value);
        const res = await req;
        return {
          refused: res.status === 403 && (res.body as { code?: string }).code === 'FORBIDDEN',
          ok: res.status === 200,
          raw: res.body,
        };
      },
    },
  ];

  /** The name `createUser` uses, remembered so the refused calls can prove no user was created. */
  let createdNamePrefix = '';
  const createdName = () => createdNamePrefix;

  // ---- setup ------------------------------------------------------------------------------------

  it('Setup: two organizations with a project each, a member in each, a holder of ExportCredentials, an API key', async () => {
    uniqueStamp = `${Date.now()}`;
    createdNamePrefix = `Guard Created ${uniqueStamp}`;

    ownerA = await TestUser.create({ withOrgAccount: true });
    ownerB = await TestUser.create({ withOrgAccount: true });
    orgA = await ownerA.createOrganization('E2E Guard Org A');
    orgB = await ownerB.createOrganization('E2E Guard Org B');

    const projectA = await ownerA.tryCreateProject(orgA.id, 'E2E Guard Project A');
    const projectB = await ownerB.tryCreateProject(orgB.id, 'E2E Guard Project B');
    expect(projectA.status).toBe(201);
    expect(projectB.status).toBe(201);
    projectAId = (projectA.body as IdBody).data!.id;
    projectBId = (projectB.body as IdBody).data!.id;

    const memberOf = async (owner: TestUser, scope: Scope, label: string) => {
      const res = await gql(owner.accessToken, CreateUserDocument, {
        input: {
          name: `Guard Member ${label} ${uniqueStamp}`,
          scope,
          email: `guard-${label}-${uniqueStamp}@test.grant.dev`,
        },
      });
      expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
      const id = (res.body.data?.createUser as { id: string }).id;
      const set = await gql(owner.accessToken, SetProjectUserPasswordDocument, {
        input: { userId: id, password: PASSWORD, scope },
      });
      expect(set.body.errors, JSON.stringify(set.body.errors)).toBeUndefined();
      return id;
    };
    memberA = await memberOf(ownerA, projectAScope(), 'a');
    memberB = await memberOf(ownerB, projectBScope(), 'b');

    // No email and no password: no authentication method, so an operator may edit its profile.
    const managed = await gql(ownerA.accessToken, CreateUserDocument, {
      input: { name: `Guard Managed A ${uniqueStamp}`, scope: projectAScope() },
    });
    expect(managed.body.errors, JSON.stringify(managed.body.errors)).toBeUndefined();
    managedA = (managed.body.data?.createUser as { id: string }).id;

    // ExportCredentials is held by no standard group: grant it to the Dev group of organization A,
    // then add a member in that role (the same setup the export scenario uses).
    const permissionRows = await query<{ id: string }>`
      SELECT p.id FROM permissions p
      INNER JOIN resources r ON r.id = p.resource_id
      WHERE p.action = ${'ExportCredentials'} AND r.slug = ${'ProjectUser'} AND p.deleted_at IS NULL
      LIMIT 1
    `;
    const groupRows = await query<{ id: string }>`
      SELECT g.id FROM groups g
      INNER JOIN role_groups rg ON rg.group_id = g.id AND rg.deleted_at IS NULL
      INNER JOIN roles r ON r.id = rg.role_id AND r.deleted_at IS NULL
      INNER JOIN organization_roles orl ON orl.role_id = r.id AND orl.deleted_at IS NULL
      WHERE orl.organization_id = ${orgA.id}::uuid AND r.name = ${ROLE_DEV}
        AND g.name = ${'groups.names.userDev'} AND g.deleted_at IS NULL
      LIMIT 1
    `;
    const exportPermissionId = permissionRows[0]?.id;
    const groupId = groupRows[0]?.id;
    expect(exportPermissionId && groupId).toBeTruthy();

    const current = await query<{ permission_id: string }>`
      SELECT permission_id FROM group_permissions
      WHERE group_id = ${groupId!}::uuid AND deleted_at IS NULL
    `;
    devGroup = { id: groupId!, permissionIds: current.map((row) => row.permission_id) };
    const patch = await apiClient()
      .patch(`/api/groups/${groupId}`)
      .query({ scopeId: orgA.id, tenant: Tenant.Organization })
      .set('Authorization', ownerA.authHeader)
      .send({
        permissionIds: [
          ...new Set([...current.map((row) => row.permission_id), exportPermissionId!]),
        ],
      });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    const exporterEmail = `e2e-guard-exporter-${uniqueStamp}@test.grant.dev`;
    await ownerA.inviteMember(
      orgA.id,
      exporterEmail,
      (await getOrganizationRoleIdByName(orgA.id, ROLE_DEV))!
    );
    exporter = await TestUser.create({ email: exporterEmail, withOrgAccount: true });
    await exporter.acceptInvitation(orgA.id);

    // API keys scoped to project A: one with the Admin role, one with the Dev role (which now holds
    // ExportCredentials, as in the export scenario).
    const mintKey = async (
      roleName: string,
      label: string
    ): Promise<{ accessToken: string; id: string }> => {
      const created = await gql(ownerA.accessToken, CreateApiKeyDocument, {
        input: {
          name: `E2E guard ${label} key ${uniqueStamp}`,
          scope: projectAScope(),
          roleId: (await getOrganizationRoleIdByName(orgA.id, roleName))!,
        },
      });
      expect(created.body.errors, JSON.stringify(created.body.errors)).toBeUndefined();
      const key = created.body.data!.createApiKey as {
        id: string;
        clientId: string;
        clientSecret: string;
      };
      const exchange = await apiClient()
        .post('/api/auth/token')
        .send({ clientId: key.clientId, clientSecret: key.clientSecret, scope: projectAScope() });
      expect(exchange.status, JSON.stringify(exchange.body)).toBe(200);
      const accessToken = (exchange.body as { data: { accessToken: string } }).data.accessToken;
      expect(accessToken).toBeTruthy();
      return { accessToken, id: key.id };
    };
    const adminKey = await mintKey(ROLE_ADMIN, 'admin');
    keyToken = adminKey.accessToken;
    keyId = adminKey.id;
    exportKeyToken = (await mintKey(ROLE_DEV, 'export')).accessToken;
  });

  // ---- a request naming another organization's project is refused and writes nothing ----------

  describe.each([
    ['organization-A headers', () => scopeHeaders(orgAScope())],
    ['project-A headers', () => scopeHeaders(projectAScope())],
  ])('a session request with %s naming a project of organization B', (_label, headers) => {
    it.each([
      'setProjectUserEmail',
      'updateUser',
      'deleteUser',
      'createUser',
      'setProjectUserPassword',
      'exportProjectUserCredentials',
      'PATCH /api/users/:id',
    ])('%s is refused (403 / Forbidden) and nothing is written', async (name) => {
      const call = calls().find((candidate) => candidate.name === name)!;
      const actor = call.actor();
      const before = await footprint(memberB, actor.userId);
      const usersBefore = await sentinelUsers(createdName());

      const result = await call.send({ userId: memberB, scope: projectBScope() }, headers());

      expect(result.refused, JSON.stringify(result.raw)).toBe(true);
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result.raw)).not.toContain(PASSWORD);
      expect(await footprint(memberB, actor.userId)).toEqual(before);
      expect(await sentinelUsers(createdName())).toBe(usersBefore);
    });
  });

  it('a literal scope written inline in the document, which never reaches variables, is refused too', async () => {
    const before = await footprint(memberB, ownerA.userId);
    const target = projectBScope();
    const res = await apiClient()
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .set('Authorization', ownerA.authHeader)
      .set(scopeHeaders(projectAScope()))
      .send({
        query: `mutation {
          updateUser(id: "${memberB}", input: {
            scope: { tenant: ${target.tenant}, id: "${target.id}" }, name: "Guard Inline Literal"
          }) { id }
        }`,
      });

    expect(isForbidden({ status: res.status, body: res.body })).toBe(true);
    expect(await footprint(memberB, ownerA.userId)).toEqual(before);
  });

  // ---- the same calls with matching scopes succeed ---------------------------------------------

  const identityEdits = new Set(['updateUser', 'PATCH /api/users/:id']);

  it.each([
    'setProjectUserEmail',
    'updateUser',
    'createUser',
    'setProjectUserPassword',
    'exportProjectUserCredentials',
    'PATCH /api/users/:id',
  ])('%s succeeds when the headers and the input name the same project', async (name) => {
    const call = calls().find((candidate) => candidate.name === name)!;
    // The users handler refuses an operator edit of a self-managed user's identity (a user with an
    // authentication method), whatever the scope: those two calls target a project-managed user.
    const userId = identityEdits.has(name) ? managedA : memberA;
    const result = await call.send(
      { userId, scope: projectAScope() },
      scopeHeaders(projectAScope())
    );
    expect(result.refused).toBe(false);
    expect(result.ok, JSON.stringify(result.raw)).toBe(true);
  });

  it('deleteUser succeeds when the headers and the input name the same project', async () => {
    const disposable = await gql(ownerA.accessToken, CreateUserDocument, {
      input: { name: `Guard Disposable ${uniqueStamp}`, scope: projectAScope() },
    });
    expect(disposable.body.errors, JSON.stringify(disposable.body.errors)).toBeUndefined();
    const id = (disposable.body.data?.createUser as { id: string }).id;

    const call = calls().find((candidate) => candidate.name === 'deleteUser')!;
    const result = await call.send(
      { userId: id, scope: projectAScope() },
      scopeHeaders(projectAScope())
    );
    expect(result.refused).toBe(false);
    expect(result.ok, JSON.stringify(result.raw)).toBe(true);
  });

  it('a request with no scope headers is authorized by the scope in its variables, in both shapes', async () => {
    // The dashboard sends no x-scope-* header: the scope it authorizes in is the scope it acts on.
    const updated = await gql(ownerA.accessToken, UpdateUserDocument, {
      id: managedA,
      input: { scope: projectAScope(), name: `Guard Dashboard Shape ${uniqueStamp}` },
    });
    expect(updated.body.errors, JSON.stringify(updated.body.errors)).toBeUndefined();

    const disposable = await gql(ownerA.accessToken, CreateUserDocument, {
      input: { name: `Guard Disposable Dashboard ${uniqueStamp}`, scope: projectAScope() },
    });
    const id = (disposable.body.data?.createUser as { id: string }).id;
    const deleted = await gql(ownerA.accessToken, DeleteUserDocument, {
      id,
      scope: projectAScope(),
    });
    expect(deleted.body.errors, JSON.stringify(deleted.body.errors)).toBeUndefined();
  });

  // ---- API key requests are authorized in the key's own scope ----------------------------------

  describe('an API key request', () => {
    it('keeps working with its own scope (operator export, both transports)', async () => {
      const exported = await gql(exportKeyToken, ExportProjectUserCredentialsDocument, {
        input: { scope: projectAScope(), userIds: [memberA] },
      });
      expect(exported.body.errors, JSON.stringify(exported.body.errors)).toBeUndefined();
      expect(exported.body.data?.exportProjectUserCredentials).toBeTruthy();

      const rest = await apiClient()
        .post('/api/users/credentials/export')
        .set('Authorization', `Bearer ${exportKeyToken}`)
        .send({ scope: projectAScope(), userIds: [memberA] });
      expect(rest.status, JSON.stringify(rest.body)).toBe(200);
    });

    it("sets a project user's e-mail and password, and its events name the system user and carry the key id", async () => {
      // The event publisher once wrote the key id as event_log.actor_user_id, which is not a users
      // row: every event-publishing call under a project-level key failed on the foreign key.
      const subscription = await apiClient()
        .post('/api/webhook-subscriptions')
        .set('Authorization', ownerA.authHeader)
        .send({
          scope: projectAScope(),
          url: 'https://example.com/grant-e2e-guard-key-events',
          eventTypes: ['project.user_email_changed', 'project.user_password_set'],
          description: 'E2E authorized scope guard, API-key events',
          active: true,
        });
      expect(subscription.status, JSON.stringify(subscription.body)).toBe(201);
      const subscriptionId = (subscription.body as IdBody).data!.id;

      const created = await gql(ownerA.accessToken, CreateUserDocument, {
        input: { name: `Guard Key Target ${uniqueStamp}`, scope: projectAScope() },
      });
      expect(created.body.errors, JSON.stringify(created.body.errors)).toBeUndefined();
      const targetId = (created.body.data?.createUser as { id: string }).id;

      const email = await gql(keyToken, SetProjectUserEmailDocument, {
        input: {
          userId: targetId,
          email: `guard-key-target-${uniqueStamp}@test.grant.dev`,
          scope: projectAScope(),
        },
      });
      expect(email.body.errors, JSON.stringify(email.body.errors)).toBeUndefined();
      expect((email.body.data?.setProjectUserEmail as { id: string }).id).toBe(targetId);

      const password = await gql(keyToken, SetProjectUserPasswordDocument, {
        input: { userId: targetId, password: OTHER_PASSWORD, scope: projectAScope() },
      });
      expect(password.body.errors, JSON.stringify(password.body.errors)).toBeUndefined();
      expect(JSON.stringify(password.body)).not.toContain(OTHER_PASSWORD);

      const eventsOf = async (type: string) =>
        query<EventRow>`
          SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
                 e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
          FROM event_log e
          WHERE e.type = ${type} AND e.subject_user_id = ${targetId}::uuid
        `;
      const emailEvents = await eventsOf('project.user_email_changed');
      const passwordEvents = await eventsOf('project.user_password_set');
      expect(emailEvents).toHaveLength(1);
      expect(passwordEvents).toHaveLength(1);
      for (const row of [...emailEvents, ...passwordEvents]) {
        expect(row.actor_user_id).toBe(SYSTEM_USER_ID);
        expect(row.payload.actor).toEqual({ tokenId: keyId, tokenType: TokenType.ApiKey });
        expect(JSON.stringify(row.payload.data)).not.toContain(keyId);
      }

      // The relay fans each event out to the subscription; the delivery body is built from the
      // stored row the way the delivery job builds it, and names no key.
      const eventIds = [emailEvents[0]!.id, passwordEvents[0]!.id];
      const deadline = Date.now() + 25_000;
      let delivered: string[] = [];
      while (Date.now() < deadline) {
        const rows = await query<{ event_id: string }>`
          SELECT DISTINCT d.event_id FROM webhook_delivery_attempts d
          WHERE d.subscription_id = ${subscriptionId}::uuid
            AND d.event_id = ANY(${eventIds}::uuid[])
        `;
        delivered = rows.map((row) => row.event_id);
        if (delivered.length === eventIds.length) break;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      expect([...delivered].sort()).toEqual([...eventIds].sort());

      for (const row of [...emailEvents, ...passwordEvents]) {
        const envelope = buildCloudEventEnvelope(
          mapEventLogToDomainEvent({
            ...row,
            sequence: Number(row.sequence),
            deliveryClass: row.delivery_class,
            scopeTenant: row.scope_tenant,
            scopeId: row.scope_id,
            actorUserId: row.actor_user_id,
            subjectUserId: row.subject_user_id,
            occurredAt: row.occurred_at,
          } as never),
          'https://grant.e2e.invalid'
        );
        expect(envelope.grantactor).toEqual({ userId: SYSTEM_USER_ID });
        expect(JSON.stringify(envelope)).not.toContain(keyId);
      }
    });

    it("is refused when the input names another scope than the key's, and writes nothing", async () => {
      const before = await footprint(memberB, null);

      const email = await gql(keyToken, SetProjectUserEmailDocument, {
        input: {
          userId: memberB,
          email: `guard-key-b-${uniqueStamp}@test.grant.dev`,
          scope: projectBScope(),
        },
      });
      expect(isForbidden(email)).toBe(true);

      const password = await gql(keyToken, SetProjectUserPasswordDocument, {
        input: { userId: memberB, password: OTHER_PASSWORD, scope: projectBScope() },
      });
      expect(isForbidden(password)).toBe(true);

      const rest = await apiClient()
        .patch(`/api/users/${memberB}`)
        .set('Authorization', `Bearer ${keyToken}`)
        .send({ scope: projectBScope(), name: 'Guard Key Rest Refused' });
      expect(rest.status).toBe(403);
      expect((rest.body as { code?: string }).code).toBe('FORBIDDEN');

      // A scope of the same organization that is not the key's own scope is refused as well.
      const sameOrg = await gql(keyToken, UpdateUserDocument, {
        id: memberA,
        input: { scope: orgAScope(), name: 'Guard Key Org Scope Refused' },
      });
      expect(isForbidden(sameOrg)).toBe(true);

      expect(await footprint(memberB, null)).toEqual(before);
    });
  });
});
