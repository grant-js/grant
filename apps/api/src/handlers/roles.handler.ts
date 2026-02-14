import {
  Group,
  MutationCreateRoleArgs,
  MutationDeleteRoleArgs,
  MutationUpdateRoleArgs,
  QueryRolesArgs,
  Role,
  RolePage,
  Tag,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type {
  IOrganizationRoleService,
  IProjectRoleService,
  IRoleGroupService,
  IRoleService,
  IRoleTagService,
  ITransactionalConnection,
  IUserRoleService,
} from '@grantjs/core';

export class RoleHandler extends CacheHandler {
  constructor(
    private readonly roleTags: IRoleTagService,
    private readonly roles: IRoleService,
    private readonly organizationRoles: IOrganizationRoleService,
    private readonly projectRoles: IProjectRoleService,
    private readonly roleGroups: IRoleGroupService,
    private readonly userRoles: IUserRoleService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
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

    if (ids && ids.length > 0) {
      roleIds = ids.filter((roleId) => roleIds.includes(roleId));
    }

    if (roleIds.length === 0) {
      return {
        roles: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const rolesResult = await this.roles.getRoles({
      ids: roleIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return rolesResult;
  }

  public async createRole(params: MutationCreateRoleArgs): Promise<Role> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, description, scope, tagIds, groupIds, primaryTagId } = input;

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

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.roleTags.addRoleTag({ roleId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
      }

      this.addRoleIdToScopeCache(scope, roleId);

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
      const [roleTags, roleGroups] = await Promise.all([
        this.roleTags.getRoleTags({ roleId }, tx),
        this.roleGroups.getRoleGroups({ roleId }, tx),
      ]);

      const tagIds = roleTags.map((rt) => rt.tagId);
      const groupIds = roleGroups.map((rg) => rg.groupId);

      // Get all users in the scope to remove their UserRole relationships
      const userIds = await this.getScopedUserIds(scope);

      // Get all UserRole relationships for this role, then filter by users in scope
      const allUserRoleRelations = await this.userRoles.getUserRoles({ roleId }, tx);
      const userRoleRelations =
        userIds.length > 0
          ? allUserRoleRelations.filter((ur) => userIds.includes(ur.userId))
          : allUserRoleRelations;

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
        // Remove UserRole relationships for users in this scope
        ...userRoleRelations.map((ur) =>
          this.userRoles.removeUserRole({ userId: ur.userId, roleId: ur.roleId }, tx)
        ),
      ]);

      this.removeRoleIdFromScopeCache(scope, roleId);

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
}
