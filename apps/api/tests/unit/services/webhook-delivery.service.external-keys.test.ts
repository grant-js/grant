import { describe, expect, it, vi } from 'vitest';

import { WebhookDeliveryService } from '@/services/webhook-delivery.service';

const USER = '60000000-0000-4000-8000-000000000001';
const EVENT = '60000000-0000-4000-8000-000000000002';
const PROJECT_A = '60000000-0000-4000-8000-00000000000a';
const PROJECT_B = '60000000-0000-4000-8000-00000000000b';

function setup(projectIdOfSubscription: Record<string, string | null>) {
  const bodies: Record<string, Record<string, unknown>> = {};
  const attempts = Object.keys(projectIdOfSubscription).map((subscriptionId, i) => ({
    id: `70000000-0000-4000-8000-00000000000${i}`,
    eventId: EVENT,
    subscriptionId,
    attemptCount: 0,
    createdAt: new Date(),
  }));
  const deliveries = {
    claimDue: vi.fn().mockResolvedValueOnce(attempts).mockResolvedValue([]),
    updateResult: vi.fn(),
  };
  const subscriptions = {
    getManyUnscoped: vi.fn().mockResolvedValue(
      Object.entries(projectIdOfSubscription).map(([id, projectId]) => ({
        id,
        projectId,
        url: `https://example.com/${id}`,
        secretRef: 'secret',
      }))
    ),
  };
  const eventLog = {
    getByIds: vi.fn().mockResolvedValue([
      {
        id: EVENT,
        sequence: 1,
        type: 'user.deleted',
        category: 'iam',
        deliveryClass: 'transactional',
        scopeTenant: 'system',
        scopeId: 'system',
        actorUserId: null,
        subjectUserId: USER,
        payload: {
          aggregate: { kind: 'user', id: USER },
          data: {
            before: {
              id: USER,
              externalKeys: [
                { projectId: PROJECT_A, externalKey: 'key-a' },
                { projectId: PROJECT_B, externalKey: 'key-b' },
              ],
            },
            after: { id: USER, hardDelete: false },
          },
          projectIds: [PROJECT_A, PROJECT_B],
        },
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]),
  };
  const adapter = {
    deliver: vi.fn(async ({ url, body }: { url: string; body: string }) => {
      bodies[url.split('/').pop()!] = JSON.parse(body);
      return { ok: true, status: 200 };
    }),
  };
  const service = new WebhookDeliveryService(
    deliveries as never,
    subscriptions as never,
    eventLog as never,
    { buildHeaders: vi.fn().mockReturnValue({}) } as never,
    adapter as never,
    { transaction: async (fn: (tx: unknown) => unknown) => fn({}) } as never
  );
  return { service, bodies };
}

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

describe('WebhookDeliveryService externalKeys per subscription', () => {
  it('delivers each project its own key only, from one stored user.deleted', async () => {
    const { service, bodies } = setup({ 'sub-a': PROJECT_A, 'sub-b': PROJECT_B });

    await service.drain(logger as never);

    const before = (id: string) => (bodies[id]!.data as { before: Record<string, unknown> }).before;
    expect(before('sub-a')).toEqual({
      id: USER,
      externalKeys: [{ projectId: PROJECT_A, externalKey: 'key-a' }],
    });
    expect(before('sub-b')).toEqual({
      id: USER,
      externalKeys: [{ projectId: PROJECT_B, externalKey: 'key-b' }],
    });
    expect(JSON.stringify(bodies['sub-a'])).not.toContain('key-b');
    expect(JSON.stringify(bodies['sub-b'])).not.toContain('key-a');
  });

  it('delivers [] to a subscription that names no project', async () => {
    const { service, bodies } = setup({ 'sub-none': null });

    await service.drain(logger as never);

    expect((bodies['sub-none']!.data as { before: unknown }).before).toEqual({
      id: USER,
      externalKeys: [],
    });
  });
});
