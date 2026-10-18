/**
 * E2E: webhook delivery whatever the request scope (ADR 0012).
 *
 * A project's subscription receives every event relevant to that project, not
 * only those whose request ran in a project scope:
 *  - an edit to a project-linked role made through an ORGANIZATION-scoped request;
 *  - an event raised by a PROJECT-APP (`projectUser`) request;
 * and nothing for an entity linked to the organization but to no project.
 *
 * Deliveries are read from the database together with the stored event, so the
 * test also proves the event kept the scope of the request that caused it.
 * POSTs go to a public HTTPS URL (example.com); a delivery may end up failed or
 * dead, which is enough: the pending row is the proof of matching.
 *
 * Prerequisites: E2E stack running (docker-compose.e2e.yml), DB migrated and seeded.
 */
import { Tenant, UpdateRoleDocument } from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import {
  addProjectUserForE2e,
  assignUserRoleForE2e,
  closeDbHelper,
  linkRoleToProjectForE2e,
  query,
} from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

interface IdBody {
  data?: { id: string };
}

interface DeliveryRow extends Record<string, unknown> {
  type: string;
  scope_tenant: string;
}

afterAll(async () => {
  await closeDbHelper();
});

async function deliveriesOf(subscriptionId: string): Promise<DeliveryRow[]> {
  return query<DeliveryRow>`
    SELECT e.type AS type, e.scope_tenant AS scope_tenant
    FROM webhook_delivery_attempts d
    INNER JOIN event_log e ON e.id = d.event_id
    WHERE d.subscription_id = ${subscriptionId}::uuid
    ORDER BY e.sequence
  `;
}

