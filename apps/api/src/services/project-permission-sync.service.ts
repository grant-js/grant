import type {
  IGroupPermissionService,
  IGroupService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectPermissionSyncService,
  IProjectResourceService,
  IProjectRoleService,
  IProjectUserService,
  IRoleGroupService,
  IRoleService,
  IUserRoleService,
} from '@grantjs/core';
import {
  Scope,
  SyncProjectPermissionsInput,
  SyncProjectPermissionsResult,
  Tenant,
} from '@grantjs/schema';

import { buildCdmImportMetadata } from '@/constants/cdm-import.constants';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  ProjectPermissionSyncRepository,
  ResolvedCdmPermission,
} from '@/repositories/project-permission-sync.repository';

type PermissionRefInput = {
  resourceSlug: string;
  action: string;
  permissionId?: string | null;
  condition?: Record<string, unknown> | null;
};

export class ProjectPermissionSyncService implements IProjectPermissionSyncService {
  constructor(
    private readonly syncRepo: ProjectPermissionSyncRepository,
    private readonly roles: IRoleService,
    private readonly groups: IGroupService,
    private readonly roleGroups: IRoleGroupService,
    private readonly groupPermissions: IGroupPermissionService,
    private readonly projectRoles: IProjectRoleService,
    private readonly projectGroups: IProjectGroupService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly projectResources: IProjectResourceService,
    private readonly projectUsers: IProjectUserService,
    private readonly userRoles: IUserRoleService
  ) {}

  public async syncProjectPermissions(
    params: {
      projectId: string;
      scope: Scope;
      input: SyncProjectPermissionsInput;
    },
    transaction: unknown
  ): Promise<SyncProjectPermissionsResult> {
    const tx = transaction as Transaction;
    const { projectId, scope, input } = params;
    this.assertProjectScope(scope);
    const scopeProjectId = this.projectIdFromScope(scope);
    if (scopeProjectId !== projectId) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    if (input.cdmVersion !== 1) {
      throw new ValidationError('Unsupported cdmVersion; only 1 is allowed');
    }

    const userIdsSeen = new Set<string>();
    for (const ua of input.userAssignments) {
      if (userIdsSeen.has(ua.userId)) {
        throw new ValidationError(`Duplicate userId in userAssignments: ${ua.userId}`);
      }
      userIdsSeen.add(ua.userId);
    }

    const externalKeys = new Set<string>();
    for (const t of input.roleTemplates) {
      if (externalKeys.has(t.externalKey)) {
        throw new ValidationError(`Duplicate role template externalKey: ${t.externalKey}`);
      }
      externalKeys.add(t.externalKey);
      if (t.permissionRefs.length === 0) {
        throw new ValidationError(
          `roleTemplates[${t.externalKey}] must include at least one permissionRef`
        );
      }
    }

    const warnings: string[] = [];

    await this.teardownCdmEntities(projectId, scope, tx);

    const resolvedByKey = await this.resolveAllPermissionRefs(input, tx);

    const result: SyncProjectPermissionsResult = {
      projectId,
      importId: input.importId ?? null,
      rolesCreated: 0,
      groupsCreated: 0,
      roleGroupsLinked: 0,
      groupPermissionsLinked: 0,
      projectRolesLinked: 0,
      projectGroupsLinked: 0,
      projectPermissionsLinked: 0,
      projectResourcesLinked: 0,
      projectUsersEnsured: 0,
      userRolesAssigned: 0,
      warnings,
    };

    const templateKeyToRoleId = new Map<string, string>();
    const directUserIdToRoleId = new Map<string, string>();

    for (const tmpl of input.roleTemplates) {
      const perms = tmpl.permissionRefs.map((r) => this.refKey(r, resolvedByKey));
      const { roleId, counts } = await this.createRoleWithGroupForTemplate(
        projectId,
        scope,
        tmpl.externalKey,
        tmpl.name,
        tmpl.description ?? null,
        'role',
        perms,
        tx
      );
      templateKeyToRoleId.set(tmpl.externalKey, roleId);
      result.rolesCreated += 1;
      result.groupsCreated += 1;
      result.roleGroupsLinked += counts.roleGroups;
      result.groupPermissionsLinked += counts.groupPermissions;
      result.projectRolesLinked += counts.projectRoles;
      result.projectGroupsLinked += counts.projectGroups;
      result.projectPermissionsLinked += counts.projectPermissions;
      result.projectResourcesLinked += counts.projectResources;
    }

    for (const ua of input.userAssignments) {
      const directRefs = ua.directPermissionRefs ?? [];
      const roleKeys = ua.roleTemplateKeys ?? [];
      if (directRefs.length > 0) {
        const perms = directRefs.map((r) => this.refKey(r, resolvedByKey));
        const { roleId, counts } = await this.ensureDirectUserRole(
          projectId,
          scope,
          ua.userId,
          perms,
          tx
        );
        directUserIdToRoleId.set(ua.userId, roleId);
        result.rolesCreated += 1;
        result.groupsCreated += 1;
        result.roleGroupsLinked += counts.roleGroups;
        result.groupPermissionsLinked += counts.groupPermissions;
        result.projectRolesLinked += counts.projectRoles;
        result.projectGroupsLinked += counts.projectGroups;
        result.projectPermissionsLinked += counts.projectPermissions;
        result.projectResourcesLinked += counts.projectResources;
      }

      if (directRefs.length === 0 && roleKeys.length === 0) {
        warnings.push(
          `userAssignments: user ${ua.userId} has no roleTemplateKeys or directPermissionRefs; skipped`
        );
        continue;
      }

      try {
        await this.projectUsers.addProjectUser({ projectId, userId: ua.userId }, tx);
        result.projectUsersEnsured += 1;
      } catch (err) {
        if (err instanceof ConflictError) {
          /* already a project member */
        } else {
          throw err;
        }
      }

      for (const key of roleKeys) {
        const rid = templateKeyToRoleId.get(key);
        if (!rid) {
          throw new ValidationError(`Unknown roleTemplateKey for user ${ua.userId}: ${key}`);
        }
        await this.userRoles.addUserRole({ userId: ua.userId, roleId: rid }, tx);
        result.userRolesAssigned += 1;
      }

      if (directRefs.length > 0) {
        const drid = directUserIdToRoleId.get(ua.userId);
        if (drid) {
          await this.userRoles.addUserRole({ userId: ua.userId, roleId: drid }, tx);
          result.userRolesAssigned += 1;
        }
      }
    }

    return result;
  }

