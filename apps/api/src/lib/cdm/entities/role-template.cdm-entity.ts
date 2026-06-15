import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  ICdmEntityHandler,
  IGroupTagService,
  IRoleTagService,
} from '@grantjs/core';

import { CDM_IMPORT_METADATA_KEY, CDM_SOURCE_METADATA_KEY } from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';
import { extractCdmSearchableFromMetadata } from '@/lib/search-document.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';
import type {
  ProjectImportRepository,
  ResolvedCdmPermission,
} from '@/repositories/project-import.repository';

import type { CdmEntityBuilder } from '../cdm-entity-builder';
import type { CdmRoleTemplateInternal } from '../cdm-internal.types';
import { isSyntheticCdmRoleMetadata } from '../cdm-synthetic.lib';
import { buildExternalKey } from '../identity.lib';

const ROLE_TEMPLATE_INPUT_KEY = 'roleTemplates' as const;

/**
 * Handler for `roleTemplates`. Owns CDM-marked role/group entities (metadata
 * `cdmImport.kind === 'role'` and `'group'`).
 *
 * Behavioural parity invariant: this handler must produce the exact same
 * counts and metadata writes that the monolithic `ProjectImportService`
 * used to produce, because the integration suite asserts the result counters
 * field-by-field.
 */
export class RoleTemplateCdmEntity implements ICdmEntityHandler<
  CdmRoleTemplateInternal,
  CdmRoleTemplateInternal
