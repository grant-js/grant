import { describe, expect, it, vi } from 'vitest';

import { ProjectUserRepository } from '@/repositories/project-users.repository';

describe('ProjectUserRepository.getProjectUsers page ids', () => {
  it('queries the project ∩ page user ids instead of the full membership', async () => {
    const repo = new ProjectUserRepository({} as never);
    const queryIntersection = vi
      .spyOn(
        repo as unknown as { queryIntersection: (...args: unknown[]) => Promise<unknown[]> },
        'queryIntersection'
      )
      .mockResolvedValue([]);
    const query = vi
      .spyOn(repo as unknown as { query: (...args: unknown[]) => Promise<unknown[]> }, 'query')
      .mockResolvedValue([]);

    await repo.getProjectUsers({
      projectId: 'project-1',
      userIds: ['page-1', 'page-2'],
    });

    expect(queryIntersection).toHaveBeenCalledWith(
      { projectId: ['project-1'], userId: ['page-1', 'page-2'] },
      undefined
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('returns no rows for an explicit empty userIds list', async () => {
    const repo = new ProjectUserRepository({} as never);
    const queryIntersection = vi.spyOn(
      repo as unknown as { queryIntersection: (...args: unknown[]) => Promise<unknown[]> },
      'queryIntersection'
    );
    const query = vi.spyOn(
      repo as unknown as { query: (...args: unknown[]) => Promise<unknown[]> },
      'query'
    );

    await expect(repo.getProjectUsers({ projectId: 'project-1', userIds: [] })).resolves.toEqual(
      []
    );
    expect(queryIntersection).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('keeps the unscoped project membership query when userIds is omitted', async () => {
    const repo = new ProjectUserRepository({} as never);
    const query = vi
      .spyOn(repo as unknown as { query: (...args: unknown[]) => Promise<unknown[]> }, 'query')
      .mockResolvedValue([]);

    await repo.getProjectUsers({ projectId: 'project-1' });

    expect(query).toHaveBeenCalledWith({ projectId: 'project-1', userId: undefined }, undefined);
  });
});