async function waitForDeliveries(
  subscriptionId: string,
  count: number,
  timeoutMs = 20_000
): Promise<DeliveryRow[]> {
  const deadline = Date.now() + timeoutMs;
  let rows: DeliveryRow[] = [];
  while (Date.now() < deadline) {
    rows = await deliveriesOf(subscriptionId);
    if (rows.length >= count) return rows;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${count} deliveries (saw ${rows.length})`);
}

async function permissionId(name: string): Promise<string> {
  const rows = await query<{ id: string }>`
    SELECT id FROM permissions WHERE name = ${name} AND deleted_at IS NULL LIMIT 1
  `;
  expect(rows[0]?.id, `seeded permission ${name}`).toBeDefined();
  return rows[0]!.id;
}

describe('Webhook delivery whatever the request scope (ADR 0012)', () => {
  let owner: TestUser;
  let ownerUserId: string;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let subscriptionId: string;
  let orgOnlyRoleId: string;
  let projectRoleId: string;

  const orgScope = () => ({ tenant: Tenant.Organization, id: org.id });
  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });
  const projectUserScope = () => ({
    tenant: Tenant.ProjectUser,
    id: `${projectId}:${ownerUserId}`,
  });

  it('Setup: owner, organization, project and a subscription to role.updated and api_key.created', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Webhook Scope Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Webhook Scope Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as IdBody).data!.id;

    const profile = await owner.getProfile();
    const userId = (profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } })
      .data?.accounts?.[0]?.owner?.id;
    expect(userId).toBeDefined();
    ownerUserId = userId!;

    const res = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: projectScope(),
        url: 'https://example.com/grant-e2e-webhook-scope',
        eventTypes: ['role.updated', 'api_key.created'],
        description: 'E2E ADR 0012',
        active: true,
      });
    expect(res.status).toBe(201);
    subscriptionId = (res.body as IdBody).data!.id;
  });

  it('Setup: an organization-only role and a project role that lets its holder update roles and create API keys', async () => {
    const orgRole = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({ name: `E2E Org Role ${Date.now()}`, description: 'org only', scope: orgScope() });
    expect(orgRole.status).toBe(201);
    orgOnlyRoleId = (orgRole.body as IdBody).data!.id;

    const projectRole = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Project Role ${Date.now()}`,
        description: 'project role',
        scope: projectScope(),
        permissionIds: [
          await permissionId('permissions.names.Role.Update'),
          await permissionId('permissions.names.ApiKey.Create'),
        ],
      });
    expect(projectRole.status).toBe(201);
    projectRoleId = (projectRole.body as IdBody).data!.id;

    // Creating either role is not something the subscription asked for.
    expect(await deliveriesOf(subscriptionId)).toHaveLength(0);
  });

  it('an edit to an organization-only role, made at organization scope, delivers nothing', async () => {
    const res = await apiClient()
      .patch(`/api/roles/${orgOnlyRoleId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ description: 'org only, edited' });
    expect(res.status).toBe(200);
  });

  it('an edit to a project-linked role, made at ORGANIZATION scope, creates a delivery for the project subscription', async () => {
    const res = await apiClient()
      .patch(`/api/roles/${projectRoleId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ description: 'project role, edited from the organization' });
    expect(res.status).toBe(200);

    const rows = await waitForDeliveries(subscriptionId, 1);
    // Events are relayed in order, so the organization-only edit above has been
    // handled by now: exactly one delivery means it matched no project.
    expect(rows).toEqual([{ type: 'role.updated', scope_tenant: Tenant.Organization }]);
  });

  it('an event raised by a PROJECT-APP (projectUser) request creates a delivery for the project subscription', async () => {
    await addProjectUserForE2e(projectId, ownerUserId);
    await assignUserRoleForE2e(ownerUserId, projectRoleId);

    // An API key is linked to its project only after api_key.created is published,
    // so the project can be reached through the request scope alone.
    const res = await apiClient()
      .post('/api/api-keys')
      .set('Authorization', owner.authHeader)
      .send({ name: 'E2E project-app key', scope: projectUserScope() });
    expect(res.status).toBe(201);

    const rows = await waitForDeliveries(subscriptionId, 2);
    expect(rows[1]).toEqual({ type: 'api_key.created', scope_tenant: Tenant.ProjectUser });
  });

  it('the same edit made at project scope still delivers (the previous behaviour is unchanged)', async () => {
    // GraphQL: the REST route's scope query takes a plain uuid, not a composite project scope id.
    const res = await graphqlRequest<{ updateRole?: { id: string } }>({
      query: print(UpdateRoleDocument),
      accessToken: owner.accessToken,
      variables: {
        id: projectRoleId,
        input: { scope: projectScope(), description: 'project role, edited from the project' },
      },
    });
    expect(res.body.errors).toBeUndefined();

    const rows = await waitForDeliveries(subscriptionId, 3);
    expect(rows[2]).toEqual({ type: 'role.updated', scope_tenant: Tenant.OrganizationProject });
  });

  it('a role linked to two projects reaches the subscription of each', async () => {
    const secondProjectRes = await owner.tryCreateProject(org.id, 'E2E Webhook Scope Project 2');
    expect(secondProjectRes.status).toBe(201);
    const secondProjectId = (secondProjectRes.body as IdBody).data!.id;

    const sub = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: { tenant: Tenant.OrganizationProject, id: `${org.id}:${secondProjectId}` },
        url: 'https://example.com/grant-e2e-webhook-scope-2',
        eventTypes: ['role.updated'],
        active: true,
      });
    expect(sub.status).toBe(201);
    const secondSubscriptionId = (sub.body as IdBody).data!.id;

    await linkRoleToProjectForE2e(secondProjectId, projectRoleId);

    const res = await apiClient()
      .patch(`/api/roles/${projectRoleId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ description: 'project role, shared by two projects' });
    expect(res.status).toBe(200);

    const second = await waitForDeliveries(secondSubscriptionId, 1);
    expect(second).toEqual([{ type: 'role.updated', scope_tenant: Tenant.Organization }]);
    const first = await waitForDeliveries(subscriptionId, 4);
    expect(first[3]).toEqual({ type: 'role.updated', scope_tenant: Tenant.Organization });
  });

  it('a resource linked to a project, deleted at ORGANIZATION scope, delivers resource.deleted and its permission.deleted', async () => {
    // The handler unlinks the project_resources / project_permissions rows before the
    // services publish; the events must still reach the project's subscription.
    const sub = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: projectScope(),
        url: 'https://example.com/grant-e2e-webhook-scope-resource',
        eventTypes: ['resource.deleted', 'permission.deleted'],
        active: true,
      });
    expect(sub.status).toBe(201);
    const resourceSubscriptionId = (sub.body as IdBody).data!.id;

    const created = await apiClient()
      .post('/api/resources')
      .set('Authorization', owner.authHeader)
      .send({
        name: 'E2E Webhook Scope Resource',
        slug: `e2e-webhook-scope-${Date.now()}`,
        actions: ['read'],
        createPermissions: true,
        scope: projectScope(),
      });
    expect(created.status).toBe(201);
    const resourceId = (created.body as IdBody).data!.id;

    // Creating it is not something this subscription asked for.
    expect(await deliveriesOf(resourceSubscriptionId)).toHaveLength(0);

    const res = await apiClient()
      .delete(`/api/resources/${resourceId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader);
    expect(res.status).toBe(200);

    const rows = await waitForDeliveries(resourceSubscriptionId, 2);
    expect(rows).toEqual([
      { type: 'permission.deleted', scope_tenant: Tenant.Organization },
      { type: 'resource.deleted', scope_tenant: Tenant.Organization },
    ]);
  });
});