> {
  public readonly handlerKind = 'roleTemplate';
  public readonly inputKey = ROLE_TEMPLATE_INPUT_KEY;
  public readonly order = 10;

  constructor(
    private readonly importRepo: ProjectImportRepository,
    private readonly exportRepo: ProjectExportRepository,
    private readonly builder: CdmEntityBuilder,
    private readonly roleTags: IRoleTagService,
    private readonly groupTags: IGroupTagService
  ) {}

  public validateInput(input: readonly CdmRoleTemplateInternal[]): void {
    const externalKeys = new Set<string>();
    for (const t of input) {
      if (externalKeys.has(t.externalKey)) {
        throw new ValidationError(`Duplicate role template externalKey: ${t.externalKey}`);
      }
      externalKeys.add(t.externalKey);
      if (t.permissionRefs.length === 0) {
        throw new ValidationError(
          `roleTemplates[${t.externalKey}] must include at least one permissionRef`
        );
      }
      assertUniqueStringArray(t.tagKeys, `roleTemplates[${t.externalKey}].tagKeys`);
      assertUniqueStringArray(t.groupTagKeys, `roleTemplates[${t.externalKey}].groupTagKeys`);
      if (t.primaryRoleTagKey != null && t.primaryRoleTagKey !== '') {
        const tags = t.tagKeys ?? [];
        if (!tags.includes(t.primaryRoleTagKey)) {
          throw new ValidationError(
            `roleTemplates[${t.externalKey}]: primaryRoleTagKey must appear in tagKeys`
          );
        }
      }
      if (t.primaryGroupTagKey != null && t.primaryGroupTagKey !== '') {
        const gtags = t.groupTagKeys ?? [];
        if (!gtags.includes(t.primaryGroupTagKey)) {
          throw new ValidationError(
            `roleTemplates[${t.externalKey}]: primaryGroupTagKey must appear in groupTagKeys`
          );
        }
      }
    }
  }

  public collectPermissionRefs(
    input: readonly CdmRoleTemplateInternal[]
  ): readonly CdmPermissionRefSpec[] {
    const refs: CdmPermissionRefSpec[] = [];
    for (const t of input) {
      for (const r of t.permissionRefs) {
        if (r.permissionKey != null && r.permissionKey !== '') {
          refs.push({
            permissionKey: r.permissionKey,
            permissionId: r.permissionId ?? null,
            resourceSlug: r.resourceSlug ?? null,
            action: r.action ?? null,
            condition: (r.condition as Record<string, unknown> | null | undefined) ?? null,
          });
          continue;
        }
        refs.push({
          resourceSlug: r.resourceSlug ?? null,
          action: r.action ?? null,
          permissionId: r.permissionId ?? null,
          condition: (r.condition as Record<string, unknown> | null | undefined) ?? null,
        });
      }
    }
    return refs;
  }

  /**
   * Tear down all CDM-marked roles and groups for the project. Note: the
   * sweep also removes groups belonging to direct-user-role bundles owned by
   * the user-assignment handler, because direct-role groups share the
   * `metadata.cdmImport.kind = 'group'` marker. This is the legacy contract
   * the monolithic `teardownCdmEntities` followed; the user-assignment
   * handler's teardown is therefore a no-op (see its source for rationale).
   */
  public async teardown(ctx: CdmTeardownContext): Promise<void> {
    const tx = ctx.tx as Transaction;
    const roleIds = await this.importRepo.listCdmRoleIdsForProject(ctx.projectId, tx);
    const groupIds = await this.importRepo.listCdmGroupIdsForProject(ctx.projectId, tx);
    for (const roleId of roleIds) {
      await this.builder.deleteCdmRole(roleId, ctx.projectId, ctx.scope, tx);
    }
    for (const groupId of groupIds) {
      await this.builder.deleteCdmGroup(groupId, ctx.projectId, ctx.scope, tx);
    }
  }

  public async apply(
    ctx: CdmApplyContext,
    input: readonly CdmRoleTemplateInternal[]
  ): Promise<void> {
    const tx = ctx.tx as Transaction;
    for (const tmpl of input) {
      const perms = tmpl.permissionRefs.map((r) =>
        this.lookupRef(ctx, {
          permissionKey: r.permissionKey ?? null,
          resourceSlug: r.resourceSlug ?? null,
          action: r.action ?? null,
          permissionId: r.permissionId ?? null,
          condition: (r.condition as Record<string, unknown> | null | undefined) ?? null,
        })
      );
      const usesGroupPath =
        (tmpl.groupTagKeys?.length ?? 0) > 0 ||
        (tmpl.linkedGroupImportName != null && tmpl.linkedGroupImportName !== '') ||
        tmpl.linkedGrantGroup != null;

      const { roleId, groupId, counts } = usesGroupPath
        ? await this.builder.createRoleWithGroup(
            ctx.projectId,
            ctx.scope,
            tmpl.externalKey,
            tmpl.name,
            tmpl.description ?? null,
            'role',
            perms,
            tmpl.metadata,
            tx,
            {
              groupDisplayName: tmpl.linkedGroupImportName ?? undefined,
              groupDisplayDescription: tmpl.linkedGroupImportDescription ?? undefined,
              groupSearchable: tmpl.groupSearchable ?? undefined,
            },
            tmpl.searchable
          )
        : await this.builder.createRoleWithDirectPermissions(
            ctx.projectId,
            ctx.scope,
            tmpl.externalKey,
            tmpl.name,
            tmpl.description ?? null,
            'role',
            perms,
            tmpl.metadata,
            tx,
            tmpl.searchable
          );
      ctx.produced.roleIdsByKey.set(tmpl.externalKey, roleId);
      ctx.result.rolesCreated += 1;
      if (usesGroupPath && groupId) {
        ctx.result.groupsCreated += 1;
        for (const groupKey of tmpl.linkedDocumentGroupKeys ?? []) {
          ctx.produced.groupIdsByKey.set(groupKey, groupId);
        }
      }
      ctx.result.roleGroupsLinked += counts.roleGroups;
      ctx.result.groupPermissionsLinked += counts.groupPermissions;
      ctx.result.projectRolesLinked += counts.projectRoles;
      ctx.result.projectGroupsLinked += counts.projectGroups;
      ctx.result.projectPermissionsLinked += counts.projectPermissions;
      ctx.result.projectResourcesLinked += counts.projectResources;

      for (const tagKey of tmpl.tagKeys ?? []) {
        const tagId = ctx.produced.tagIds.get(tagKey);
        if (!tagId) {
          throw new ValidationError(
            `roleTemplates[${tmpl.externalKey}]: unknown tagKey '${tagKey}'; must appear in the tags section`
          );
        }
        const isPrimary = tagKey === (tmpl.primaryRoleTagKey ?? '');
        await this.roleTags.addRoleTag({ roleId, tagId, isPrimary }, tx);
        ctx.result.roleTagsLinked += 1;
      }
      for (const tagKey of tmpl.groupTagKeys ?? []) {
        const tagId = ctx.produced.tagIds.get(tagKey);
        if (!tagId) {
          throw new ValidationError(
            `roleTemplates[${tmpl.externalKey}]: unknown groupTagKey '${tagKey}'; must appear in the tags section`
          );
        }
        if (!usesGroupPath || !groupId) continue;
        const isPrimary = tagKey === (tmpl.primaryGroupTagKey ?? '');
        await this.groupTags.addGroupTag({ groupId, tagId, isPrimary }, tx);
        ctx.result.groupTagsLinked += 1;
      }
    }
  }

  /**
   * Project current roles + their effective permissions back to the CDM
   * `RoleTemplateCdmInput` shape.
   *
   * Identity preservation: `externalKey = buildExternalKey('role', roleId, name)`.
   * Round-tripped exports never leak Grant UUIDs as identity. The Grant ids are
   * preserved under `metadata.cdmSource.grantRoleId` / `grantGroupId` for
   * traceability.
   *
   * Permission refs prefer the opaque `permissionKey` form when the underlying
   * permission appears in the exported `permissions[]` slice (CDM-owned or
   * catalog snapshot). Otherwise we fall back to `resourceSlug + action + condition`.
   *
   * Tag references (`tagKeys`, `groupTagKeys`) use opaque tag external keys
   * computed via `buildExternalKey('tag', ...)`, mirroring the tag handler's
   * export. Tags not in `project_tags` are omitted because the cross-reference
   * could not resolve on re-import.
   */
  public async export(ctx: CdmExportContext): Promise<readonly CdmRoleTemplateInternal[]> {
    const tx = ctx.tx as Transaction | undefined;
    const rows = await this.exportRepo.getProjectRolesWithPermissions(ctx.projectId, tx);
    if (rows.length === 0) return [];

    const exportableRows = rows.filter((r) => !isSyntheticCdmRoleMetadata(r.metadata));
    if (exportableRows.length === 0) return [];

    const roleIds = exportableRows.map((r) => r.roleId);
    const [roleTagAssoc, groupIdByRoleId, projectTagDefs, cdmPermissions] = await Promise.all([
      this.exportRepo.getRoleTagsByRoleIds(roleIds, tx),
      this.exportRepo.getCdmGroupIdsForRoleIds(roleIds, tx),
      this.exportRepo.getProjectTagDefinitions(ctx.projectId, tx),
      this.exportRepo.getProjectLinkedPermissionsForExport(ctx.projectId, tx),
    ]);
    const groupIds = Array.from(new Set(Array.from(groupIdByRoleId.values())));
    const [groupTagAssoc, groupRows, groupPermRows] = await Promise.all([
      this.exportRepo.getGroupTagsByGroupIds(groupIds, tx),
      this.exportRepo.getGroupsByIds(groupIds, tx),
      this.exportRepo.getGroupPermissionIdsByGroupIds(groupIds, tx),
    ]);

    const tagKeyByTagId = new Map<string, string>();
    for (const t of projectTagDefs) {
      tagKeyByTagId.set(t.tagId, buildExternalKey('tag', t.tagId, t.name, t.color));
    }

    const permissionKeyById = new Map<string, string>();
    for (const p of cdmPermissions) {
      permissionKeyById.set(
        p.permissionId,
        buildExternalKey('permission', p.permissionId, p.resourceSlug ?? '', p.action)
      );
    }

    const permissionKeysByGroupId = new Map<string, Set<string>>();
    for (const row of groupPermRows) {
      const pk = permissionKeyById.get(row.permissionId);
      if (!pk) continue;
      let acc = permissionKeysByGroupId.get(row.groupId);
      if (!acc) {
        acc = new Set<string>();
        permissionKeysByGroupId.set(row.groupId, acc);
      }
      acc.add(pk);
    }
    const sortedPermissionKeysByGroupId = new Map<string, readonly string[]>();
    for (const [gid, set] of permissionKeysByGroupId) {
      sortedPermissionKeysByGroupId.set(gid, [...set].sort());
    }

    const groupMetaById = new Map(groupRows.map((g) => [g.groupId, g]));

    const tagKeysByRoleId = new Map<string, string[]>();
    const primaryRoleTagKeyByRoleId = new Map<string, string>();
    for (const a of roleTagAssoc) {
      const key = tagKeyByTagId.get(a.tagId);
      if (!key) continue;
      const arr = tagKeysByRoleId.get(a.ownerId) ?? [];
      arr.push(key);
      tagKeysByRoleId.set(a.ownerId, arr);
      if (a.isPrimary) {
        primaryRoleTagKeyByRoleId.set(a.ownerId, key);
      }
    }
    const tagKeysByGroupId = new Map<string, string[]>();
    const primaryGroupTagKeyByGroupId = new Map<string, string>();
    for (const a of groupTagAssoc) {
      const key = tagKeyByTagId.get(a.tagId);
      if (!key) continue;
      const arr = tagKeysByGroupId.get(a.ownerId) ?? [];
      arr.push(key);
      tagKeysByGroupId.set(a.ownerId, arr);
      if (a.isPrimary) {
        primaryGroupTagKeyByGroupId.set(a.ownerId, key);
      }
    }

    return exportableRows.map((r) => {
      const groupId = groupIdByRoleId.get(r.roleId);
      const tagKeys = (tagKeysByRoleId.get(r.roleId) ?? []).slice().sort();
      const groupTagKeys = groupId ? (tagKeysByGroupId.get(groupId) ?? []).slice().sort() : [];
      const prk = primaryRoleTagKeyByRoleId.get(r.roleId);
      const primaryRoleTagKey = prk != null && tagKeys.includes(prk) ? prk : undefined;
      const pgk = groupId ? primaryGroupTagKeyByGroupId.get(groupId) : undefined;
      const primaryGroupTagKey = pgk != null && groupTagKeys.includes(pgk) ? pgk : undefined;
      const cdmSource = extractCdmSourceMetadata(r.metadata);
      const metadata = {
        ...(cdmSource ?? {}),
        grantRoleId: r.roleId,
        ...(groupId ? { grantGroupId: groupId } : {}),
      };
      const groupMeta = groupId ? groupMetaById.get(groupId) : undefined;
      const linkedGrantGroup =
        groupId && groupMeta
          ? {
              grantGroupId: groupId,
              groupKey: buildExternalKey('group', groupId, groupMeta.name),
              groupName: groupMeta.name,
              groupDescription: groupMeta.description,
              permissionKeys: sortedPermissionKeysByGroupId.get(groupId) ?? [],
              tagKeys: groupTagKeys,
              primaryGroupTagKey: primaryGroupTagKey ?? null,
              searchable: groupMeta ? extractCdmSearchableFromMetadata(groupMeta.metadata) : null,
            }
          : undefined;
      return {
        externalKey: buildExternalKey('role', r.roleId, stripCdmRolePrefix(r.name)),
        name: stripCdmRolePrefix(r.name),
        description: r.description,
        permissionRefs: r.permissions.map((p) => {
          const permissionKey = permissionKeyById.get(p.permissionId);
          if (permissionKey) {
            return {
              permissionKey,
              resourceSlug: null,
              action: null,
              condition: null,
            };
          }
          return {
            resourceSlug: p.resourceSlug,
            action: p.action,
            condition: p.condition,
          };
        }),
        metadata,
        searchable: extractCdmSearchableFromMetadata(r.metadata),
        tagKeys: tagKeys.length > 0 ? tagKeys : undefined,
        primaryRoleTagKey,
        groupTagKeys: groupTagKeys.length > 0 ? groupTagKeys : undefined,
        primaryGroupTagKey,
        linkedGrantGroup,
      };
    });
  }

  private lookupRef(ctx: CdmApplyContext, ref: CdmPermissionRefSpec): ResolvedCdmPermission {
    return ctx.lookupResolvedRef(ref) as ResolvedCdmPermission;
  }
}

/**
 * Strip the `CDM:` prefix that the importer adds to created role names so
 * round-tripped exports look like the original input.
 */
function stripCdmRolePrefix(name: string): string {
  return name.startsWith('CDM: ') ? name.slice('CDM: '.length) : name;
}

/**
 * Extract the importer-owned `cdmSource` payload, dropping Grant's reserved
 * `cdmImport` envelope so the round-tripped export can be re-imported via
 * `mergeCdmImporterMetadata` without the reserved-key violation check firing.
 *
 * Returns `null` when the source has no importer metadata, matching the
 * optional shape of `RoleTemplateCdmInput.metadata`.
 */
/**
 * Throws when `values` contains duplicates. Used to surface duplicate `tagKeys`
 * / `groupTagKeys` early during input validation.
 */
function assertUniqueStringArray(
  values: readonly string[] | null | undefined,
  label: string
): void {
  if (values == null) return;
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) {
      throw new ValidationError(`${label}: duplicate value '${v}'`);
    }
    seen.add(v);
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
  // Belt-and-suspenders: never let `cdmImport` leak into the export.
  delete out[CDM_IMPORT_METADATA_KEY];
  return Object.keys(out).length > 0 ? out : null;
}
