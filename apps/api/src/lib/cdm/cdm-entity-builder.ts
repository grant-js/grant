import type {
  IGroupPermissionService,
  IGroupService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectResourceService,
  IProjectRolePermissionService,
  IProjectRoleService,
  IProjectUserGroupService,
  IProjectUserPermissionService,
  IRoleGroupService,
  IRolePermissionService,
  IRoleService,
  IUserGroupService,
  IUserPermissionService,
  IUserRoleService,
} from '@grantjs/core';
import { Scope } from '@grantjs/schema';

import { buildCdmImportMetadata, mergeCdmImporterMetadata } from '@/constants/cdm-import.constants';
import {
  buildSearchDocument,
  mergeImporterMetadataWithSearchable,
} from '@/lib/search-document.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  ProjectImportRepository,
  ResolvedCdmPermission,
} from '@/repositories/project-import.repository';

/**
 * Counters for one role+group creation pass. CDM handlers fold these into the
 * shared `SyncProjectResult` after calling the builder.
 */
export interface CdmRoleCreationCounts {
  roleGroups: number;
  groupPermissions: number;
  rolePermissions: number;
  userPermissions: number;
  projectRoles: number;
  projectGroups: number;
  projectPermissions: number;
  projectRolePermissions: number;
  projectUserPermissions: number;
  projectResources: number;
}

export interface CdmRoleCreationResult {
  roleId: string;
  groupId: string;
  counts: CdmRoleCreationCounts;
}

/** Optional display labels when the CDM document already supplies human names. */
export interface CdmRoleWithGroupNaming {
  groupDisplayName?: string | null;
  groupDisplayDescription?: string | null;
  groupSearchable?: Record<string, unknown> | null;
}

function buildCdmEntityMetadata(
  projectId: string,
  kind: 'role' | 'group' | 'directRole',
  externalKey: string,
  importerMetadata: unknown,
  searchable?: Record<string, unknown> | null
): Record<string, unknown> {
  const withSearchable = mergeImporterMetadataWithSearchable(
    importerMetadata != null &&
      typeof importerMetadata === 'object' &&
      !Array.isArray(importerMetadata)
      ? (importerMetadata as Record<string, unknown>)
      : undefined,
    searchable
  );
  return mergeCdmImporterMetadata(
    buildCdmImportMetadata(projectId, kind, externalKey),
    withSearchable
  );
}

/**
 * Cross-handler primitives for creating, removing, and book-keeping CDM-marked
 * roles/groups. Owned by the orchestrator; injected into handlers so the
 * "create role + paired group + project links" recipe lives in one place.
 *
 * The recipe was previously private to {@link ProjectImportService};
 * extracting it here lets future handlers (API keys, project apps, …) reuse
 * it without forking the orchestrator.
 */
export class CdmEntityBuilder {
  constructor(
    private readonly importRepo: ProjectImportRepository,
    private readonly roles: IRoleService,
    private readonly groups: IGroupService,
    private readonly roleGroups: IRoleGroupService,
    private readonly groupPermissions: IGroupPermissionService,
    private readonly rolePermissions: IRolePermissionService,
    private readonly userPermissions: IUserPermissionService,
    private readonly projectRoles: IProjectRoleService,
    private readonly projectGroups: IProjectGroupService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly projectRolePermissions: IProjectRolePermissionService,
    private readonly projectUserPermissions: IProjectUserPermissionService,
    private readonly projectResources: IProjectResourceService,
    private readonly userRoles: IUserRoleService,
    private readonly userGroups: IUserGroupService,
    private readonly projectUserGroups: IProjectUserGroupService
  ) {}

