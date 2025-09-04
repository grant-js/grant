import {
  Tenant,
  QueryRolesArgs,
  RolePage,
  MutationCreateRoleArgs,
  Role,
  MutationUpdateRoleArgs,
  MutationDeleteRoleArgs,
  Group,
  Tag,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { RoleModel } from '@/graphql/repositories/roles/schema';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class RoleController extends ScopeController {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getRoles(params: QueryRolesArgs & SelectedFields<RoleModel>): Promise<RolePage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let roleIds = await this.getScopedRoleIds(scope);

    if (tagIds && tagIds.length > 0) {
      const roleTags = await this.services.roleTags.getRoleTagIntersection({ roleIds, tagIds });
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

    const rolesResult = await this.services.roles.getRoles({
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
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, description, scope, tagIds, groupIds } = input;

      const role = await this.services.roles.createRole({ name, description }, tx);
      const { id: roleId } = role;
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationRoles.addOrganizationRole(
            { organizationId: scope.id, roleId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectRoles.addProjectRole({ projectId: scope.id, roleId }, tx);
          break;
      }

      if (groupIds && groupIds.length > 0) {
        await Promise.all(
          groupIds.map((groupId) => this.services.roleGroups.addRoleGroup({ roleId, groupId }, tx))
        );
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) => this.services.roleTags.addRoleTag({ roleId, tagId }, tx))
        );
      }

      return role;
    });
  }

  public async updateRole(params: MutationUpdateRoleArgs): Promise<Role> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: roleId, input } = params;
      const { tagIds, groupIds } = input;
      let currentTagIds: string[] = [];
      let currentGroupIds: string[] = [];
      if (tagIds && tagIds.length > 0) {
        const currentTags = await this.services.roleTags.getRoleTags({ roleId });
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }
      if (groupIds && groupIds.length > 0) {
        const currentGroups = await this.services.roleGroups.getRoleGroups({ roleId });
        currentGroupIds = currentGroups.map((rg) => rg.groupId);
      }
      const updatedRole = await this.services.roles.updateRole(params, tx);
      if (tagIds && tagIds.length > 0) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) => this.services.roleTags.addRoleTag({ roleId, tagId }, tx))
        );
        await Promise.all(
          removedTagIds.map((tagId) => this.services.roleTags.removeRoleTag({ roleId, tagId }, tx))
        );
      }
      if (groupIds && groupIds.length > 0) {
        const newGroupIds = groupIds.filter((groupId) => !currentGroupIds.includes(groupId));
        const removedGroupIds = currentGroupIds.filter((groupId) => !groupIds.includes(groupId));
        await Promise.all(
          newGroupIds.map((groupId) =>
            this.services.roleGroups.addRoleGroup({ roleId, groupId }, tx)
          )
        );
        await Promise.all(
          removedGroupIds.map((groupId) =>
            this.services.roleGroups.removeRoleGroup({ roleId, groupId }, tx)
          )
        );
      }
      return updatedRole;
    });
  }

  public async deleteRole(params: MutationDeleteRoleArgs & DeleteParams): Promise<Role> {
    const roleId = params.id;
    const scope = params.scope;
    const [roleTags, roleGroups] = await Promise.all([
      this.services.roleTags.getRoleTags({ roleId }),
      this.services.roleGroups.getRoleGroups({ roleId }),
    ]);

    const tagIds = roleTags.map((rt) => rt.tagId);
    const groupIds = roleGroups.map((rg) => rg.groupId);

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationRoles.removeOrganizationRole(
            { organizationId: scope.id, roleId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectRoles.removeProjectRole({ projectId: scope.id, roleId }, tx);
          break;
      }

      await Promise.all([
        ...tagIds.map((tagId) => this.services.roleTags.removeRoleTag({ roleId, tagId }, tx)),
        ...groupIds.map((groupId) =>
          this.services.roleGroups.removeRoleGroup({ roleId, groupId }, tx)
        ),
      ]);

      return await this.services.roles.deleteRole(params, tx);
    });
  }

  public async getRoleGroups(
    params: { roleId: string } & SelectedFields<Role>
  ): Promise<Array<Group>> {
    const { roleId, requestedFields } = params;
    const rolesPage = await this.services.roles.getRoles({ ids: [roleId], requestedFields });
    if (Array.isArray(rolesPage.roles) && rolesPage.roles.length > 0) {
      return rolesPage.roles[0].groups || [];
    }
    return [];
  }

  public async getRoleTags(params: { roleId: string } & SelectedFields<Role>): Promise<Array<Tag>> {
    const { roleId, requestedFields } = params;
    const rolesPage = await this.services.roles.getRoles({ ids: [roleId], requestedFields });
    if (Array.isArray(rolesPage.roles) && rolesPage.roles.length > 0) {
      return rolesPage.roles[0].tags || [];
    }
    return [];
  }
}
