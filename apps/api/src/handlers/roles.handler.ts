import type {
  IOrganizationRoleService,
  IProjectPermissionService,
  IProjectRolePermissionService,
  IProjectRoleService,
  IRoleGroupService,
  IRolePermissionService,
  IRoleService,
  IRoleTagService,
  ITransactionalConnection,
  IUserRoleService,
} from '@grantjs/core';
import {
  AssignRolePermissionInput,
  Group,
  MutationCreateRoleArgs,
  MutationDeleteRoleArgs,
  MutationUpdateRoleArgs,
  QueryRolesArgs,
  RevokeRolePermissionInput,
  Role,
  RolePage,
  RolePermission,
  Scope,
  Tag,
  Tenant,
} from '@grantjs/schema';

import { type RoleListHydrationContext, roleListHydrators } from '@/hydrators/roles.hydrators';
import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { hydrateList, stripHydratedFields } from '@/lib/list-hydration/list-hydration.lib';
import { intersectScopedIds } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class RoleHandler extends CacheHandler {
  constructor(
    private readonly roleTags: IRoleTagService,
    private readonly roles: IRoleService,
    private readonly organizationRoles: IOrganizationRoleService,
    private readonly projectRoles: IProjectRoleService,
    private readonly roleGroups: IRoleGroupService,
    private readonly rolePermissions: IRolePermissionService,
    private readonly projectRolePermissions: IProjectRolePermissionService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly userRoles: IUserRoleService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getRoleById(id: string): Promise<Role | null> {
    return this.roles.getRoleById(id);
  }

  public async getRoles(params: QueryRolesArgs & SelectedFields<Role>): Promise<RolePage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let roleIds = await this.getScopedRoleIds(scope);

    if (tagIds && tagIds.length > 0) {
      const roleTags = await this.roleTags.getRoleTagIntersection({ roleIds, tagIds });
      roleIds = roleTags
        .filter(({ roleId, tagId }) => roleIds.includes(roleId) && tagIds.includes(tagId))
        .map(({ roleId }) => roleId);
    }

    roleIds = intersectScopedIds(roleIds, ids);

    if (roleIds.length === 0) {
      return {
        roles: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const repositoryRequestedFields = stripHydratedFields<Role>(requestedFields, roleListHydrators);
    const rolesResult = await this.roles.getRoles({
      ids: roleIds,
      page,
      limit,
      sort,
      search,
      requestedFields: repositoryRequestedFields,
    });

    return hydrateList({
      context: this.createRoleListHydrationContext(scope),
      hydrators: roleListHydrators,
      itemsKey: 'roles',
      page: rolesResult,
      requestedFields,
    });
  }

  private createRoleListHydrationContext(scope: Scope): RoleListHydrationContext {
    return {
      countGroups: (roleIds) => this.roleGroups.countRoleGroupsByRoleIds(roleIds),
      countPermissions: (roleIds) => this.rolePermissions.countRolePermissionsByRoleIds(roleIds),
      loadScopedTags: async (roleIds) => {
        const pivots = await this.roleTags.getRoleTagsByRoleIds(roleIds);
        return this.hydrateScopedTagsForOwners({
          scope,
          ownerIds: roleIds,
          pivots,
          getOwnerId: (pivot) => pivot.roleId,
        });
      },
    };
  }

  public async createRole(params: MutationCreateRoleArgs): Promise<Role> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, description, scope, tagIds, groupIds, permissionIds, primaryTagId } = input;

      const role = await this.roles.createRole({ name, description }, tx);
      const { id: roleId } = role;
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.organizationRoles.addOrganizationRole(
            { organizationId: scope.id, roleId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectRoles.addProjectRole({ projectId, roleId }, tx);
          break;
        }
      }

      if (groupIds && groupIds.length > 0) {
        await Promise.all(
          groupIds.map((groupId) => this.roleGroups.addRoleGroup({ roleId, groupId }, tx))
        );
      }

      if (permissionIds && permissionIds.length > 0) {
        await Promise.all(
          permissionIds.map(async (permissionId) => {
            await this.rolePermissions.assignRolePermission({ roleId, permissionId, scope }, tx);

            switch (scope.tenant) {
              case Tenant.OrganizationProject:
              case Tenant.AccountProject: {
                const projectId = this.extractProjectIdFromScope(scope);
                await this.projectRolePermissions.addProjectRolePermission(
                  { projectId, roleId, permissionId },
                  tx
                );
                try {
                  await this.projectPermissions.addProjectPermission(
                    { projectId, permissionId },
                    tx
                  );
                } catch {
                  /* idempotent when permission already linked to project */
                }
                break;
              }
            }
          })
        );
        await this.invalidatePermissionsCacheForAllScopes();
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.roleTags.addRoleTag({ roleId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
      }

      await this.addRoleIdToScopeCache(scope, roleId);

      return role;
    });
  }

  public async updateRole(params: MutationUpdateRoleArgs): Promise<Role> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: roleId, input } = params;
      const { tagIds, groupIds, primaryTagId } = input;
      let currentTagIds: string[] = [];
      let currentGroupIds: string[] = [];
      if (tagIds && tagIds.length > 0) {
        const currentTags = await this.roleTags.getRoleTags({ roleId }, tx);
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }
      if (Array.isArray(groupIds)) {
        const currentGroups = await this.roleGroups.getRoleGroups({ roleId }, tx);
        currentGroupIds = currentGroups.map((rg) => rg.groupId);
      }
      const updatedRole = await this.roles.updateRole(roleId, input, tx);
      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.roleTags.addRoleTag({ roleId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) => this.roleTags.removeRoleTag({ roleId, tagId }, tx))
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.roleTags.updateRoleTag({ roleId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
      } else if (primaryTagId !== undefined) {
        const roleTagPivots = await this.roleTags.getRoleTags({ roleId }, tx);
        if (primaryTagId && !roleTagPivots.some((roleTag) => roleTag.tagId === primaryTagId)) {
          throw new BadRequestError('Primary tag must be one of the role assigned tags');
        }
        await Promise.all(
          roleTagPivots.map((roleTag) =>
            this.roleTags.updateRoleTag(
              {
                roleId,
                tagId: roleTag.tagId,
                isPrimary: primaryTagId ? roleTag.tagId === primaryTagId : false,
              },
              tx
            )
          )
        );
      }
      if (Array.isArray(groupIds)) {
        const newGroupIds = groupIds.filter((groupId) => !currentGroupIds.includes(groupId));
        const removedGroupIds = currentGroupIds.filter((groupId) => !groupIds.includes(groupId));
        await Promise.all(
          newGroupIds.map((groupId) => this.roleGroups.addRoleGroup({ roleId, groupId }, tx))
        );
        await Promise.all(
          removedGroupIds.map((groupId) => this.roleGroups.removeRoleGroup({ roleId, groupId }, tx))
        );

        // Invalidate permissions cache when role-group relationships change
        // as this affects the permission cascade
        if (newGroupIds.length > 0 || removedGroupIds.length > 0) {
          await this.invalidatePermissionsCacheForAllScopes();
        }
      }
      return updatedRole;
    });
  }

  public async deleteRole(params: MutationDeleteRoleArgs & DeleteParams): Promise<Role> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const roleId = params.id;
      const scope = params.scope;
      const [roleTags, roleGroups, rolePermissionRelations] = await Promise.all([
        this.roleTags.getRoleTags({ roleId }, tx),
        this.roleGroups.getRoleGroups({ roleId }, tx),
        this.rolePermissions.getRolePermissions({ roleId }, tx),
      ]);

      const tagIds = roleTags.map((rt) => rt.tagId);
      const groupIds = roleGroups.map((rg) => rg.groupId);
      const permissionIds = rolePermissionRelations.map((rp) => rp.permissionId);

      const userRoleRelations = await this.userRoles.getUserRoles({ roleId }, tx);

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.organizationRoles.removeOrganizationRole(
            { organizationId: scope.id, roleId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectRoles.removeProjectRole({ projectId, roleId }, tx);
          break;
        }
      }

      await Promise.all([
        ...tagIds.map((tagId) => this.roleTags.removeRoleTag({ roleId, tagId }, tx)),
        ...groupIds.map((groupId) => this.roleGroups.removeRoleGroup({ roleId, groupId }, tx)),
        ...permissionIds.map((permissionId) =>
          this.rolePermissions.revokeRolePermission({ roleId, permissionId, scope }, tx)
        ),
        ...userRoleRelations.map((ur) =>
          this.userRoles.removeUserRole({ userId: ur.userId, roleId: ur.roleId }, tx)
        ),
      ]);

      await this.removeRoleIdFromScopeCache(scope, roleId);

      return await this.roles.deleteRole(params, tx);
    });
  }

  public async getRoleGroups(
    params: { roleId: string } & SelectedFields<Role>
  ): Promise<Array<Group>> {
    const { roleId, requestedFields } = params;
    const rolesPage = await this.roles.getRoles({ ids: [roleId], requestedFields });
    if (Array.isArray(rolesPage.roles) && rolesPage.roles.length > 0) {
      return rolesPage.roles[0].groups || [];
    }
    return [];
  }

  public async getRoleTags(params: { roleId: string } & SelectedFields<Role>): Promise<Array<Tag>> {
    const { roleId, requestedFields } = params;
    const rolesPage = await this.roles.getRoles({ ids: [roleId], requestedFields });
    if (Array.isArray(rolesPage.roles) && rolesPage.roles.length > 0) {
      return rolesPage.roles[0].tags || [];
    }
    return [];
  }

  /**
   * Returns the raw role_tags pivot rows for a role.
   * Used by Role.tags resolver, which then intersects with scoped tag IDs to
   * avoid leaking tags from other projects/scopes.
   */
  public async getRoleTagPivots(params: {
    roleId: string;
  }): Promise<Array<{ tagId: string; isPrimary: boolean }>> {
    const pivots = await this.roleTags.getRoleTags({ roleId: params.roleId });
    return pivots.map((p) => ({ tagId: p.tagId, isPrimary: p.isPrimary }));
  }

  public async countRoleGroups(params: { roleId: string }): Promise<number> {
    return this.roleGroups.countRoleGroups(params);
  }

  public async getRolePermissions(params: { roleId: string }): Promise<RolePermission[]> {
    return this.rolePermissions.getRolePermissions({ roleId: params.roleId });
  }

  public async countRolePermissions(params: { roleId: string }): Promise<number> {
    return this.rolePermissions.countRolePermissions(params);
  }

  public async assignRolePermission(params: AssignRolePermissionInput): Promise<RolePermission> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { scope, roleId, permissionId } = params;
      const rolePermission = await this.rolePermissions.assignRolePermission(params, tx);

      switch (scope.tenant) {
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectRolePermissions.addProjectRolePermission(
            { projectId, roleId, permissionId },
            tx
          );
          try {
            await this.projectPermissions.addProjectPermission({ projectId, permissionId }, tx);
          } catch {
            /* idempotent when permission already linked to project */
          }
          break;
        }
      }

      await this.invalidatePermissionsCacheForAllScopes();
      return rolePermission;
    });
  }

  public async revokeRolePermission(params: RevokeRolePermissionInput): Promise<RolePermission> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { scope, roleId, permissionId } = params;
      const rolePermission = await this.rolePermissions.revokeRolePermission(params, tx);

      switch (scope.tenant) {
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          try {
            await this.projectRolePermissions.removeProjectRolePermission(
              { projectId, roleId, permissionId },
              tx
            );
          } catch {
            /* row may already be absent */
          }
          break;
        }
      }

      await this.invalidatePermissionsCacheForAllScopes();
      return rolePermission;
    });
  }
}
