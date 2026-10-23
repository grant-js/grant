/**
 * `mergeProjectUserCdmMetadata` writes this project's `cdmImport` user marker on the
 * membership row, so the project-scoped read (global user metadata shallow-merged with the
 * row's, row wins) shows it for a reused identity whose global metadata carries none, or
 * carries another project's marker.
 */
import { describe, expect, it, vi } from 'vitest';

import { mergeEffectiveUserMetadataForProject } from '@/lib/effective-project-user-metadata.lib';
import { ProjectUserRepository } from '@/repositories/project-users.repository';

const projectId = '10000000-0000-4000-8000-000000000011';
const otherProjectId = '10000000-0000-4000-8000-000000000012';
const userId = '30000000-0000-4000-8000-000000000099';
const externalKey = 'user@example.test';

function buildRepo(initialRowMetadata: Record<string, unknown>) {
  const repo = new ProjectUserRepository({} as never);
  let rowMetadata = initialRowMetadata;
  vi.spyOn(repo, 'getProjectUsers').mockImplementation(
    async () => [{ projectId, userId, metadata: rowMetadata }] as never
  );
  const update = vi
    .spyOn(repo as never as { update: (...a: unknown[]) => Promise<unknown> }, 'update')
    .mockImplementation(async (_where: unknown, values: unknown) => {
      rowMetadata = (values as { metadata: Record<string, unknown> }).metadata;
      return { projectId, userId, metadata: rowMetadata };
    });
  return { repo, update, read: () => rowMetadata };
}

describe('ProjectUserRepository.mergeProjectUserCdmMetadata cdmImport marker', () => {
  it('writes the marker next to cdmSource', async () => {
    const { repo, read } = buildRepo({});
    await repo.mergeProjectUserCdmMetadata({
      projectId,
      userId,
      importerMetadata: { legacyUserId: 'u-1' },
      userExternalKey: externalKey,
    });
    expect(read()).toEqual({
      cdmSource: { legacyUserId: 'u-1' },
      cdmImport: { projectId, kind: 'user', externalKey },
    });
  });

  it('writes the marker when the assignment has no metadata or searchable', async () => {
    const { repo, read } = buildRepo({});
    await repo.mergeProjectUserCdmMetadata({
      projectId,
      userId,
      importerMetadata: null,
      userExternalKey: externalKey,
    });
    expect(read()).toEqual({ cdmImport: { projectId, kind: 'user', externalKey } });
  });

  it('leaves metadata without a marker when no external key is given', async () => {
    const { repo, read } = buildRepo({ note: 'x' });
    await repo.mergeProjectUserCdmMetadata({ projectId, userId, importerMetadata: null });
    expect(read()).toEqual({ note: 'x' });
  });

  it('is idempotent on re-import: same value, no duplicate keys', async () => {
    const { repo, read } = buildRepo({});
    const params = {
      projectId,
      userId,
      importerMetadata: { legacyUserId: 'u-1' },
      userExternalKey: externalKey,
    };
    await repo.mergeProjectUserCdmMetadata(params);
    const first = structuredClone(read());
    await repo.mergeProjectUserCdmMetadata(params);
    expect(read()).toEqual(first);
    expect(Object.keys(read()).sort()).toEqual(['cdmImport', 'cdmSource']);
  });

  it('project-scoped read shows this project marker over another project marker on the global user', async () => {
    const { repo, read } = buildRepo({});
    await repo.mergeProjectUserCdmMetadata({
      projectId,
      userId,
      importerMetadata: { legacyUserId: 'u-1' },
      userExternalKey: externalKey,
    });
    const globalMetadata = {
      cdmImport: { projectId: otherProjectId, kind: 'user', externalKey: 'other-key' },
    };
    const effective = mergeEffectiveUserMetadataForProject(globalMetadata, read());
    expect(effective.cdmImport).toEqual({ projectId, kind: 'user', externalKey });
    expect(effective.cdmSource).toEqual({ legacyUserId: 'u-1' });
    // The global user's metadata is not touched by the merge.
    expect(globalMetadata.cdmImport.projectId).toBe(otherProjectId);
  });

  it('project-scoped read carries the marker when the global user has none', async () => {
    const { repo, read } = buildRepo({});
    await repo.mergeProjectUserCdmMetadata({
      projectId,
      userId,
      importerMetadata: null,
      userExternalKey: externalKey,
    });
    const effective = mergeEffectiveUserMetadataForProject({}, read());
    expect(effective.cdmImport).toEqual({ projectId, kind: 'user', externalKey });
  });
});
