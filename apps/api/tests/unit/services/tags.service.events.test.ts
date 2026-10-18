import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { TagService } from '@/services/tags.service';

const TAG_ID = '10000000-0000-4000-8000-0000000000c1';
const PROJECT_ID = '10000000-0000-4000-8000-0000000000c2';
const tx = { __tx: true };

function tag(overrides: Record<string, unknown> = {}) {
  return {
    id: TAG_ID,
    name: 'Beta',
    color: 'blue',
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function build() {
  const order: string[] = [];
  const tagRepository = {
    getTags: vi.fn().mockResolvedValue({ tags: [tag()], totalCount: 1, hasNextPage: false }),
    createTag: vi.fn().mockResolvedValue(tag()),
    updateTag: vi.fn().mockResolvedValue(tag({ name: 'Gamma' })),
    softDeleteTag: vi.fn().mockImplementation(async () => {
      order.push('delete');
      return tag({ deletedAt: new Date('2026-02-01T00:00:00.000Z') });
    }),
    hardDeleteTag: vi.fn().mockImplementation(async () => {
      order.push('delete');
      return tag();
    }),
  };
  const events = {
    publish: vi.fn(),
    resolveLinkedProjectIds: vi.fn().mockImplementation(async () => {
      order.push('resolve');
      return [PROJECT_ID];
    }),
  };
  const service = new TagService(
    tagRepository as never,
    {
      logCreate: vi.fn(),
      logUpdate: vi.fn(),
      logSoftDelete: vi.fn(),
      logHardDelete: vi.fn(),
    } as never,
    events as never
  );
  return { service, events, order };
}

describe('TagService events', () => {
  it('publishes tag.created with the tag as aggregate', async () => {
    const { service, events } = build();

    await service.createTag({ name: 'Beta', color: 'blue' }, tx as never);

    expect(events.publish).toHaveBeenCalledWith(
      {
        type: 'tag.created',
        aggregate: { kind: 'tag', id: TAG_ID },
        data: { after: expect.objectContaining({ id: TAG_ID, name: 'Beta', color: 'blue' }) },
      },
      tx
    );
  });

  it('publishes tag.updated with before, after and the delta', async () => {
    const { service, events } = build();

    await service.updateTag(
      TAG_ID,
      { name: 'Gamma', scope: { tenant: Tenant.Account, id: 'acc-1' } },
      tx as never
    );

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tag.updated',
        aggregate: { kind: 'tag', id: TAG_ID },
        data: expect.objectContaining({
          before: expect.objectContaining({ name: 'Beta' }),
          after: expect.objectContaining({ name: 'Gamma' }),
          delta: { name: { from: 'Beta', to: 'Gamma' } },
        }),
      }),
      tx
    );
  });

  it.each([false, true])(
    'reads the project links before deleting and publishes tag.deleted (hardDelete=%s)',
    async (hardDelete) => {
      const { service, events, order } = build();

      await service.deleteTag({ id: TAG_ID, hardDelete }, tx as never);

      expect(order).toEqual(['resolve', 'delete']);
      expect(events.resolveLinkedProjectIds).toHaveBeenCalledWith(
        [{ kind: 'tag', id: TAG_ID }],
        tx
      );
      expect(events.publish).toHaveBeenCalledWith(
        {
          type: 'tag.deleted',
          aggregate: { kind: 'tag', id: TAG_ID },
          data: { before: expect.objectContaining({ id: TAG_ID }) },
          projectIds: [PROJECT_ID],
        },
        tx
      );
    }
  );
});
