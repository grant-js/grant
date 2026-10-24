import type { DbSchema, ProjectAppModel } from '@grantjs/database';
import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/lib/errors';
import { ProjectAppRepository } from '@/repositories/project-apps.repository';

const projectId = '00000000-0000-4000-8000-0000000000b1';
const otherProjectId = '00000000-0000-4000-8000-0000000000b2';
const projectAppId = '00000000-0000-4000-8000-0000000000c1';

function rowFixture(overrides: Partial<ProjectAppModel> = {}): ProjectAppModel {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: projectAppId,
    projectId,
    clientId: 'client-1',
    clientSecretHash: null,
    name: 'App',
    redirectUris: ['https://app.example/cb'],
    scopes: null,
    enabledProviders: null,
    allowSignUp: false,
    signUpRoleId: null,
    pictureUrl: null,
    picturePath: null,
    primaryColor: null,
    showHelpPanel: null,
    themeMode: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function collectedValues(node: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown) => {
    if (value == null || seen.has(value)) {
      return;
    }
    if (typeof value !== 'object') {
      out.push(value);
      return;
    }
    seen.add(value);
    const obj = value as Record<string, unknown>;
    if ('value' in obj && obj.value !== undefined && typeof obj.value !== 'object') {
      out.push(obj.value);
    }
    if (Array.isArray(obj.queryChunks)) {
      obj.queryChunks.forEach(walk);
    }
  };
  walk(node);
  return out;
}

function buildDb(returningRows: ProjectAppModel[]) {
  const where = vi.fn();
  const set = vi.fn();
  const update = vi.fn(() => ({
    set: (input: Record<string, unknown>) => {
      set(input);
      return {
        where: (condition: unknown) => {
          where(condition);
          return {
            returning: () => Promise.resolve(returningRows),
          };
        },
      };
    },
  }));
  return {
    db: { update } as unknown as DbSchema,
    update,
    set,
    where,
  };
}

describe('ProjectAppRepository project-app bind', () => {
  describe('updateProjectApp', () => {
    it('persists with id and projectId and returns the row', async () => {
      const row = rowFixture({ name: 'Renamed' });
      const { db, where, set } = buildDb([row]);
      const repo = new ProjectAppRepository(db);

      await expect(
        repo.updateProjectApp({ id: projectAppId, projectId, name: 'Renamed' })
      ).resolves.toEqual(expect.objectContaining({ id: projectAppId, projectId, name: 'Renamed' }));

      const bound = collectedValues(where.mock.calls[0]?.[0]);
      expect(bound).toContain(projectAppId);
      expect(bound).toContain(projectId);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Renamed', updatedAt: expect.any(Date) })
      );
      expect(set.mock.calls[0]?.[0]).not.toHaveProperty('projectId');
    });

    it('throws not-found when the id/project bind misses', async () => {
      const { db, where } = buildDb([]);
      const repo = new ProjectAppRepository(db);

      await expect(
        repo.updateProjectApp({ id: projectAppId, projectId: otherProjectId, name: 'Renamed' })
      ).rejects.toBeInstanceOf(NotFoundError);

      const bound = collectedValues(where.mock.calls[0]?.[0]);
      expect(bound).toContain(projectAppId);
      expect(bound).toContain(otherProjectId);
    });
  });

  describe('softDeleteProjectApp', () => {
    it('persists with id and projectId and returns the row', async () => {
      const row = rowFixture({ deletedAt: new Date('2026-01-02T00:00:00.000Z') });
      const { db, where, set } = buildDb([row]);
      const repo = new ProjectAppRepository(db);

      await expect(repo.softDeleteProjectApp({ id: projectAppId, projectId })).resolves.toEqual(
        expect.objectContaining({ id: projectAppId, projectId, deletedAt: row.deletedAt })
      );

      const bound = collectedValues(where.mock.calls[0]?.[0]);
      expect(bound).toContain(projectAppId);
      expect(bound).toContain(projectId);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date), updatedAt: expect.any(Date) })
      );
    });

    it('throws not-found when the id/project bind misses', async () => {
      const { db, where } = buildDb([]);
      const repo = new ProjectAppRepository(db);

      await expect(
        repo.softDeleteProjectApp({ id: projectAppId, projectId: otherProjectId })
      ).rejects.toBeInstanceOf(NotFoundError);

      const bound = collectedValues(where.mock.calls[0]?.[0]);
      expect(bound).toContain(projectAppId);
      expect(bound).toContain(otherProjectId);
    });
  });
});
