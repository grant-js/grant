import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  ICdmEntityHandler,
  IProjectUserService,
  IUserRoleService,
  IUserTagService,
} from '@grantjs/core';

import { extractProjectUserMetadataForCdmExport } from '@/constants/cdm-import.constants';
import { ConflictError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';
import type { ResolvedCdmPermission } from '@/repositories/project-import.repository';

import type { CdmEntityBuilder } from '../cdm-entity-builder';
import { resolveCdmExportExternalKey } from '../cdm-export-key.lib';
import type { CdmPermissionRefInternal, CdmUserAssignmentInternal } from '../cdm-internal.types';
import { isSyntheticCdmRoleMetadata } from '../cdm-synthetic.lib';
import { buildExternalKey } from '../identity.lib';

const USER_ASSIGNMENT_INPUT_KEY = 'userAssignments' as const;

/**
 * Handler for `userAssignments`. Owns:
 *
 * - direct user permissions (`user_permissions` / `project_user_permissions`),
 * - direct user groups (`user_groups` / `project_user_groups`),
 * - user → project membership (`project_users` upsert + `cdmSource` metadata merge),
 * - role assignments (`user_roles` rows pointing at template-handler roles).
 */
export class UserAssignmentCdmEntity implements ICdmEntityHandler<
  CdmUserAssignmentInternal,
  CdmUserAssignmentInternal
> {
  public readonly handlerKind = 'userAssignment';
  public readonly inputKey = USER_ASSIGNMENT_INPUT_KEY;
  public readonly order = 20;

  constructor(
    private readonly exportRepo: ProjectExportRepository,
    private readonly builder: CdmEntityBuilder,
    private readonly projectUsers: IProjectUserService,
    private readonly userRoles: IUserRoleService,
    private readonly userTags: IUserTagService
  ) {}

  public validateInput(input: readonly CdmUserAssignmentInternal[]): void {
    for (const [i, ua] of input.entries()) {
      if (ua.tagKeys != null) {
        const seen = new Set<string>();
        for (const k of ua.tagKeys) {
          if (seen.has(k)) {
            throw new ValidationError(`userAssignments[${i}].tagKeys: duplicate value '${k}'`);
          }
          seen.add(k);
        }
      }
    }
  }

  public collectPermissionRefs(
    input: readonly CdmUserAssignmentInternal[]
  ): readonly CdmPermissionRefSpec[] {
    const refs: CdmPermissionRefSpec[] = [];
    for (const ua of input) {
      for (const dg of ua.directGroups ?? []) {
        for (const r of dg.permissionRefs) {
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
      for (const r of ua.directPermissionRefs ?? []) {
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
   * No-op. Direct-user-role roles + groups created by this handler are
   * torn down by the role-template handler's monolithic sweep, because they
   * share `metadata.cdmImport.kind = 'group'` with template groups and the
   * project-id filter alone is enough to find them.
   *
   * Future entity handlers (API keys, project apps, …) own their teardown
   * and should perform their kind-specific delete here.
   */
  public async teardown(_ctx: CdmTeardownContext): Promise<void> {
    return;
  }

  public async apply(
    ctx: CdmApplyContext,
    input: readonly CdmUserAssignmentInternal[]
  ): Promise<void> {
    const tx = ctx.tx as Transaction;

    for (const ua of input) {
      const effectiveUserId = resolveAssignmentUserId(ua, ctx);
      const directRefs = ua.directPermissionRefs ?? [];
      const roleKeys = ua.roleTemplateKeys ?? [];
      const directGroups = ua.directGroups ?? [];

      if (directRefs.length > 0) {
        const perms = directRefs.map(
          (r) =>
            ctx.lookupResolvedRef({
              permissionKey: r.permissionKey ?? null,
              resourceSlug: r.resourceSlug ?? null,
              action: r.action ?? null,
              permissionId: r.permissionId ?? null,
              condition: (r.condition as Record<string, unknown> | null | undefined) ?? null,
            }) as ResolvedCdmPermission
        );
        const counts = await this.builder.linkDirectPermissionsToUser(
          ctx.projectId,
          ctx.scope,
          effectiveUserId,
          perms,
          tx
        );
        ctx.result.projectPermissionsLinked += counts.projectPermissions;
        ctx.result.projectResourcesLinked += counts.projectResources;
      }

      const linkedDirectGroupIds: string[] = [];
      for (const dg of directGroups) {
        let groupId = ctx.produced.groupIdsByKey.get(dg.groupKey);
        if (!groupId) {
          const doc = ctx.documentGroupsByKey.get(dg.groupKey);
          if (!doc) {
            throw new ValidationError(
              `userAssignments[${effectiveUserId}]: unknown groupKey '${dg.groupKey}'; must appear in the groups section`
            );
          }
          const displayName =
            doc.name != null && String(doc.name).trim() !== ''
              ? String(doc.name).trim()
              : dg.groupKey;
          const description =
            typeof doc.description === 'string' && doc.description.trim() !== ''
              ? doc.description.trim()
              : null;
          const perms = dg.permissionRefs.map(
            (r) =>
              ctx.lookupResolvedRef({
                permissionKey: r.permissionKey ?? null,
                resourceSlug: r.resourceSlug ?? null,
                action: r.action ?? null,
                permissionId: r.permissionId ?? null,
                condition: (r.condition as Record<string, unknown> | null | undefined) ?? null,
              }) as ResolvedCdmPermission
          );
          const created = await this.builder.createDocumentGroup(
            ctx.projectId,
            dg.groupKey,
            displayName,
            description,
            perms,
            ua.metadata,
            tx
          );
          groupId = created.groupId;
          ctx.produced.groupIdsByKey.set(dg.groupKey, groupId);
          ctx.result.groupsCreated += 1;
          ctx.result.groupPermissionsLinked += created.groupPermissions;
          ctx.result.projectGroupsLinked += created.projectGroups;
          ctx.result.projectPermissionsLinked += created.projectPermissions;
          ctx.result.projectResourcesLinked += created.projectResources;
        }
        linkedDirectGroupIds.push(groupId);
      }

      if (linkedDirectGroupIds.length > 0) {
        const groupCounts = await this.builder.linkDirectGroupsToUser(
          ctx.projectId,
          ctx.scope,
          effectiveUserId,
          linkedDirectGroupIds,
          tx
        );
        ctx.result.projectGroupsLinked += groupCounts.projectGroups;
        ctx.result.projectPermissionsLinked += groupCounts.projectPermissions;
        ctx.result.projectResourcesLinked += groupCounts.projectResources;
      }

      if (directRefs.length === 0 && roleKeys.length === 0 && directGroups.length === 0) {
        ctx.result.warnings.push(
          `userAssignments: user ${effectiveUserId} has no roleTemplateKeys, directGroupKeys, or directPermissionRefs; skipped`
        );
        continue;
      }

      try {
        await this.projectUsers.addProjectUser(
          { projectId: ctx.projectId, userId: effectiveUserId },
          tx
        );
        ctx.result.projectUsersEnsured += 1;
      } catch (err) {
        if (err instanceof ConflictError) {
          /* already a project member; idempotent */
        } else {
          throw err;
        }
      }

      if (ua.metadata != null) {
        await this.projectUsers.mergeProjectUserCdmMetadata(
          {
            projectId: ctx.projectId,
            userId: effectiveUserId,
            importerMetadata: ua.metadata as Record<string, unknown>,
          },
          tx
        );
      }

      for (const key of roleKeys) {
        const rid = ctx.produced.roleIdsByKey.get(key);
        if (!rid) {
          throw new ValidationError(`Unknown roleTemplateKey for user ${effectiveUserId}: ${key}`);
        }
        await this.userRoles.addUserRole({ userId: effectiveUserId, roleId: rid }, tx);
        ctx.result.userRolesAssigned += 1;
      }

      for (const tagKey of ua.tagKeys ?? []) {
        const tagId = ctx.produced.tagIds.get(tagKey);
        if (!tagId) {
          throw new ValidationError(
            `userAssignments[${effectiveUserId}]: unknown tagKey '${tagKey}'; must appear in the tags section`
          );
        }
        const isPrimary = tagKey === (ua.primaryUserTagKey ?? '');
        await this.userTags.addUserTag({ userId: effectiveUserId, tagId, isPrimary }, tx);
        ctx.result.userTagsLinked += 1;
      }
    }
  }

  /**
   * Project current project-users, direct grants, and role assignments back to
   * the CDM `UserAssignmentCdmInput` shape.
   *
   * - `roleTemplateKeys` use opaque role external keys (never Grant UUIDs).
   * - `directPermissionRefs` / `directGroupKeys` reflect native user grants.
   * - Legacy synthetic roles are omitted from `roleTemplateKeys`; their
   *   permissions are migrated into `directPermissionRefs`.
   * - Users with only direct grants (no roles) are included.
   */
  public async export(ctx: CdmExportContext): Promise<readonly CdmUserAssignmentInternal[]> {
    const tx = ctx.tx as Transaction | undefined;
    const [rows, roleRows, projectTagDefs, cdmPermissions] = await Promise.all([
      this.exportRepo.getProjectUsersWithRoleIds(ctx.projectId, tx),
      this.exportRepo.getProjectRolesWithPermissions(ctx.projectId, tx),
      this.exportRepo.getProjectTagDefinitions(ctx.projectId, tx),
      this.exportRepo.getProjectLinkedPermissionsForExport(ctx.projectId, tx),
    ]);

    const syntheticRoleIds = new Set(
      roleRows.filter((r) => isSyntheticCdmRoleMetadata(r.metadata)).map((r) => r.roleId)
    );
    const permissionsBySyntheticRoleId = new Map(
      roleRows
        .filter((r) => syntheticRoleIds.has(r.roleId))
        .map((r) => [r.roleId, r.permissions] as const)
    );

    const roleKeyById = new Map<string, string>();
    for (const r of roleRows) {
      if (syntheticRoleIds.has(r.roleId)) continue;
      const name = r.name.startsWith('CDM: ') ? r.name.slice('CDM: '.length) : r.name;
      roleKeyById.set(r.roleId, resolveCdmExportExternalKey('role', r.roleId, name, r.metadata));
    }

    const permissionKeyById = new Map<string, string>();
    for (const p of cdmPermissions) {
      permissionKeyById.set(
        p.permissionId,
        buildExternalKey('permission', p.permissionId, p.resourceSlug ?? '', p.action)
      );
    }

    const tagKeyByTagId = new Map<string, string>();
    for (const t of projectTagDefs) {
      tagKeyByTagId.set(t.tagId, buildExternalKey('tag', t.tagId, t.name, t.color));
    }

    const userIds = rows.map((u) => u.userId);
    const [directPerms, directGroups, userTagAssoc, provisionedUsers] = await Promise.all([
      this.exportRepo.getProjectUserDirectPermissions(ctx.projectId, userIds, tx),
      this.exportRepo.getProjectUserDirectGroups(ctx.projectId, userIds, tx),
      this.exportRepo.getUserTagsByUserIds(userIds, tx),
      this.exportRepo.getProjectCdmProvisionedUsers(ctx.projectId, tx),
    ]);

    const directGroupIds = [...new Set(directGroups.map((g) => g.groupId))];
    const [groupRows, groupPermRows, groupTagAssocForGroups] = await Promise.all([
      directGroupIds.length > 0
        ? this.exportRepo.getGroupsByIds(directGroupIds, tx)
        : Promise.resolve([]),
      directGroupIds.length > 0
        ? this.exportRepo.getGroupPermissionIdsByGroupIds(directGroupIds, tx)
        : Promise.resolve([]),
      directGroupIds.length > 0
        ? this.exportRepo.getGroupTagsByGroupIds(directGroupIds, tx)
        : Promise.resolve([]),
    ]);
    const groupKeyById = new Map(
      groupRows.map((g) => [
        g.groupId,
        resolveCdmExportExternalKey('group', g.groupId, g.name, g.metadata),
      ])
    );
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
    const tagKeysByGroupId = new Map<string, string[]>();
    const primaryGroupTagKeyByGroupId = new Map<string, string>();
    for (const a of groupTagAssocForGroups) {
      const key = tagKeyByTagId.get(a.tagId);
      if (!key) continue;
      const arr = tagKeysByGroupId.get(a.ownerId) ?? [];
      arr.push(key);
      tagKeysByGroupId.set(a.ownerId, arr);
      if (a.isPrimary) {
        primaryGroupTagKeyByGroupId.set(a.ownerId, key);
      }
    }
    const exportDocumentGroupByKey = new Map<
      string,
      NonNullable<CdmUserAssignmentInternal['exportDocumentGroups']>[number]
    >();
    for (const g of groupRows) {
      const groupKey = groupKeyById.get(g.groupId);
      if (!groupKey) continue;
      const groupTagKeys = (tagKeysByGroupId.get(g.groupId) ?? []).slice().sort();
      const pgk = primaryGroupTagKeyByGroupId.get(g.groupId);
      exportDocumentGroupByKey.set(groupKey, {
        grantGroupId: g.groupId,
        groupKey,
        groupName: g.name,
        groupDescription: g.description,
        permissionKeys: [...(permissionKeysByGroupId.get(g.groupId) ?? [])].sort(),
        tagKeys: groupTagKeys,
        primaryGroupTagKey: pgk != null && groupTagKeys.includes(pgk) ? pgk : null,
      });
    }

    const directPermsByUserId = new Map<string, CdmPermissionRefInternal[]>();
    for (const row of directPerms) {
      const permissionKey = permissionKeyById.get(row.permissionId);
      const ref: CdmPermissionRefInternal = permissionKey
        ? {
            permissionKey,
            resourceSlug: null,
            action: null,
            permissionId: null,
            condition: null,
          }
        : {
            resourceSlug: row.resourceSlug,
            action: row.action,
            condition: row.condition,
            permissionKey: null,
            permissionId: null,
          };
      const arr = directPermsByUserId.get(row.userId) ?? [];
      arr.push(ref);
      directPermsByUserId.set(row.userId, arr);
    }

    const directGroupKeysByUserId = new Map<string, string[]>();
    for (const row of directGroups) {
      const key = groupKeyById.get(row.groupId);
      if (!key) continue;
      const arr = directGroupKeysByUserId.get(row.userId) ?? [];
      if (!arr.includes(key)) arr.push(key);
      directGroupKeysByUserId.set(row.userId, arr);
    }

    const provisionKeyByUserId = new Map<string, string>();
    for (const p of provisionedUsers) {
      provisionKeyByUserId.set(
        p.userId,
        resolveCdmExportExternalKey('user', p.userId, p.name, p.metadata)
      );
    }

    const tagKeysByUserId = new Map<string, string[]>();
    const primaryUserTagKeyByUserId = new Map<string, string>();
    for (const a of userTagAssoc) {
      const key = tagKeyByTagId.get(a.tagId);
      if (!key) continue;
      const arr = tagKeysByUserId.get(a.ownerId) ?? [];
      arr.push(key);
      tagKeysByUserId.set(a.ownerId, arr);
      if (a.isPrimary) {
        primaryUserTagKeyByUserId.set(a.ownerId, key);
      }
    }

    const visible = rows.filter((u) => {
      const hasNonSyntheticRole = u.roleIds.some((id) => !syntheticRoleIds.has(id));
      const hasDirectPerm = (directPermsByUserId.get(u.userId)?.length ?? 0) > 0;
      const hasDirectGroup = (directGroupKeysByUserId.get(u.userId)?.length ?? 0) > 0;
      const hasSyntheticOnlyRole =
        u.roleIds.length > 0 && u.roleIds.every((id) => syntheticRoleIds.has(id));
      return hasNonSyntheticRole || hasDirectPerm || hasDirectGroup || hasSyntheticOnlyRole;
    });
    if (visible.length === 0) return [];

    return visible.map((u) => {
      const roleTemplateKeys = u.roleIds
        .filter((id) => !syntheticRoleIds.has(id))
        .map((id) => roleKeyById.get(id))
        .filter((k): k is string => Boolean(k));

      const directPermissionRefs: CdmPermissionRefInternal[] = [
        ...(directPermsByUserId.get(u.userId) ?? []),
      ];
      const seenPerm = new Set(
        directPermissionRefs.map(
          (r) =>
            r.permissionKey ??
            `${r.resourceSlug ?? ''}:${r.action ?? ''}:${JSON.stringify(r.condition ?? null)}`
        )
      );
      for (const roleId of u.roleIds) {
        if (!syntheticRoleIds.has(roleId)) continue;
        for (const p of permissionsBySyntheticRoleId.get(roleId) ?? []) {
          const permissionKey = permissionKeyById.get(p.permissionId);
          const ref: CdmPermissionRefInternal = permissionKey
            ? {
                permissionKey,
                resourceSlug: null,
                action: null,
                permissionId: null,
                condition: null,
              }
            : {
                resourceSlug: p.resourceSlug,
                action: p.action,
                condition: p.condition,
                permissionKey: null,
                permissionId: null,
              };
          const dedup =
            ref.permissionKey ??
            `${ref.resourceSlug ?? ''}:${ref.action ?? ''}:${JSON.stringify(ref.condition ?? null)}`;
          if (seenPerm.has(dedup)) continue;
          seenPerm.add(dedup);
          directPermissionRefs.push(ref);
        }
      }

      const directGroupKeys = (directGroupKeysByUserId.get(u.userId) ?? []).slice().sort();
      const exportDocumentGroups = directGroupKeys
        .map((key) => exportDocumentGroupByKey.get(key))
        .filter((g): g is NonNullable<typeof g> => Boolean(g));
      const tagKeys = (tagKeysByUserId.get(u.userId) ?? []).slice().sort();
      const userKey = provisionKeyByUserId.get(u.userId);
      const primaryUserTagKey = primaryUserTagKeyByUserId.get(u.userId);
      const base = {
        roleTemplateKeys,
        directGroupKeys: directGroupKeys.length > 0 ? directGroupKeys : undefined,
        exportDocumentGroups: exportDocumentGroups.length > 0 ? exportDocumentGroups : undefined,
        directPermissionRefs: directPermissionRefs.length > 0 ? directPermissionRefs : undefined,
        metadata: extractProjectUserMetadataForCdmExport(u.metadata),
        tagKeys: tagKeys.length > 0 ? tagKeys : undefined,
        primaryUserTagKey:
          primaryUserTagKey != null && tagKeys.includes(primaryUserTagKey)
            ? primaryUserTagKey
            : undefined,
      };
      if (userKey != null) {
        return { ...base, userKey, userId: undefined };
      }
      return { ...base, userId: u.userId, userKey: undefined };
    });
  }
}

function resolveAssignmentUserId(ua: CdmUserAssignmentInternal, ctx: CdmApplyContext): string {
  if (ua.userId != null && ua.userId !== '') {
    return ua.userId;
  }
  if (ua.userKey != null && ua.userKey !== '') {
    const id = ctx.produced.userIds.get(ua.userKey);
    if (!id) {
      throw new ValidationError(`userAssignments: unresolved userKey '${ua.userKey}'`);
    }
    return id;
  }
  throw new ValidationError('userAssignments: each entry requires userId or userKey');
}
