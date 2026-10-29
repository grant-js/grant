/**
 * E2E: operator set-email write path.
 *
 * Owner/Admin may set an unverified Email method on a project user. Dev/Viewer
 * may not, until ProjectUser:SetEmail is granted to Dev's group. createUser with
 * email is one transaction; uniqueness is ConflictError after trim+lowercase;
 * the event never carries the address. Every write names its operation on the
 * authentication-method audit row, and a refused call leaves no row.
 */
import {
  CreateUserDocument,
  SetProjectUserEmailDocument,
  Tenant,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { apiClient } from '../helpers/api-client';
import { containerLogsAvailable, readContainerLogs } from '../helpers/container-logs';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const SENTINEL = 'sentinel-set-email@example.test';
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
    data?: Record<string, unknown>;
    projectIds?: string[];
  };
  occurred_at: Date;
}

interface AuditRow extends Record<string, unknown> {
  id: string;
  action: string;
  performed_by: string;
  old_provider_id: string | null;
  new_provider_id: string | null;
  operation: string | null;
}

afterAll(async () => {
  await closeDbHelper();
});

/** The Email method's audit rows for one user, oldest first. */
async function emailAuditRows(userId: string): Promise<AuditRow[]> {
  return query<AuditRow>`
    SELECT a.id, a.action, a.performed_by::text AS performed_by,
           a.old_values::jsonb ->> 'providerId' AS old_provider_id,
           a.new_values::jsonb ->> 'providerId' AS new_provider_id,
           a.metadata::jsonb ->> 'operation' AS operation
    FROM user_authentication_method_audit_logs a
    INNER JOIN user_authentication_methods m ON m.id = a.user_authentication_method_id
    WHERE m.user_id = ${userId}::uuid AND m.provider = ${UserAuthenticationMethodProvider.Email}
    ORDER BY a.created_at, a.id
  `;
}

/** Rows written by the actor, whichever method they touch, plus every row of the target's methods. */
async function auditRowCount(actorUserId: string, targetUserId: string): Promise<number> {
  const rows = await query<{ n: string }>`
    SELECT COUNT(*)::text AS n FROM user_authentication_method_audit_logs a
    WHERE a.performed_by = ${actorUserId}::uuid
       OR a.user_authentication_method_id IN (
         SELECT m.id FROM user_authentication_methods m WHERE m.user_id = ${targetUserId}::uuid
       )
  `;
  return Number(rows[0]?.n ?? 0);
}

async function currentEmailAddress(userId: string): Promise<string | undefined> {
  const rows = await query<{ provider_id: string }>`
    SELECT provider_id FROM user_authentication_methods
    WHERE user_id = ${userId}::uuid AND provider = ${UserAuthenticationMethodProvider.Email}
      AND deleted_at IS NULL
  `;
  return rows[0]?.provider_id;
}

/** The rows `userId` gained since `before`. */
async function newEmailAuditRows(userId: string, before: AuditRow[]): Promise<AuditRow[]> {
  const known = new Set(before.map((row) => row.id));
  return (await emailAuditRows(userId)).filter((row) => !known.has(row.id));
}

