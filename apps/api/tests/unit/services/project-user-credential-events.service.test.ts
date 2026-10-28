import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ProjectUserCredentialEventPublisher } from '@/services/project-user-credential-events.service';

const projectId = '10000000-0000-4000-8000-000000000050';
const otherProjectId = '10000000-0000-4000-8000-000000000060';
const userId = '10000000-0000-4000-8000-000000000051';
const otherUserId = '10000000-0000-4000-8000-000000000061';
const memberId = '10000000-0000-4000-8000-000000000052';
const otherMemberId = '10000000-0000-4000-8000-000000000062';
const organizationId = '10000000-0000-4000-8000-000000000053';

function build(
  options: { orgProject?: boolean; members?: Array<{ id: string; userId: string }> } = {}
) {
  const events = { publishMany: vi.fn().mockResolvedValue(undefined) };
  const getProjectUsers = vi.fn().mockResolvedValue(options.members ?? [{ id: memberId, userId }]);
  const getOrganizationProject = vi
    .fn()
    .mockResolvedValue(options.orgProject === false ? null : { organizationId, projectId });
  const getAccountProject = vi.fn().mockResolvedValue(null);
  const publisher = new ProjectUserCredentialEventPublisher(
    events as never,
    { getProjectUsers } as never,
    { getFirstByProjectId: getOrganizationProject } as never,
    { getFirstByProjectId: getAccountProject } as never
  );
  return { publisher, events, getProjectUsers, getOrganizationProject };
}

describe('ProjectUserCredentialEventPublisher', () => {
  it('publishes project.user_password_set with explicit scope, the member aggregate and ids + source only', async () => {
    const { publisher, events } = build();
    const tx = { tx: true };

    await publisher.publishPasswordSet([{ projectId, userId, source: 'admin-set' }], tx as never);

    expect(events.publishMany).toHaveBeenCalledWith(
      [
        {
          type: 'project.user_password_set',
          scope: { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectId}` },
          subjectUserId: userId,
          aggregate: { kind: 'projectUser', id: memberId },
          data: { after: { projectId, userId, source: 'admin-set' } },
        },
      ],
      tx
    );
  });

  it('carries no key that webhook redaction would blank (password, hash, secret)', async () => {
    const { publisher, events } = build();

    await publisher.publishPasswordSet([{ projectId, userId, source: 'reset' }]);

    const [published] = events.publishMany.mock.calls[0] as unknown as [unknown[]];
    expect(JSON.stringify(published)).not.toMatch(/"[^"]*(password|hash|secret)[^"]*"\s*:/i);
    expect(Object.keys((published[0] as { data: { after: object } }).data.after)).toEqual([
      'projectId',
      'userId',
      'source',
    ]);
  });

  it('batches several changes: one scope lookup and one membership read per project, one publish', async () => {
    const { publisher, events, getProjectUsers, getOrganizationProject } = build({
      members: [
        { id: memberId, userId },
        { id: otherMemberId, userId: otherUserId },
      ],
    });

    await publisher.publishPasswordSet([
      { projectId, userId, source: 'reset' },
      { projectId, userId: otherUserId, source: 'reset' },
    ]);

    expect(getOrganizationProject).toHaveBeenCalledTimes(1);
    expect(getProjectUsers).toHaveBeenCalledTimes(1);
    expect(getProjectUsers).toHaveBeenCalledWith(
      { projectId, userIds: [userId, otherUserId] },
      undefined
    );
    expect(events.publishMany).toHaveBeenCalledTimes(1);
    const [published] = events.publishMany.mock.calls[0] as unknown as [
      Array<{ aggregate: { id: string }; subjectUserId: string }>,
    ];
    expect(published.map((event) => [event.subjectUserId, event.aggregate.id])).toEqual([
      [userId, memberId],
      [otherUserId, otherMemberId],
    ]);
  });

  it('resolves each project separately', async () => {
    const { publisher, getProjectUsers } = build();

    await publisher.publishPasswordSet([
      { projectId, userId, source: 'reset' },
      { projectId: otherProjectId, userId, source: 'reset' },
    ]);

    expect(getProjectUsers).toHaveBeenCalledTimes(2);
  });

  it('publishes without an aggregate when the user has no membership row, rather than failing the write', async () => {
    const { publisher, events } = build({ members: [] });

    await publisher.publishPasswordSet([{ projectId, userId, source: 'reset' }]);

    const [published] = events.publishMany.mock.calls[0] as unknown as [
      Array<Record<string, unknown>>,
    ];
    expect(published[0]).not.toHaveProperty('aggregate');
    expect(published[0]).toMatchObject({ subjectUserId: userId });
  });

  it('does nothing for an empty change list', async () => {
    const { publisher, events, getProjectUsers } = build();

    await publisher.publishPasswordSet([]);

    expect(events.publishMany).not.toHaveBeenCalled();
    expect(getProjectUsers).not.toHaveBeenCalled();
  });
});
