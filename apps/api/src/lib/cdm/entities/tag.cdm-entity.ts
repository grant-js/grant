import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  ICdmEntityHandler,
  IProjectTagService,
  ITagService,
} from '@grantjs/core';
import { TagCdmInput } from '@grantjs/schema';

import {
  buildCdmImportMetadata,
  CDM_IMPORT_METADATA_KEY,
  CDM_SOURCE_METADATA_KEY,
  mergeCdmImporterMetadata,
} from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';
import type { ProjectImportRepository } from '@/repositories/project-import.repository';

import { buildExternalKey } from '../identity.lib';

const TAG_INPUT_KEY = 'tags' as const;

/**
 * Handler for the CDM `tags` section. Owns CDM-marked tag rows
 * (`tags.metadata.cdmImport.kind === 'tag'`) and their `project_tags`
 * membership for the importing project.
 *
 * Order = 5: runs before `RoleTemplateCdmEntity` (10) and
 * `UserAssignmentCdmEntity` (20) so those handlers can resolve `tagKeys` /
 * `groupTagKeys` against `produced.tagIds` populated here.
 *
 * Teardown deletes only CDM-marked tags belonging to this project plus
 * their pivot rows (`project_tags`, `role_tags`, `group_tags`, `user_tags`,
 * `project_app_tags`, `permission_tags`, `resource_tags`).
 * User-created tags are never touched.
 */
export class TagCdmEntity implements ICdmEntityHandler<TagCdmInput, TagCdmInput> {
  public readonly handlerKind = 'tag';
  public readonly inputKey = TAG_INPUT_KEY;
  public readonly order = 5;

  constructor(
    private readonly importRepo: ProjectImportRepository,
    private readonly exportRepo: ProjectExportRepository,
    private readonly tags: ITagService,
    private readonly projectTags: IProjectTagService
  ) {}

  public validateInput(input: readonly TagCdmInput[]): void {
    const externalKeys = new Set<string>();
    for (const t of input) {
      const key = t.key?.trim() ?? '';
      if (key === '') {
        throw new ValidationError('tags[]: key is required for each tag');
      }
      if (externalKeys.has(key)) {
        throw new ValidationError(`Duplicate tags key: ${key}`);
      }
      externalKeys.add(key);
      if (typeof t.name !== 'string' || t.name.trim() === '') {
        throw new ValidationError(`tags[${key}]: name is required`);
      }
      if (typeof t.color !== 'string' || t.color.trim() === '') {
        throw new ValidationError(`tags[${key}]: color is required`);
      }
    }
  }

  public collectPermissionRefs(_input: readonly TagCdmInput[]): readonly CdmPermissionRefSpec[] {
    return [];
  }

  public async teardown(ctx: CdmTeardownContext): Promise<void> {
    const tx = ctx.tx as Transaction;
    const tagIds = await this.importRepo.listCdmTagIdsForProject(ctx.projectId, tx);
    if (tagIds.length === 0) return;
    await this.importRepo.bulkSoftDeleteCdmTags(tagIds, ctx.projectId, tx);
  }

  public async apply(ctx: CdmApplyContext, input: readonly TagCdmInput[]): Promise<void> {
    const tx = ctx.tx as Transaction;
    for (const row of input) {
      const key = row.key?.trim() ?? '';
      const tagMetadata = mergeCdmImporterMetadata(
        buildCdmImportMetadata(ctx.projectId, 'tag', key),
        row.metadata
      );
      const tag = await this.tags.createTag(
        {
          name: row.name,
          color: row.color,
          metadata: tagMetadata,
        },
        tx
      );
      await this.projectTags.addProjectTag(
        {
          projectId: ctx.projectId,
          tagId: tag.id,
          isPrimary: false,
        },
        tx
      );
      ctx.produced.tagIds.set(key, tag.id);
      ctx.result.tagsCreated += 1;
      ctx.result.projectTagsLinked += 1;
    }
  }

  /**
   * Project current `project_tags` membership back to `TagCdmInput[]`.
   *
   * Identity: `externalKey = buildExternalKey('tag', tagId, name, color)` so
   * round-tripped exports never leak Grant UUIDs as identity. The Grant id is
   * preserved under `metadata.cdmSource.grantTagId` for traceability and is
   * the source of truth other handlers use to map their own pivot rows
   * (`role_tags`, `group_tags`, `user_tags`) back to the same externalKey.
   *
   * Metadata: importer-supplied `cdmSource` is forwarded; Grant strips the
   * reserved `cdmImport` envelope on export and adds `grantTagId` for
   * traceability.
   */
  public async export(ctx: CdmExportContext): Promise<readonly TagCdmInput[]> {
    const tx = ctx.tx as Transaction | undefined;
    const rows = await this.exportRepo.getProjectTagDefinitions(ctx.projectId, tx);
    return rows.map((r) => {
      const cdmSource = extractCdmSourceMetadata(r.metadata);
      const metadata = {
        ...(cdmSource ?? {}),
        grantTagId: r.tagId,
      };
      const opaqueKey = buildExternalKey('tag', r.tagId, r.name, r.color);
      return {
        key: opaqueKey,
        name: r.name,
        color: r.color,
        metadata,
      };
    });
  }
}

function extractCdmSourceMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> | null {
  const source = metadata[CDM_SOURCE_METADATA_KEY];
  if (source == null || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  const out = { ...(source as Record<string, unknown>) };
  delete out[CDM_IMPORT_METADATA_KEY];
  return Object.keys(out).length > 0 ? out : null;
}
