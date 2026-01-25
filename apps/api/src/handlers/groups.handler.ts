import { DbSchema } from '@grantjs/database';
import {
  Group,
  GroupPage,
  MutationCreateGroupArgs,
  MutationDeleteGroupArgs,
  MutationUpdateGroupArgs,
  Permission,
  QueryGroupsArgs,
  Tag,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { CacheHandler } from './base/cache-handler';

export class GroupHandler extends CacheHandler {
  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async getGroups(params: QueryGroupsArgs & SelectedFields<Group>): Promise<GroupPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let groupIds = await this.getScopedGroupIds(scope);

    if (tagIds && tagIds.length > 0) {
      const groupTags = await this.services.groupTags.getGroupTagIntersection({
        groupIds,
        tagIds,
      });
      groupIds = groupTags
        .filter(({ groupId, tagId }) => groupIds.includes(groupId) && tagIds.includes(tagId))
        .map(({ groupId }) => groupId);
    }

    if (ids && ids.length > 0) {
      groupIds = ids.filter((groupId) => groupIds.includes(groupId));
    }

    if (groupIds.length === 0) {
      return {
        groups: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const groupsResult = await this.services.groups.getGroups({
      ids: groupIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return groupsResult;
  }

  public async createGroup(params: MutationCreateGroupArgs): Promise<Group> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, description, tagIds, permissionIds, scope, primaryTagId } = input;
      const group = await this.services.groups.createGroup({ name, description }, tx);
      const { id: groupId } = group;

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationGroups.addOrganizationGroup(
            { organizationId: scope.id, groupId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.services.projectGroups.addProjectGroup({ projectId, groupId }, tx);
          break;
        }
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.services.groupTags.addGroupTag(
              { groupId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }

      if (permissionIds && permissionIds.length > 0) {
        await Promise.all(
          permissionIds.map((permissionId) =>
            this.services.groupPermissions.addGroupPermission({ groupId, permissionId }, tx)
          )
        );
      }

      this.addGroupIdToScopeCache(scope, groupId);

      return group;
    });
  }

  public async updateGroup(params: MutationUpdateGroupArgs): Promise<Group> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: groupId, input } = params;
      const { tagIds, permissionIds, primaryTagId } = input;
      let currentTagIds: string[] = [];
      let currentPermissionIds: string[] = [];
      if (Array.isArray(tagIds)) {
        const currentTags = await this.services.groupTags.getGroupTags({ groupId }, tx);
        currentTagIds = currentTags.map((gt) => gt.tagId);
      }
      if (Array.isArray(permissionIds)) {
        const currentPermissions = await this.services.groupPermissions.getGroupPermissions(
          { groupId },
          tx
        );
        currentPermissionIds = currentPermissions.map((gp) => gp.permissionId);
      }
      const updatedGroup = await this.services.groups.updateGroup(groupId, input, tx);
      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.services.groupTags.addGroupTag(
              { groupId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) =>
            this.services.groupTags.removeGroupTag({ groupId, tagId }, tx)
          )
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.services.groupTags.updateGroupTag(
              { groupId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }
      if (Array.isArray(permissionIds)) {
        const newPermissionIds = permissionIds.filter(
          (permissionId) => !currentPermissionIds.includes(permissionId)
        );
        const removedPermissionIds = currentPermissionIds.filter(
          (permissionId) => !permissionIds.includes(permissionId)
        );
        await Promise.all(
          newPermissionIds.map((permissionId) =>
            this.services.groupPermissions.addGroupPermission({ groupId, permissionId }, tx)
          )
        );
        await Promise.all(
          removedPermissionIds.map((permissionId) =>
            this.services.groupPermissions.removeGroupPermission({ groupId, permissionId }, tx)
          )
        );

        if (newPermissionIds.length > 0 || removedPermissionIds.length > 0) {
          await this.invalidatePermissionsCacheForAllScopes();
        }
      }
      return updatedGroup;
    });
  }

  public async deleteGroup(params: MutationDeleteGroupArgs & DeleteParams): Promise<Group> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: groupId, scope } = params;
      const [groupTags, groupPermissions] = await Promise.all([
        this.services.groupTags.getGroupTags({ groupId }, tx),
        this.services.groupPermissions.getGroupPermissions({ groupId }, tx),
      ]);
      const tagIds = groupTags.map((gt) => gt.tagId);
      const permissionIds = groupPermissions.map((gp) => gp.permissionId);

      // Get all RoleGroup relationships where this group is assigned
      const roleGroupRelations = await this.services.roleGroups.getRoleGroups({ groupId }, tx);

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationGroups.removeOrganizationGroup(
            { organizationId: scope.id, groupId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.services.projectGroups.removeProjectGroup({ projectId, groupId }, tx);
          break;
        }
      }
      await Promise.all([
        ...tagIds.map((tagId) => this.services.groupTags.removeGroupTag({ groupId, tagId }, tx)),
        ...permissionIds.map((permissionId) =>
          this.services.groupPermissions.removeGroupPermission({ groupId, permissionId }, tx)
        ),
        // Remove all RoleGroup relationships
        ...roleGroupRelations.map((rg) =>
          this.services.roleGroups.removeRoleGroup({ roleId: rg.roleId, groupId: rg.groupId }, tx)
        ),
      ]);

      this.removeGroupIdFromScopeCache(scope, groupId);

      return await this.services.groups.deleteGroup(params, tx);
    });
  }

  public async getGroupTags(
    params: { groupId: string } & SelectedFields<Group>
  ): Promise<Array<Tag>> {
    const { groupId, requestedFields } = params;
    const groupsPage = await this.services.groups.getGroups({ ids: [groupId], requestedFields });
    if (Array.isArray(groupsPage.groups) && groupsPage.groups.length > 0) {
      return groupsPage.groups[0].tags || [];
    }
    return [];
  }

  public async getGroupPermissions(
    params: { groupId: string } & SelectedFields<Group>
  ): Promise<Array<Permission>> {
    const { groupId, requestedFields } = params;
    const groupsPage = await this.services.groups.getGroups({ ids: [groupId], requestedFields });
    if (Array.isArray(groupsPage.groups) && groupsPage.groups.length > 0) {
      return groupsPage.groups[0].permissions || [];
    }
    return [];
  }
}