  private assertProjectScope(scope: Scope): void {
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      throw new ValidationError(
        'syncProjectPermissions requires accountProject or organizationProject scope'
      );
    }
  }

  private projectIdFromScope(scope: Scope): string {
    const parts = scope.id.split(':');
    return parts[1] ?? '';
  }

  private refKey(
    r: { resourceSlug: string; action: string; permissionId?: string | null; condition?: unknown },
    resolved: Map<string, ResolvedCdmPermission>
  ): ResolvedCdmPermission {
    const k = this.refDedupKey({
      resourceSlug: r.resourceSlug,
      action: r.action,
      permissionId: r.permissionId ?? undefined,
      condition: (r.condition as Record<string, unknown> | null | undefined) ?? undefined,
    });
    const v = resolved.get(k);
    if (!v) {
      throw new ValidationError('Internal: missing resolved permission for ref');
    }
    return v;
  }

  private refDedupKey(r: PermissionRefInput): string {
    return JSON.stringify({
      s: r.resourceSlug.trim().toLowerCase(),
      a: r.action.trim().toLowerCase(),
      p: r.permissionId ?? null,
      c: r.condition ?? null,
    });
  }

  private async resolveAllPermissionRefs(
    input: SyncProjectPermissionsInput,
    tx: Transaction
  ): Promise<Map<string, ResolvedCdmPermission>> {
    const refs: PermissionRefInput[] = [];
    const add = (r: {
      resourceSlug: string;
      action: string;
      permissionId?: string | null;
      condition?: unknown;
    }) => {
      refs.push({
        resourceSlug: r.resourceSlug,
        action: r.action,
        permissionId: r.permissionId ?? undefined,
        condition: (r.condition as Record<string, unknown> | null | undefined) ?? undefined,
      });
    };
    for (const t of input.roleTemplates) {
      for (const r of t.permissionRefs) add(r);
    }
    for (const u of input.userAssignments) {
      for (const r of u.directPermissionRefs ?? []) add(r);
    }

    const map = new Map<string, ResolvedCdmPermission>();
    for (const r of refs) {
      const k = this.refDedupKey(r);
      if (map.has(k)) continue;
      try {
        const resolved = await this.syncRepo.resolvePermission(
          {
            resourceSlug: r.resourceSlug,
            action: r.action,
            permissionId: r.permissionId ?? null,
            condition: r.condition ?? null,
          },
          tx
        );
        map.set(k, resolved);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'PERMISSION_NOT_FOUND') {
          throw new NotFoundError(
            `Permission not found for ${r.resourceSlug}:${r.action}${r.permissionId ? ` (id ${r.permissionId})` : ''}`
          );
        }
        if (msg === 'PERMISSION_REF_MISMATCH') {
          throw new ValidationError('permissionId does not match resourceSlug/action');
        }
        if (msg === 'PERMISSION_CONDITION_MISMATCH') {
          throw new ValidationError(
            `No permission matches ${r.resourceSlug}:${r.action} with the given condition`
          );
        }
        if (msg === 'PERMISSION_AMBIGUOUS') {
          throw new ValidationError(
            `Multiple permissions match ${r.resourceSlug}:${r.action}; disambiguate with permissionId or condition`
          );
        }
        throw e;
      }
    }
    return map;
  }

  private async teardownCdmEntities(
    projectId: string,
    scope: Scope,
    tx: Transaction
  ): Promise<void> {
    const roleIds = await this.syncRepo.listCdmRoleIdsForProject(projectId, tx);
    const groupIds = await this.syncRepo.listCdmGroupIdsForProject(projectId, tx);

    for (const roleId of roleIds) {
      await this.deleteCdmRole(roleId, projectId, scope, tx);
    }
    for (const groupId of groupIds) {
      await this.deleteCdmGroup(groupId, projectId, scope, tx);
    }
  }

  private async deleteCdmRole(roleId: string, projectId: string, _scope: Scope, tx: Transaction) {
    await this.projectRoles.removeProjectRole({ projectId, roleId }, tx);
    const userLinks = await this.syncRepo.listActiveUserRolesForRoleIds([roleId], tx);
    for (const ur of userLinks) {
      await this.userRoles.removeUserRole({ userId: ur.userId, roleId: ur.roleId }, tx);
    }
    const rgs = await this.roleGroups.getRoleGroups({ roleId }, tx);
    for (const rg of rgs) {
      await this.roleGroups.removeRoleGroup({ roleId: rg.roleId, groupId: rg.groupId }, tx);
    }
    await this.roles.deleteRole({ id: roleId }, tx);
  }

  private async deleteCdmGroup(groupId: string, projectId: string, _scope: Scope, tx: Transaction) {
    await this.projectGroups.removeProjectGroup({ projectId, groupId }, tx);
    const gps = await this.groupPermissions.getGroupPermissions({ groupId }, tx);
    for (const gp of gps) {
      await this.groupPermissions.removeGroupPermission(
        { groupId, permissionId: gp.permissionId },
        tx
      );
    }
    const rgs = await this.roleGroups.getRoleGroups({ groupId }, tx);
    for (const rg of rgs) {
      await this.roleGroups.removeRoleGroup({ roleId: rg.roleId, groupId: rg.groupId }, tx);
    }
    await this.groups.deleteGroup({ id: groupId }, tx);
  }

  private async createRoleWithGroupForTemplate(
    projectId: string,
    scope: Scope,
    externalKey: string,
    name: string,
    description: string | null,
    kind: 'role' | 'directRole',
    perms: ResolvedCdmPermission[],
    tx: Transaction
  ): Promise<{
    roleId: string;
    counts: {
      roleGroups: number;
      groupPermissions: number;
      projectRoles: number;
      projectGroups: number;
      projectPermissions: number;
      projectResources: number;
    };
  }> {
    const groupName = this.truncateName(`CDM: ${externalKey}`);
    const group = await this.groups.createGroup(
      {
        name: groupName,
        description: description ?? `Imported group for ${externalKey}`,
        metadata: buildCdmImportMetadata(projectId, 'group', externalKey),
      },
      tx
    );
    await this.projectGroups.addProjectGroup({ projectId, groupId: group.id }, tx);

    let groupPermissionsLinked = 0;
    let projectPermissionsLinked = 0;
    let projectResourcesLinked = 0;
    for (const p of perms) {
      const hasGp = await this.groupHasPermission(group.id, p.id, tx);
      if (!hasGp) {
        await this.groupPermissions.addGroupPermission(
          { groupId: group.id, permissionId: p.id },
          tx
        );
        groupPermissionsLinked += 1;
      }
      const n = await this.ensureProjectPermissionAndResource(projectId, p, tx);
      projectPermissionsLinked += n.permissions;
      projectResourcesLinked += n.resources;
    }

    const roleName = this.truncateName(`CDM: ${name}`);
    const role = await this.roles.createRole(
      {
        name: roleName,
        description: description ?? undefined,
        metadata: buildCdmImportMetadata(projectId, kind, externalKey),
      },
      tx
    );
    await this.projectRoles.addProjectRole({ projectId, roleId: role.id }, tx);
    await this.roleGroups.addRoleGroup({ roleId: role.id, groupId: group.id }, tx);

    return {
      roleId: role.id,
      counts: {
        roleGroups: 1,
        groupPermissions: groupPermissionsLinked,
        projectRoles: 1,
        projectGroups: 1,
        projectPermissions: projectPermissionsLinked,
        projectResources: projectResourcesLinked,
      },
    };
  }

  // Simplified counting: ensureProjectPermissionAndResource returns { permissions: 0|1, resources: 0|1 }
  private async ensureProjectPermissionAndResource(
    projectId: string,
    p: ResolvedCdmPermission,
    tx: Transaction
  ): Promise<{ permissions: number; resources: number }> {
    let permissions = 0;
    let resources = 0;
    const pList = await this.projectPermissions.getProjectPermissions({ projectId }, tx);
    if (!pList.some((x) => x.permissionId === p.id)) {
      await this.projectPermissions.addProjectPermission({ projectId, permissionId: p.id }, tx);
      permissions = 1;
    }
    if (p.resourceId) {
      const rList = await this.projectResources.getProjectResources({ projectId }, tx);
      if (!rList.some((x) => x.resourceId === p.resourceId)) {
        await this.projectResources.addProjectResource(
          { projectId, resourceId: p.resourceId! },
          tx
        );
        resources = 1;
      }
    }
    return { permissions, resources };
  }

  private async groupHasPermission(
    groupId: string,
    permissionId: string,
    tx: Transaction
  ): Promise<boolean> {
    const list = await this.groupPermissions.getGroupPermissions({ groupId }, tx);
    return list.some((g) => g.permissionId === permissionId);
  }

  private async ensureDirectUserRole(
    projectId: string,
    scope: Scope,
    userId: string,
    perms: ResolvedCdmPermission[],
    tx: Transaction
  ): Promise<{
    roleId: string;
    counts: {
      roleGroups: number;
      groupPermissions: number;
      projectRoles: number;
      projectGroups: number;
      projectPermissions: number;
      projectResources: number;
    };
  }> {
    const externalKey = `direct:${userId}`;
    const r = await this.createRoleWithGroupForTemplate(
      projectId,
      scope,
      externalKey,
      `Direct (${userId.slice(0, 8)}…)`,
      'Direct permission bundle from CDM',
      'directRole',
      perms,
      tx
    );
    return { roleId: r.roleId, counts: r.counts };
  }

  private truncateName(name: string): string {
    return name.length > 255 ? name.slice(0, 252) + '…' : name;
  }
}