function isForbidden(res: {
  body: { errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
}): boolean {
  return Boolean(
    res.body.errors?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
  );
}

describe('Operator set-email', () => {
  let owner: TestUser;
  let admin: TestUser;
  let dev: TestUser;
  let viewer: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let subscriptionId: string;
  let memberId: string;
  let uniqueStamp: string;

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });

  const gql = <T>(
    token: string,
    document: Parameters<typeof print>[0],
    variables: Record<string, unknown>
  ) => graphqlRequest<T>({ query: print(document), accessToken: token, variables });

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

  it('Setup: org, project, roles, webhook subscription', async () => {
    uniqueStamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Set Email Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Set Email Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as IdBody).data!.id;

    const adminRoleId = await getOrganizationRoleIdByName(org.id, ROLE_ADMIN);
    const devRoleId = await getOrganizationRoleIdByName(org.id, ROLE_DEV);
    const viewerRoleId = await getOrganizationRoleIdByName(org.id, ROLE_VIEWER);
    expect(adminRoleId && devRoleId && viewerRoleId).toBeTruthy();

    const adminEmail = `e2e-set-email-admin-${uniqueStamp}@test.grant.dev`;
    const devEmail = `e2e-set-email-dev-${uniqueStamp}@test.grant.dev`;
    const viewerEmail = `e2e-set-email-viewer-${uniqueStamp}@test.grant.dev`;

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
        url: 'https://example.com/grant-e2e-set-email',
        eventTypes: ['project.user_email_changed'],
        description: 'E2E operator set-email',
        active: true,
      });
    expect(res.status).toBe(201);
    subscriptionId = (res.body as IdBody).data!.id;
  });

  it('Owner can create a project user with email', async () => {
    const created = await createProjectUser(
      owner.accessToken,
      'E2E Set Email Member',
      `owner-set-${uniqueStamp}@test.grant.dev`
    );
    expect(created.errors, JSON.stringify(created.errors)).toBeUndefined();
    expect(created.id).toBeTruthy();
    memberId = created.id!;
  });

  it('Admin can set project user email', async () => {
    const res = await gql<{ setProjectUserEmail?: { id: string } }>(
      admin.accessToken,
      SetProjectUserEmailDocument,
      {
        input: {
          userId: memberId,
          email: `admin-set-${uniqueStamp}@test.grant.dev`,
          scope: projectScope(),
        },
      }
    );
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectUserEmail?.id).toBe(memberId);
  });

  it('Dev is denied set-email and createUser+email, but can createUser without email', async () => {
    const setRes = await gql(dev.accessToken, SetProjectUserEmailDocument, {
      input: {
        userId: memberId,
        email: `dev-denied-${uniqueStamp}@test.grant.dev`,
        scope: projectScope(),
      },
    });
    expect(isForbidden(setRes)).toBe(true);

    const withEmail = await createProjectUser(
      dev.accessToken,
      'E2E Dev Email Denied',
      `dev-create-${uniqueStamp}@test.grant.dev`
    );
    expect(withEmail.id).toBeUndefined();
    expect(
      (
        withEmail.errors as Array<{ message: string; extensions?: { code?: string } }> | undefined
      )?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
    ).toBe(true);

    const rows = await query<{ n: string }>`
      SELECT COUNT(*)::text AS n FROM users
      WHERE name = ${'E2E Dev Email Denied'} AND deleted_at IS NULL
    `;
    expect(Number(rows[0]?.n ?? 0)).toBe(0);

    const withoutEmail = await createProjectUser(dev.accessToken, 'E2E Dev No Email');
    expect(withoutEmail.errors, JSON.stringify(withoutEmail.errors)).toBeUndefined();
    expect(withoutEmail.id).toBeTruthy();
  });

  it('Viewer is denied set-email', async () => {
    const res = await gql(viewer.accessToken, SetProjectUserEmailDocument, {
      input: {
        userId: memberId,
        email: `viewer-denied-${uniqueStamp}@test.grant.dev`,
        scope: projectScope(),
      },
    });
    expect(isForbidden(res)).toBe(true);
  });

  it('Dev can set email after ProjectUser:SetEmail is granted to that role group', async () => {
    const permissionRows = await query<{ id: string }>`
      SELECT p.id
      FROM permissions p
      INNER JOIN resources r ON r.id = p.resource_id
      WHERE p.action = ${'SetEmail'}
        AND r.slug = ${'ProjectUser'}
        AND p.deleted_at IS NULL
      LIMIT 1
    `;
    const setEmailPermissionId = permissionRows[0]?.id;
    expect(setEmailPermissionId).toBeTruthy();

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
      ...new Set([...current.map((row) => row.permission_id), setEmailPermissionId!]),
    ];

    const patch = await apiClient()
      .patch(`/api/groups/${groupId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ permissionIds });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    const grantedDevEmail = `e2e-set-email-dev2-${uniqueStamp}@test.grant.dev`;
    await owner.inviteMember(
      org.id,
      grantedDevEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!
    );
    const grantedDev = await TestUser.create({ email: grantedDevEmail, withOrgAccount: true });
    await grantedDev.acceptInvitation(org.id);

    const res = await gql<{ setProjectUserEmail?: { id: string } }>(
      grantedDev.accessToken,
      SetProjectUserEmailDocument,
      {
        input: {
          userId: memberId,
          email: `dev-granted-${uniqueStamp}@test.grant.dev`,
          scope: projectScope(),
        },
      }
    );
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectUserEmail?.id).toBe(memberId);
  });

  it('rejects a duplicate address with ConflictError after trim and lowercase', async () => {
    const address = `Unique.Addr+${uniqueStamp}@Example.COM`;
    const first = await createProjectUser(owner.accessToken, 'E2E Unique First', address);
    expect(first.errors, JSON.stringify(first.errors)).toBeUndefined();

    const second = await createProjectUser(
      owner.accessToken,
      'E2E Unique Second',
      `  ${address}  `
    );
    expect(second.id).toBeUndefined();
    expect(
      (
        second.errors as Array<{ message: string; extensions?: { code?: string } }> | undefined
      )?.some(
        (e) =>
          e.extensions?.code === 'CONFLICT' ||
          e.message === 'This authentication method is already connected to another account'
      )
    ).toBe(true);
  });

  it('rejects email outside a project scope and non-members', async () => {
    const orgCreate = await gql(owner.accessToken, CreateUserDocument, {
      input: {
        name: 'E2E Org Email',
        email: `org-scope-${uniqueStamp}@test.grant.dev`,
        scope: { tenant: Tenant.Organization, id: org.id },
        roleIds: [(await getOrganizationRoleIdByName(org.id, ROLE_VIEWER))!],
      },
    });
    expect(orgCreate.body.errors).toBeDefined();

    const outsider = await TestUser.create({ withOrgAccount: true });
    const profile = await outsider.getProfile();
    const outsiderId = (profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } })
      .data!.accounts![0]!.owner!.id;

    const missing = await gql(owner.accessToken, SetProjectUserEmailDocument, {
      input: {
        userId: outsiderId,
        email: `missing-member-${uniqueStamp}@test.grant.dev`,
        scope: projectScope(),
      },
    });
    expect(missing.body.errors).toBeDefined();
    expect(
      missing.body.errors?.some(
        (e) => e.extensions?.code === 'NOT_FOUND' || e.message.toLowerCase().includes('not found')
      )
    ).toBe(true);
  });

  it('REST PUT sets email; same address is a no-op', async () => {
    const address = `rest-set-${uniqueStamp}@test.grant.dev`;
    const put = await apiClient()
      .put(`/api/users/${memberId}/email`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope(), email: address });
    expect(put.status, JSON.stringify(put.body)).toBe(200);

    const before = await query<{ n: string }>`
      SELECT COUNT(*)::text AS n FROM event_log
      WHERE type = ${'project.user_email_changed'}
        AND subject_user_id = ${memberId}::uuid
    `;
    const noop = await apiClient()
      .put(`/api/users/${memberId}/email`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope(), email: address.toUpperCase() });
    expect(noop.status).toBe(200);
    const after = await query<{ n: string }>`
      SELECT COUNT(*)::text AS n FROM event_log
      WHERE type = ${'project.user_email_changed'}
        AND subject_user_id = ${memberId}::uuid
    `;
    expect(after[0]?.n).toBe(before[0]?.n);
  });

  describe('audit row of an operator-set address', () => {
    it('a set-email that changes the address writes exactly one row, naming the operation', async () => {
      const operatorId = owner.userId!;
      expect(operatorId).toBeTruthy();
      const previous = await currentEmailAddress(memberId);
      expect(previous).toBeTruthy();
      const next = `audit-set-${uniqueStamp}@test.grant.dev`;
      const before = await emailAuditRows(memberId);

      const res = await gql<{ setProjectUserEmail?: { id: string } }>(
        owner.accessToken,
        SetProjectUserEmailDocument,
        { input: { userId: memberId, email: next, scope: projectScope() } }
      );
      expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

      const fresh = await newEmailAuditRows(memberId, before);
      expect(fresh).toHaveLength(1);
      expect(fresh[0]).toMatchObject({
        action: 'UPDATE',
        performed_by: operatorId,
        old_provider_id: previous,
        new_provider_id: next,
        operation: 'operator-set-email',
      });
    });

    it('the REST route names the same operation, and the same address writes no row', async () => {
      const operatorId = owner.userId!;
      const previous = await currentEmailAddress(memberId);
      const next = `audit-rest-${uniqueStamp}@test.grant.dev`;
      const before = await emailAuditRows(memberId);

      const put = await apiClient()
        .put(`/api/users/${memberId}/email`)
        .set('Authorization', owner.authHeader)
        .send({ scope: projectScope(), email: next });
      expect(put.status, JSON.stringify(put.body)).toBe(200);

      const fresh = await newEmailAuditRows(memberId, before);
      expect(fresh).toHaveLength(1);
      expect(fresh[0]).toMatchObject({
        action: 'UPDATE',
        performed_by: operatorId,
        old_provider_id: previous,
        new_provider_id: next,
        operation: 'operator-set-email',
      });

      const noop = await apiClient()
        .put(`/api/users/${memberId}/email`)
        .set('Authorization', owner.authHeader)
        .send({ scope: projectScope(), email: next.toUpperCase() });
      expect(noop.status).toBe(200);
      expect(await newEmailAuditRows(memberId, [...before, ...fresh])).toHaveLength(0);
    });

    it('a createUser with an email writes one row, naming its own operation', async () => {
      const address = `audit-create-${uniqueStamp}@test.grant.dev`;
      const created = await createProjectUser(owner.accessToken, 'E2E Audit Created', address);
      expect(created.errors, JSON.stringify(created.errors)).toBeUndefined();

      const rows = await emailAuditRows(created.id!);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        action: 'CREATE',
        performed_by: owner.userId,
        old_provider_id: null,
        new_provider_id: address,
        operation: 'operator-create-user',
      });
    });

    it('a createUser without an email writes no authentication-method row', async () => {
      const operatorId = owner.userId!;
      const before = await auditRowCount(operatorId, memberId);
      const created = await createProjectUser(owner.accessToken, 'E2E Audit No Email');
      expect(created.errors, JSON.stringify(created.errors)).toBeUndefined();
      expect(await emailAuditRows(created.id!)).toHaveLength(0);
      expect(await auditRowCount(operatorId, memberId)).toBe(before);
    });

    describe('a refused call writes no row', () => {
      it('non-member target (NotFound)', async () => {
        const outsider = await TestUser.create({ withOrgAccount: true });
        expect(outsider.userId).toBeTruthy();
        const operatorId = owner.userId!;
        const before = await auditRowCount(operatorId, outsider.userId!);

        const res = await gql(owner.accessToken, SetProjectUserEmailDocument, {
          input: {
            userId: outsider.userId,
            email: `audit-outsider-${uniqueStamp}@test.grant.dev`,
            scope: projectScope(),
          },
        });

        expect(
          res.body.errors?.some(
            (e) =>
              e.extensions?.code === 'NOT_FOUND' || e.message.toLowerCase().includes('not found')
          ),
          JSON.stringify(res.body.errors)
        ).toBe(true);
        expect(await auditRowCount(operatorId, outsider.userId!)).toBe(before);
      });

      it('conflicting address (ConflictError)', async () => {
        const operatorId = owner.userId!;
        const heldAddress = `audit-held-${uniqueStamp}@test.grant.dev`;
        const holder = await createProjectUser(owner.accessToken, 'E2E Audit Holder', heldAddress);
        expect(holder.errors, JSON.stringify(holder.errors)).toBeUndefined();

        const previous = await currentEmailAddress(memberId);
        const before = await auditRowCount(operatorId, memberId);
        const holderBefore = await auditRowCount(operatorId, holder.id!);

        const res = await gql(owner.accessToken, SetProjectUserEmailDocument, {
          input: { userId: memberId, email: heldAddress, scope: projectScope() },
        });

        expect(
          res.body.errors?.some(
            (e) =>
              e.extensions?.code === 'CONFLICT' ||
              e.message === 'This authentication method is already connected to another account'
          ),
          JSON.stringify(res.body.errors)
        ).toBe(true);
        expect(await auditRowCount(operatorId, memberId)).toBe(before);
        expect(await auditRowCount(operatorId, holder.id!)).toBe(holderBefore);
        expect(await currentEmailAddress(memberId)).toBe(previous);
      });

      it('scope mismatch (organization-scope headers, project input scope)', async () => {
        const operatorId = owner.userId!;
        const previous = await currentEmailAddress(memberId);
        const before = await auditRowCount(operatorId, memberId);
        const headers = { 'x-scope-tenant': Tenant.Organization, 'x-scope-id': org.id };

        const viaGraphql = await graphqlRequest({
          query: print(SetProjectUserEmailDocument),
          accessToken: owner.accessToken,
          variables: {
            input: {
              userId: memberId,
              email: `audit-mismatch-${uniqueStamp}@test.grant.dev`,
              scope: projectScope(),
            },
          },
          headers,
        });
        expect(isForbidden(viaGraphql), JSON.stringify(viaGraphql.body)).toBe(true);

        const viaRest = await apiClient()
          .put(`/api/users/${memberId}/email`)
          .set('Authorization', owner.authHeader)
          .set(headers)
          .send({
            scope: projectScope(),
            email: `audit-mismatch-rest-${uniqueStamp}@test.grant.dev`,
          });
        expect(viaRest.status, JSON.stringify(viaRest.body)).toBe(403);

        const viaCreate = await graphqlRequest({
          query: print(CreateUserDocument),
          accessToken: owner.accessToken,
          variables: {
            input: {
              name: 'E2E Audit Mismatch Create',
              email: `audit-mismatch-create-${uniqueStamp}@test.grant.dev`,
              scope: projectScope(),
            },
          },
          headers,
        });
        expect(isForbidden(viaCreate), JSON.stringify(viaCreate.body)).toBe(true);

        expect(await auditRowCount(operatorId, memberId)).toBe(before);
        expect(await currentEmailAddress(memberId)).toBe(previous);
      });
    });
  });

  it('event, webhook, and logs omit the sentinel address', async () => {
    const res = await gql<{ setProjectUserEmail?: { id: string } }>(
      owner.accessToken,
      SetProjectUserEmailDocument,
      {
        input: { userId: memberId, email: SENTINEL, scope: projectScope() },
      }
    );
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const deadline = Date.now() + 25_000;
    let events: EventRow[] = [];
    while (Date.now() < deadline) {
      events = await query<EventRow>`
        SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
               e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
        FROM event_log e
        WHERE e.type = ${'project.user_email_changed'}
          AND e.subject_user_id = ${memberId}::uuid
        ORDER BY e.sequence DESC
        LIMIT 5
      `;
      if (events.some((row) => JSON.stringify(row.payload).includes('"operation":"changed"'))) {
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    expect(events.length).toBeGreaterThan(0);
    for (const row of events) {
      expect(JSON.stringify(row.payload)).not.toContain(SENTINEL);
      expect(row.payload.data?.after).toMatchObject({
        projectId,
        userId: memberId,
        operation: expect.stringMatching(/^(added|changed)$/),
      });
      expect(row.subject_user_id).toBe(memberId);
    }

    const deliveries = await query<EventRow>`
      SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
             e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
      FROM webhook_delivery_attempts d
      INNER JOIN event_log e ON e.id = d.event_id
      WHERE d.subscription_id = ${subscriptionId}::uuid
        AND e.type = ${'project.user_email_changed'}
    `;
    expect(deliveries.length).toBeGreaterThan(0);
    for (const row of deliveries) {
      const envelope = buildCloudEventEnvelope(
        {
          id: row.id,
          sequence: Number(row.sequence),
          type: 'project.user_email_changed',
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
      expect(JSON.stringify(envelope)).not.toContain(SENTINEL);
    }

    if (containerLogsAvailable()) {
      expect(readContainerLogs()).not.toContain(SENTINEL);
    }
  });
});
