import type { IAuditLogger, IEventPublisher } from '@grantjs/core';
import { describe, expect, it, vi } from 'vitest';

import { GroupTagService } from '@/services/group-tags.service';
import { PermissionTagService } from '@/services/permission-tags.service';
import { ResourceTagService } from '@/services/resource-tags.service';
import { RoleTagService } from '@/services/role-tags.service';
import { UserTagService } from '@/services/user-tags.service';

const targetId = '10000000-0000-4000-8000-000000000a01';
const tagId = '10000000-0000-4000-8000-000000000a02';
const otherTargetId = '10000000-0000-4000-8000-000000000a03';
const pivotId = '10000000-0000-4000-8000-000000000a04';
const otherPivotId = '10000000-0000-4000-8000-000000000a05';

type Kind = 'user' | 'group' | 'role' | 'permission' | 'resource';

const CASES: Array<{
  kind: Kind;
  Service: new (...args: never[]) => Record<string, (...args: never[]) => Promise<unknown>>;
  /** Pascal-case name used in repository and service method names. */
  name: string;
}> = [
  { kind: 'user', Service: UserTagService as never, name: 'User' },
  { kind: 'group', Service: GroupTagService as never, name: 'Group' },
  { kind: 'role', Service: RoleTagService as never, name: 'Role' },
  { kind: 'permission', Service: PermissionTagService as never, name: 'Permission' },
  { kind: 'resource', Service: ResourceTagService as never, name: 'Resource' },
];

function pivot(kind: Kind, id: string, owner: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    [`${kind}Id`]: owner,
    tagId,
    isPrimary: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function build({ kind, Service, name }: (typeof CASES)[number]) {
  const row = pivot(kind, pivotId, targetId);
  const deletedRow = pivot(kind, pivotId, targetId, { deletedAt: new Date('2026-01-02') });
  const existing = { current: [] as ReturnType<typeof pivot>[] };

  const entityRepository = { existsById: vi.fn().mockResolvedValue(true) };
  const tagRepository = {
    getTags: vi.fn().mockResolvedValue({ tags: [{ id: tagId }], totalCount: 1 }),
  };
  const pivotRepository = {
    [`get${name}Tags`]: vi.fn().mockImplementation(async () => existing.current),
    [`add${name}Tag`]: vi.fn().mockResolvedValue(row),
    [`softDelete${name}Tag`]: vi.fn().mockResolvedValue(deletedRow),
    [`hardDelete${name}Tag`]: vi.fn().mockResolvedValue(deletedRow),
  };
  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;
  const events = { publish: vi.fn() } as unknown as IEventPublisher;

  const service = new Service(
    entityRepository as never,
    tagRepository as never,
    pivotRepository as never,
    audit as never,
    events as never
  );
  return { service, pivotRepository, events, existing, row };
}

const linkedEvent = (
  kind: Kind,
  type: 'tag.linked' | 'tag.unlinked',
  id: string,
  owner: string
) => ({
  type,
  aggregate: { kind: `${kind}Tag`, id },
  subjectUserId: kind === 'user' ? owner : null,
  data: { after: { tagId, targetKind: kind, targetId: owner } },
});

describe.each(CASES)('$name tag pivot events', (testCase) => {
  const { kind, name } = testCase;

  it('publishes tag.linked with the pivot as aggregate and ids in data.after', async () => {
    const { service, events } = build(testCase);

    await service[`add${name}Tag`]({ [`${kind}Id`]: targetId, tagId } as never);

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      linkedEvent(kind, 'tag.linked', pivotId, targetId),
      undefined
    );
  });

  it('publishes tag.unlinked when a single tag is removed', async () => {
    const { service, events, existing, row } = build(testCase);
    existing.current = [row];

    await service[`remove${name}Tag`]({ [`${kind}Id`]: targetId, tagId } as never);

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      linkedEvent(kind, 'tag.unlinked', pivotId, targetId),
      undefined
    );
  });

  it('publishes one tag.unlinked per pivot when a tag is removed from everything (tag delete)', async () => {
    const { service, events, pivotRepository, existing } = build(testCase);
    const second = pivot(kind, otherPivotId, otherTargetId);
    existing.current = [pivot(kind, pivotId, targetId), second];
    vi.mocked(pivotRepository[`softDelete${name}Tag`]).mockImplementation(
      async (params: { id: string } & Record<string, string>) => ({
        ...params,
        deletedAt: new Date(),
      })
    );
    const tx = {};

    await service[`remove${name}Tags`]({ tagId } as never, tx as never);

    expect(events.publish).toHaveBeenCalledTimes(2);
    expect(events.publish).toHaveBeenNthCalledWith(
      1,
      linkedEvent(kind, 'tag.unlinked', pivotId, targetId),
      tx
    );
    expect(events.publish).toHaveBeenNthCalledWith(
      2,
      linkedEvent(kind, 'tag.unlinked', otherPivotId, otherTargetId),
      tx
    );
  });

  it('publishes nothing when the tag is not on the entity', async () => {
    const { service, events } = build(testCase);

    await expect(
      service[`remove${name}Tag`]({ [`${kind}Id`]: targetId, tagId } as never)
    ).rejects.toThrow();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
