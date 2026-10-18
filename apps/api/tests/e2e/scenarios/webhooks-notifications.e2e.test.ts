/**
 * E2E: Webhooks + in-app notifications operator product.
 *
 * Asserts outbox consumers ran (delivery attempt rows + notification inbox).
 * Does not require a reachable local webhook receiver — POSTs go to a public
 * HTTPS URL (example.com); delivery may land as failed/dead, which is enough
 * to prove matching, enqueue, and replay.
 *
 * Notifications use organization.invitation_sent to a pre-registered invitee
 * (subject audience). role.created excludes the actor, so the org owner is not
 * used as the notification recipient for that type.
 *
 * Prerequisites: E2E stack running (docker-compose.e2e.yml), DB migrated and seeded.
 */
import type { EventLogModel } from '@grantjs/database';
import {
  CreateWebhookSubscriptionDocument,
  MyNotificationsDocument,
  MyUnreadNotificationCountDocument,
  Tenant,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { mapEventLogToDomainEvent } from '../../../src/lib/events/event-log-mapper.lib';
import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { apiClient } from '../helpers/api-client';
import {
  addProjectUserForE2e,
  assignUserRoleForE2e,
  closeDbHelper,
  query,
} from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

interface CreateProjectResponseBody {
  data?: { id: string };
}

interface WebhookSubscriptionBody {
  id: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  secret?: string;
}

interface WebhookDeliveryPageBody {
  items: Array<{ id: string; status: string; subscriptionId: string; attemptCount: number }>;
  totalCount: number;
  hasNextPage: boolean;
}

interface NotificationPageBody {
  notifications: Array<{ id: string; type: string; readAt: string | null }>;
  totalCount: number;
  unreadCount: number;
  hasNextPage: boolean;
}

afterAll(async () => {
  await closeDbHelper();
});

async function pollDeliveries(
  authHeader: string,
  scope: { tenant: string; id: string },
  subscriptionId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<WebhookDeliveryPageBody> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const intervalMs = opts.intervalMs ?? 400;
  const deadline = Date.now() + timeoutMs;
  let last: WebhookDeliveryPageBody = { items: [], totalCount: 0, hasNextPage: false };

  while (Date.now() < deadline) {
    const res = await apiClient()
      .get('/api/webhook-subscriptions/deliveries')
      .query({
        scopeId: scope.id,
        tenant: scope.tenant,
        subscriptionId,
        page: 1,
        limit: 20,
      })
      .set('Authorization', authHeader);

    if (res.status === 200 && res.body?.data) {
      last = res.body.data as WebhookDeliveryPageBody;
      if (last.totalCount > 0 && last.items.length > 0) {
        return last;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for webhook deliveries (last totalCount=${last.totalCount})`);
}

async function pollNotifications(
  authHeader: string,
  opts: { timeoutMs?: number; intervalMs?: number; minCount?: number; type?: string } = {}
): Promise<NotificationPageBody> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const intervalMs = opts.intervalMs ?? 400;
  const minCount = opts.minCount ?? 1;
  const deadline = Date.now() + timeoutMs;
  let last: NotificationPageBody = {
    notifications: [],
    totalCount: 0,
    unreadCount: 0,
    hasNextPage: false,
  };

  while (Date.now() < deadline) {
    const res = await apiClient()
      .get('/api/me/notifications')
      .query({ page: 1, limit: 20 })
      .set('Authorization', authHeader);

    if (res.status === 200 && res.body?.data) {
      last = res.body.data as NotificationPageBody;
      const typedOk = !opts.type || last.notifications.some((n) => n.type === opts.type);
      if (last.totalCount >= minCount && typedOk) {
        return last;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for notifications (last totalCount=${last.totalCount})`);
}

async function userIdOfEmail(email: string): Promise<string> {
  const users = await query<{ user_id: string }>`
    SELECT user_id
    FROM user_authentication_methods
    WHERE provider = 'email'
      AND provider_id = ${email}
      AND deleted_at IS NULL
    LIMIT 1
  `;
  expect(users[0]?.user_id).toBeTruthy();
  return users[0]!.user_id;
}

/**
 * The newest persisted `event_log` row of a type and scope, in the shape the dispatcher reads.
 * Aliased to the camelCase column names of `EventLogModel` so the production mapper
 * (`mapEventLogToDomainEvent`) can be applied to it unchanged; `sequence` (bigint) arrives as a string.
 */
async function latestEventLogRow(type: string, scopeId: string): Promise<EventLogModel> {
  const rows = await query<Record<string, unknown>>`
    SELECT id, sequence, type, category,
           delivery_class AS "deliveryClass",
           scope_tenant AS "scopeTenant",
           scope_id AS "scopeId",
           actor_user_id AS "actorUserId",
           subject_user_id AS "subjectUserId",
           payload,
           occurred_at AS "occurredAt",
           relay_status AS "relayStatus",
           created_at AS "createdAt"
    FROM event_log
    WHERE type = ${type}
      AND scope_id = ${scopeId}
    ORDER BY sequence DESC
    LIMIT 1
  `;
  expect(rows).toHaveLength(1);
  return { ...rows[0], sequence: Number(rows[0]!.sequence) } as unknown as EventLogModel;
}

describe('Webhooks and notifications flow', () => {
  let owner: TestUser;
  let invitee: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let subscriptionId: string;
  let deliveryId: string;
  let invitationId: string;

  const projectScope = (): { tenant: typeof Tenant.OrganizationProject; id: string } => ({
    tenant: Tenant.OrganizationProject,
    id: `${org.id}:${projectId}`,
  });

  it('Setup: create owner, invitee, org, and project', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    invitee = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Webhooks Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Webhooks Project');
    expect(projectRes.status).toBe(201);
    const body = projectRes.body as CreateProjectResponseBody;
    expect(body.data?.id).toBeDefined();
    projectId = body.data!.id;
  });

  it('REST create webhook subscription returns one-time secret', async () => {
    const res = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: projectScope(),
        url: 'https://example.com/grant-e2e-webhook',
        eventTypes: ['role.created', 'organization.invitation_sent'],
        description: 'E2E webhook',
        active: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data as WebhookSubscriptionBody;
    expect(data.id).toBeTruthy();
    expect(data.secret).toBeTruthy();
    expect(data.eventTypes).toEqual(
      expect.arrayContaining(['role.created', 'organization.invitation_sent'])
    );
    expect(data).not.toHaveProperty('orderingMode');
    subscriptionId = data.id;
  });

  it('Create role emits event → webhook delivery attempt', async () => {
    const roleRes = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Role ${Date.now()}`,
        description: 'Triggers role.created for webhooks e2e',
        scope: projectScope(),
      });
    expect(roleRes.status).toBe(201);

    const deliveries = await pollDeliveries(owner.authHeader, projectScope(), subscriptionId);
    expect(deliveries.totalCount).toBeGreaterThan(0);
    expect(deliveries.items[0]?.subscriptionId).toBe(subscriptionId);
    deliveryId = deliveries.items[0]!.id;
  });

  it('Invite registered user → notification for invitee', async () => {
    const invitation = await owner.inviteMember(org.id, invitee.email);
    invitationId = invitation.id;

    const notifications = await pollNotifications(invitee.authHeader, {
      type: 'organization.invitation_sent',
    });
    expect(notifications.notifications.some((n) => n.type === 'organization.invitation_sent')).toBe(
      true
    );
  });

  it('REST replay delivery re-queues the attempt', async () => {
    const res = await apiClient()
      .post(`/api/webhook-subscriptions/deliveries/${deliveryId}/replay`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as { id: string; status: string };
    expect(data.id).toBe(deliveryId);
    expect(['pending', 'running', 'failed', 'delivered', 'dead']).toContain(data.status);
  });

  it('REST mark notification read and preferences round-trip (invitee)', async () => {
    const listRes = await apiClient()
      .get('/api/me/notifications')
      .query({ page: 1, limit: 20, unreadOnly: true })
      .set('Authorization', invitee.authHeader);
    expect(listRes.status).toBe(200);
    const page = listRes.body.data as NotificationPageBody;
    const unreadBefore = page.unreadCount;
    expect(unreadBefore).toBeGreaterThan(0);
    const target = page.notifications.find((n) => !n.readAt) ?? page.notifications[0];
    expect(target).toBeDefined();

    const markRes = await apiClient()
      .post(`/api/me/notifications/${target!.id}/read`)
      .set('Authorization', invitee.authHeader);
    expect(markRes.status).toBe(200);

    const countRes = await apiClient()
      .get('/api/me/notifications/unread-count')
      .set('Authorization', invitee.authHeader);
    expect(countRes.status).toBe(200);
    expect((countRes.body.data as { unreadCount: number }).unreadCount).toBeLessThan(unreadBefore);

    const prefsGet = await apiClient()
      .get('/api/me/notification-preferences')
      .query({ scopeTenant: 'organization' })
      .set('Authorization', invitee.authHeader);
    expect(prefsGet.status).toBe(200);
    expect(Array.isArray(prefsGet.body.data)).toBe(true);

    const prefsPut = await apiClient()
      .put('/api/me/notification-preferences')
      .set('Authorization', invitee.authHeader)
      .send({
        scopeTenant: 'organization',
        category: 'membership',
        channel: 'in_app',
        enabled: true,
      });
    expect([200, 201]).toContain(prefsPut.status);
    expect(prefsPut.body.data).toMatchObject({
      category: 'membership',
      channel: 'in_app',
      enabled: true,
    });
  });

  it('GraphQL createWebhookSubscription + myNotifications smoke', async () => {
    const createRes = await graphqlRequest<{
      createWebhookSubscription?: WebhookSubscriptionBody;
    }>({
      query: print(CreateWebhookSubscriptionDocument),
      accessToken: owner.accessToken,
      variables: {
        input: {
          scope: projectScope(),
          url: 'https://example.com/grant-e2e-webhook-gql',
          eventTypes: ['role.updated'],
          description: 'E2E GraphQL webhook',
        },
      },
    });
    expect(createRes.body.errors).toBeUndefined();
    expect(createRes.body.data?.createWebhookSubscription?.secret).toBeTruthy();
    expect(createRes.body.data?.createWebhookSubscription).not.toHaveProperty('orderingMode');

    const unreadRes = await graphqlRequest<{
      myUnreadNotificationCount?: { unreadCount: number };
    }>({
      query: print(MyUnreadNotificationCountDocument),
      accessToken: invitee.accessToken,
    });
    expect(unreadRes.body.errors).toBeUndefined();
    expect(typeof unreadRes.body.data?.myUnreadNotificationCount?.unreadCount).toBe('number');

    const notifRes = await graphqlRequest<{
      myNotifications?: NotificationPageBody;
    }>({
      query: print(MyNotificationsDocument),
      accessToken: invitee.accessToken,
      variables: { input: { page: 1, limit: 10 } },
    });
    expect(notifRes.body.errors).toBeUndefined();
    expect(notifRes.body.data?.myNotifications?.totalCount).toBeGreaterThan(0);
  });

  it('Revoke invitation → the event and its webhook envelope identify the invited user', async () => {
    // The subscription above is project-scoped and this event is organization-scoped, so no
    // delivery is made for it, and delivery rows do not store the posted body. Instead read the
    // persisted event_log row (what the dispatcher reads) and run it through the production path,
    // `mapEventLogToDomainEvent` then `buildCloudEventEnvelope`. `before` is dropped from external
    // data, so the user id must come from `grantsubjectuser`.
    const revokeRes = await owner.delete(`/api/organization-invitations/${invitationId}`, {
      scope: { tenant: Tenant.Organization, id: org.id },
    });
    expect(revokeRes.status).toBe(200);

    const inviteeUserId = await userIdOfEmail(invitee.email);
    const row = await latestEventLogRow('organization.invitation_revoked', org.id);
    expect(row.subjectUserId).toBe(inviteeUserId);

    const envelope = buildCloudEventEnvelope(
      mapEventLogToDomainEvent(row),
      'https://grant.e2e.invalid'
    );

    expect(envelope.grantsubjectuser).toEqual({ userId: inviteeUserId });
    expect(envelope.data).not.toHaveProperty('before');
  });

  it('Revoke a project role from a user → a delivery is made and the envelope identifies the user', async () => {
    const inviteeUserId = await userIdOfEmail(invitee.email);

    const sub = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: projectScope(),
        url: 'https://example.com/grant-e2e-webhook-role-revoked',
        eventTypes: ['user.role_revoked'],
        active: true,
      });
    expect(sub.status).toBe(201);
    const revokedSubscriptionId = (sub.body as { data: WebhookSubscriptionBody }).data.id;

    const roleRes = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Revoked Role ${Date.now()}`,
        description: 'Revoked from the invitee to trigger user.role_revoked',
        scope: projectScope(),
      });
    expect(roleRes.status).toBe(201);
    const roleId = (roleRes.body as { data: { id: string } }).data.id;

    // Direct inserts, so assigning the role raises no event of its own.
    await addProjectUserForE2e(projectId, inviteeUserId);
    await assignUserRoleForE2e(inviteeUserId, roleId);

    const res = await apiClient()
      .patch(`/api/users/${inviteeUserId}`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope(), roleIds: [] });
    expect(res.status).toBe(200);

    // The role is linked to the project, so the event reaches the project subscription.
    const deliveries = await pollDeliveries(
      owner.authHeader,
      projectScope(),
      revokedSubscriptionId
    );
    expect(deliveries.totalCount).toBe(1);

    const row = await latestEventLogRow('user.role_revoked', `${org.id}:${projectId}`);
    expect(row.subjectUserId).toBe(inviteeUserId);

    const envelope = buildCloudEventEnvelope(
      mapEventLogToDomainEvent(row),
      'https://grant.e2e.invalid'
    );
    expect(envelope.type).toBe('user.role_revoked');
    expect(envelope.grantsubjectuser).toEqual({ userId: inviteeUserId });
    expect(envelope.grantactor).not.toBeNull();
    expect(envelope.data).not.toHaveProperty('before');
  });
});
