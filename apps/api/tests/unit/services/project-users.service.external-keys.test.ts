import { describe, expect, it, vi } from 'vitest';

import { ProjectUserService } from '@/services/project-users.service';

const projectId = '50000000-0000-4000-8000-000000000060';
const otherProjectId = '50000000-0000-4000-8000-000000000070';
const userId = '50000000-0000-4000-8000-000000000061';
const projectUserId = '50000000-0000-4000-8000-000000000062';
const tx = { transaction: true };

function build(options: { rowMetadata?: unknown; userMetadata?: unknown } = {}) {
  const row = {
    id: projectUserId,
    projectId,
    userId,
    metadata: options.rowMetadata ?? {},
    displayName: null,
    pictureUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: new Date('2026-02-01T00:00:00.000Z'),
  };
  const projectUserRepository = {
    getProjectUsers: vi.fn().mockResolvedValue([{ ...row, deletedAt: null }]),
    softDeleteProjectUser: vi.fn().mockResolvedValue(row),
    hardDeleteProjectUser: vi.fn().mockResolvedValue(row),
  };
  const events = { publish: vi.fn() };
  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const service = new ProjectUserService(
    { existsById: vi.fn().mockResolvedValue(true) } as never,
    {
      getUsers: vi.fn().mockResolvedValue({
        users: [{ id: userId, metadata: options.userMetadata ?? {} }],
      }),
    } as never,
    projectUserRepository as never,
    { getFirstByProjectId: vi.fn().mockResolvedValue(null) } as never,
    { getFirstByProjectId: vi.fn().mockResolvedValue(null) } as never,
    audit as never,
    events as never,
    { getUrl: vi.fn() } as never,
    { removeCredential: vi.fn().mockResolvedValue(true) } as never
  );
  return { service, events, audit };
}

const marker = (id: string, externalKey: string) => ({
  cdmImport: { projectId: id, kind: 'user', externalKey },
});

describe('ProjectUserService.removeProjectUser externalKeys', () => {
  it("stores only the removed project's entry, read from the membership row the delete returned", async () => {
    const { service, events } = build({
      rowMetadata: marker(projectId, 'row-key'),
      // The global user is marked by a different project: not this removal's key.
      userMetadata: marker(otherProjectId, 'other-key'),
    });

    await service.removeProjectUser({ projectId, userId }, tx as never);

    expect(events.publish.mock.calls[0][0].data.before).toMatchObject({
      id: projectUserId,
      projectId,
      userId,
      externalKeys: [{ projectId, externalKey: 'row-key' }],
    });
    expect(JSON.stringify(events.publish.mock.calls[0][0])).not.toContain('other-key');
  });

  it('names a reused identity by the importer id on the row, never its address', async () => {
    const { service, events } = build({
      rowMetadata: {
        ...marker(projectId, 'someone@example.test'),
        cdmSource: { legacy: { id: 'legacy-9', email: 'someone@example.test' } },
      },
    });

    await service.removeProjectUser({ projectId, userId, hardDelete: true }, tx as never);

    const event = events.publish.mock.calls[0][0];
    expect(event.data.before.externalKeys).toEqual([{ projectId, externalKey: 'legacy-9' }]);
    expect(JSON.stringify(event)).not.toContain('example.test');
  });

  it('is [] for a Grant-native user, and keeps the audit snapshot free of the list', async () => {
    const { service, events, audit } = build();

    await service.removeProjectUser({ projectId, userId }, tx as never);

    expect(events.publish.mock.calls[0][0].data.before.externalKeys).toEqual([]);
    expect(audit.logSoftDelete.mock.calls[0][1]).not.toHaveProperty('externalKeys');
  });
});