  /**
   * Create a CDM-marked role + paired group, link permissions to the group,
   * and ensure the project has rows in `project_*` for everything touched.
   *
   * `kind` is the metadata kind written to `metadata.cdmImport.kind` (always `'role'` for templates).
   */
  public async createRoleWithGroup(
    projectId: string,
    _scope: Scope,
    externalKey: string,
    name: string,
    description: string | null,
    kind: 'role' | 'directRole',
    perms: readonly ResolvedCdmPermission[],
    importerMetadata: unknown,
    tx: Transaction,
    naming?: CdmRoleWithGroupNaming,
    roleSearchable?: Record<string, unknown> | null
  ): Promise<CdmRoleCreationResult> {
    const groupLabel =
      naming?.groupDisplayName != null && String(naming.groupDisplayName).trim() !== ''
        ? String(naming.groupDisplayName).trim()
        : `CDM: ${externalKey}`;
    const groupName = this.truncateName(groupLabel);
    const groupDescription =
      naming?.groupDisplayDescription != null &&
      String(naming.groupDisplayDescription).trim() !== ''
        ? String(naming.groupDisplayDescription).trim()
        : (description ?? `Imported group for ${externalKey}`);
    const groupMetadata = buildCdmEntityMetadata(
      projectId,
      'group',
      externalKey,
      importerMetadata,
      naming?.groupSearchable ?? roleSearchable
    );
    const groupSearchDocument = buildSearchDocument({
      kind: 'group',
      name: groupName,
      description: groupDescription,
      searchable: naming?.groupSearchable ?? roleSearchable,
      metadata: groupMetadata,
    });
    const group = await this.groups.createGroup(
      {
        name: groupName,
        description: groupDescription,
        metadata: groupMetadata,
        searchDocument: groupSearchDocument,
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

    const roleName = this.truncateName(name.trim());
    const roleMetadata = buildCdmEntityMetadata(
      projectId,
      kind,
      externalKey,
      importerMetadata,
      roleSearchable
    );
    const roleSearchDocument = buildSearchDocument({
      kind: 'role',
      name: roleName,
      description,
      searchable: roleSearchable,
      metadata: roleMetadata,
    });
    const role = await this.roles.createRole(
      {
        name: roleName,
        description: description ?? undefined,
        metadata: roleMetadata,
        searchDocument: roleSearchDocument,
      },
      tx
    );
    await this.projectRoles.addProjectRole({ projectId, roleId: role.id }, tx);
    await this.roleGroups.addRoleGroup({ roleId: role.id, groupId: group.id }, tx);

    return {
      roleId: role.id,
      groupId: group.id,
      counts: {
        roleGroups: 1,
        groupPermissions: groupPermissionsLinked,
        rolePermissions: 0,
        userPermissions: 0,
        projectRoles: 1,
        projectGroups: 1,
        projectPermissions: projectPermissionsLinked,
        projectRolePermissions: 0,
        projectUserPermissions: 0,
        projectResources: projectResourcesLinked,
      },
    };
  }

  /**
   * Create a CDM-marked role with direct {@link role_permissions} links (no paired group).
   */
  public async createRoleWithDirectPermissions(
    projectId: string,
    scope: Scope,
    externalKey: string,
    name: string,
    description: string | null,
    kind: 'role' | 'directRole',
    perms: readonly ResolvedCdmPermission[],
    importerMetadata: unknown,
    tx: Transaction,
    roleSearchable?: Record<string, unknown> | null
  ): Promise<CdmRoleCreationResult> {
    const roleName = this.truncateName(name.trim());
    const roleMetadata = buildCdmEntityMetadata(
      projectId,
      kind,
      externalKey,
      importerMetadata,
      roleSearchable
    );
    const roleSearchDocument = buildSearchDocument({
      kind: 'role',
      name: roleName,
      description,
      searchable: roleSearchable,
      metadata: roleMetadata,
    });
    const role = await this.roles.createRole(
      {
        name: roleName,
        description: description ?? undefined,
        metadata: roleMetadata,
        searchDocument: roleSearchDocument,
      },
      tx
    );
    await this.projectRoles.addProjectRole({ projectId, roleId: role.id }, tx);

    let rolePermissionsLinked = 0;
    let projectPermissionsLinked = 0;
    let projectRolePermissionsLinked = 0;
    let projectResourcesLinked = 0;

    for (const p of perms) {
      const linked = await this.linkDirectPermissionToRole(projectId, scope, role.id, p, tx);
      rolePermissionsLinked += linked.rolePermissions;
      projectRolePermissionsLinked += linked.projectRolePermissions;
      projectPermissionsLinked += linked.projectPermissions;
      projectResourcesLinked += linked.projectResources;
    }

    return {
      roleId: role.id,
      groupId: '',
      counts: {
        roleGroups: 0,
        groupPermissions: 0,
        rolePermissions: rolePermissionsLinked,
        userPermissions: 0,
        projectRoles: 1,
        projectGroups: 0,
        projectPermissions: projectPermissionsLinked,
        projectRolePermissions: projectRolePermissionsLinked,
        projectUserPermissions: 0,
        projectResources: projectResourcesLinked,
      },
    };
  }

  public async linkDirectPermissionsToUser(
    projectId: string,
    scope: Scope,
    userId: string,
    perms: readonly ResolvedCdmPermission[],
    tx: Transaction
  ): Promise<
    Pick<
      CdmRoleCreationCounts,
      'userPermissions' | 'projectUserPermissions' | 'projectPermissions' | 'projectResources'
    >
  > {
    let userPermissionsLinked = 0;
    let projectUserPermissionsLinked = 0;
    let projectPermissionsLinked = 0;
    let projectResourcesLinked = 0;

    for (const p of perms) {
      const hasUp = await this.userHasPermission(userId, p.id, tx);
      if (!hasUp) {
        await this.userPermissions.assignUserPermission({ userId, permissionId: p.id, scope }, tx);
        userPermissionsLinked += 1;
      }
      const pList = await this.projectUserPermissions.getProjectUserPermissions(
        { projectId, userId },
        tx
      );
      if (!pList.some((row) => row.permissionId === p.id)) {
        await this.projectUserPermissions.addProjectUserPermission(
          { projectId, userId, permissionId: p.id },
          tx
        );
        projectUserPermissionsLinked += 1;
      }
      const n = await this.ensureProjectPermissionAndResource(projectId, p, tx);
      projectPermissionsLinked += n.permissions;
      projectResourcesLinked += n.resources;
    }

    return {
      userPermissions: userPermissionsLinked,
      projectUserPermissions: projectUserPermissionsLinked,
      projectPermissions: projectPermissionsLinked,
      projectResources: projectResourcesLinked,
    };
  }

  /**
   * Create a CDM-marked standalone group from a document group key and link
   * permissions. Used when `userAssignments[].directGroupKeys` reference a
   * group not already created by a role template.
   */
  public async createDocumentGroup(
    projectId: string,
    groupKey: string,
    displayName: string,
    description: string | null,
    perms: readonly ResolvedCdmPermission[],
    importerMetadata: unknown,
    tx: Transaction,
    groupSearchable?: Record<string, unknown> | null
  ): Promise<{
    groupId: string;
    groupPermissions: number;
    projectGroups: number;
    projectPermissions: number;
    projectResources: number;
  }> {
    const groupName = this.truncateName(displayName.trim() !== '' ? displayName.trim() : groupKey);
    const groupMetadata = buildCdmEntityMetadata(
      projectId,
      'group',
      groupKey,
      importerMetadata,
      groupSearchable
    );
    const groupSearchDocument = buildSearchDocument({
      kind: 'group',
      name: groupName,
      description: description ?? `Imported group ${groupKey}`,
      searchable: groupSearchable,
      metadata: groupMetadata,
    });
    const group = await this.groups.createGroup(
      {
        name: groupName,
        description: description ?? `Imported group ${groupKey}`,
        metadata: groupMetadata,
        searchDocument: groupSearchDocument,
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

    return {
      groupId: group.id,
      groupPermissions: groupPermissionsLinked,
      projectGroups: 1,
      projectPermissions: projectPermissionsLinked,
      projectResources: projectResourcesLinked,
    };
  }

  public async linkDirectGroupsToUser(
    projectId: string,
    scope: Scope,
    userId: string,
    groupIds: readonly string[],
    tx: Transaction
  ): Promise<
    Pick<CdmRoleCreationCounts, 'projectGroups' | 'projectPermissions' | 'projectResources'>
  > {
    let projectGroupsLinked = 0;
    const projectPermissionsLinked = 0;
    const projectResourcesLinked = 0;

    for (const groupId of groupIds) {
      const hasUg = await this.userHasGroup(userId, groupId, tx);
      if (!hasUg) {
        await this.userGroups.addUserGroup({ userId, groupId }, tx);
      }
      const pugList = await this.projectUserGroups.getProjectUserGroups({ projectId, userId }, tx);
      if (!pugList.some((row) => row.groupId === groupId)) {
        await this.projectUserGroups.addProjectUserGroup({ projectId, userId, groupId }, tx);
      }
      try {
        await this.projectGroups.addProjectGroup({ projectId, groupId }, tx);
        projectGroupsLinked += 1;
      } catch {
        /* idempotent when group already linked to project */
      }
    }

    return {
      projectGroups: projectGroupsLinked,
      projectPermissions: projectPermissionsLinked,
      projectResources: projectResourcesLinked,
    };
  }

  private async userHasGroup(userId: string, groupId: string, tx: Transaction): Promise<boolean> {
    const list = await this.userGroups.getUserGroups({ userId }, tx);
    return list.some((ug) => ug.groupId === groupId);
  }

  private async linkDirectPermissionToRole(
    projectId: string,
    scope: Scope,
    roleId: string,
    permission: ResolvedCdmPermission,
    tx: Transaction
  ): Promise<{
    rolePermissions: number;
    projectRolePermissions: number;
    projectPermissions: number;
    projectResources: number;
  }> {
    let rolePermissions = 0;
    let projectRolePermissions = 0;
    const permissionId = permission.id;

    const hasRp = await this.roleHasPermission(roleId, permissionId, tx);
    if (!hasRp) {
      await this.rolePermissions.assignRolePermission({ roleId, permissionId, scope }, tx);
      rolePermissions = 1;
    }
    const prpList = await this.projectRolePermissions.getProjectRolePermissions(
      { projectId, roleId },
      tx
    );
    if (!prpList.some((row) => row.permissionId === permissionId)) {
      await this.projectRolePermissions.addProjectRolePermission(
        { projectId, roleId, permissionId },
        tx
      );
      projectRolePermissions = 1;
    }
    const { permissions: projectPermissions, resources: projectResources } =
      await this.ensureProjectPermissionAndResource(projectId, permission, tx);

    return { rolePermissions, projectRolePermissions, projectPermissions, projectResources };
  }

  private async roleHasPermission(
    roleId: string,
    permissionId: string,
    tx: Transaction
  ): Promise<boolean> {
    const list = await this.rolePermissions.getRolePermissions({ roleId }, tx);
    return list.some((row) => row.permissionId === permissionId);
  }

  private async userHasPermission(
    userId: string,
    permissionId: string,
    tx: Transaction
  ): Promise<boolean> {
    const list = await this.userPermissions.getUserPermissions({ userId }, tx);
    return list.some((row) => row.permissionId === permissionId);
  }

  /**
   * Remove a CDM-marked role: detach from the project, revoke all user-role
   * links, unlink any role-group bindings, then soft-delete the role itself.
   * Idempotent — safe to call against a partially torn-down row.
   */
  public async deleteCdmRole(
    roleId: string,
    projectId: string,
    _scope: Scope,
    tx: Transaction
  ): Promise<void> {
    await this.projectRoles.removeProjectRole({ projectId, roleId }, tx);
    const userLinks = await this.importRepo.listActiveUserRolesForRoleIds([roleId], tx);
    for (const ur of userLinks) {
      await this.userRoles.removeUserRole({ userId: ur.userId, roleId: ur.roleId }, tx);
    }
    const rgs = await this.roleGroups.getRoleGroups({ roleId }, tx);
    for (const rg of rgs) {
      await this.roleGroups.removeRoleGroup({ roleId: rg.roleId, groupId: rg.groupId }, tx);
    }
    await this.importRepo.bulkSoftDeletePivotsForRoles([roleId], projectId, tx);
    await this.roles.deleteRole({ id: roleId }, tx);
  }

  /**
   * Remove a CDM-marked group: detach from the project, drop all
   * group-permission links, unlink role-group bindings, then soft-delete the
   * group. Idempotent.
   */
  public async deleteCdmGroup(
    groupId: string,
    projectId: string,
    _scope: Scope,
    tx: Transaction
  ): Promise<void> {
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
    await this.importRepo.bulkSoftDeletePivotsForGroups([groupId], projectId, tx);
    await this.groups.deleteGroup({ id: groupId }, tx);
  }

  /** Names are truncated to fit the 255-char column with an ellipsis suffix. */
  public truncateName(name: string): string {
    return name.length > 255 ? name.slice(0, 252) + '…' : name;
  }

  private async groupHasPermission(
    groupId: string,
    permissionId: string,
    tx: Transaction
  ): Promise<boolean> {
    const list = await this.groupPermissions.getGroupPermissions({ groupId }, tx);
    return list.some((g) => g.permissionId === permissionId);
  }

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
}
