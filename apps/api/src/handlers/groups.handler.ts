import type {
  IGroupPermissionService,
  IGroupService,
  IGroupTagService,
  IOrganizationGroupService,
  IProjectGroupService,
  IRoleGroupService,
  ITransactionalConnection,
} from '@grantjs/core';
import {
  Group,
  GroupPage,
  MutationCreateGroupArgs,
  MutationDeleteGroupArgs,
  MutationUpdateGroupArgs,
  Permission,
  QueryGroupsArgs,
  Scope,
  Tag,
  Tenant,
} from '@grantjs/schema';

import { type GroupListHydrationContext, groupListHydrators } from '@/hydrators/groups.hydrators';
import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { hydrateList, stripHydratedFields } from '@/lib/list-hydration/list-hydration.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class GroupHandler extends CacheHandler {
  constructor(
    private readonly groupTags: IGroupTagService,
    private readonly groups: IGroupService,
    private readonly organizationGroups: IOrganizationGroupService,
    private readonly projectGroups: IProjectGroupService,
    private readonly groupPermissions: IGroupPermissionService,
    private readonly roleGroups: IRoleGroupService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getGroups(params: QueryGroupsArgs & SelectedFields<Group>): Promise<GroupPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let groupIds = await this.getScopedGroupIds(scope);

    if (tagIds && tagIds.length > 0) {
      const groupTags = await this.groupTags.getGroupTagIntersection({
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

    const repositoryRequestedFields = stripHydratedFields<Group>(
      requestedFields,
      groupListHydrators
    );
    const groupsResult = await this.groups.getGroups({
      ids: groupIds,
      page,
      limit,
      sort,
      search,
      requestedFields: repositoryRequestedFields,
    });

    return hydrateList({
      context: this.createGroupListHydrationContext(scope),
      hydrators: groupListHydrators,
      itemsKey: 'groups',
      page: groupsResult,
      requestedFields,
    });
  }

  private createGroupListHydrationContext(scope: Scope): GroupListHydrationContext {
    return {
      countPermissions: (groupIds) =>
        this.groupPermissions.countGroupPermissionsByGroupIds(groupIds),
      loadScopedTags: async (groupIds) => {
        const pivots = await this.groupTags.getGroupTagsByGroupIds(groupIds);
        return this.hydrateScopedTagsForOwners({
          scope,
          ownerIds: groupIds,
          pivots,
          getOwnerId: (pivot) => pivot.groupId,
        });
      },
    };
  }

  public async createGroup(params: MutationCreateGroupArgs): Promise<Group> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, description, tagIds, permissionIds, scope, primaryTagId } = input;
      const group = await this.groups.createGroup({ name, description }, tx);
      const { id: groupId } = group;

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.organizationGroups.addOrganizationGroup(
            { organizationId: scope.id, groupId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectGroups.addProjectGroup({ projectId, groupId }, tx);
          break;
        }
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.groupTags.addGroupTag({ groupId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
      }

      if (permissionIds && permissionIds.length > 0) {
        await Promise.all(
          permissionIds.map((permissionId) =>
            this.groupPermissions.addGroupPermission({ groupId, permissionId }, tx)
          )
        );
      }

      this.addGroupIdToScopeCache(scope, groupId);

      return group;
    });
  }

  public async updateGroup(params: MutationUpdateGroupArgs): Promise<Group> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: groupId, input } = params;
      const { tagIds, permissionIds, primaryTagId } = input;
      let currentTagIds: string[] = [];
      let currentPermissionIds: string[] = [];
      if (Array.isArray(tagIds)) {
        const currentTags = await this.groupTags.getGroupTags({ groupId }, tx);
        currentTagIds = currentTags.map((gt) => gt.tagId);
      }
      if (Array.isArray(permissionIds)) {
        const currentPermissions = await this.groupPermissions.getGroupPermissions({ groupId }, tx);
        currentPermissionIds = currentPermissions.map((gp) => gp.permissionId);
      }
      const updatedGroup = await this.groups.updateGroup(groupId, input, tx);
      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.groupTags.addGroupTag({ groupId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) => this.groupTags.removeGroupTag({ groupId, tagId }, tx))
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.groupTags.updateGroupTag({ groupId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
      } else if (primaryTagId !== undefined) {
        const groupTagPivots = await this.groupTags.getGroupTags({ groupId }, tx);
        if (primaryTagId && !groupTagPivots.some((groupTag) => groupTag.tagId === primaryTagId)) {
          throw new BadRequestError('Primary tag must be one of the group assigned tags');
        }
        await Promise.all(
          groupTagPivots.map((groupTag) =>
            this.groupTags.updateGroupTag(
              {
                groupId,
                tagId: groupTag.tagId,
                isPrimary: primaryTagId ? groupTag.tagId === primaryTagId : false,
              },
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
            this.groupPermissions.addGroupPermission({ groupId, permissionId }, tx)
          )
        );
        await Promise.all(
          removedPermissionIds.map((permissionId) =>
            this.groupPermissions.removeGroupPermission({ groupId, permissionId }, tx)
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
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: groupId, scope } = params;
      const [groupTags, groupPermissions] = await Promise.all([
        this.groupTags.getGroupTags({ groupId }, tx),
        this.groupPermissions.getGroupPermissions({ groupId }, tx),
      ]);
      const tagIds = groupTags.map((gt) => gt.tagId);
      const permissionIds = groupPermissions.map((gp) => gp.permissionId);

      // Get all RoleGroup relationships where this group is assigned
      const roleGroupRelations = await this.roleGroups.getRoleGroups({ groupId }, tx);

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.organizationGroups.removeOrganizationGroup(
            { organizationId: scope.id, groupId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectGroups.removeProjectGroup({ projectId, groupId }, tx);
          break;
        }
      }
      await Promise.all([
        ...tagIds.map((tagId) => this.groupTags.removeGroupTag({ groupId, tagId }, tx)),
        ...permissionIds.map((permissionId) =>
          this.groupPermissions.removeGroupPermission({ groupId, permissionId }, tx)
        ),
        // Remove all RoleGroup relationships
        ...roleGroupRelations.map((rg) =>
          this.roleGroups.removeRoleGroup({ roleId: rg.roleId, groupId: rg.groupId }, tx)
        ),
      ]);

      this.removeGroupIdFromScopeCache(scope, groupId);

      return await this.groups.deleteGroup(params, tx);
    });
  }

  public async getGroupTags(
    params: { groupId: string } & SelectedFields<Group>
  ): Promise<Array<Tag>> {
    const { groupId, requestedFields } = params;
    const groupsPage = await this.groups.getGroups({ ids: [groupId], requestedFields });
    if (Array.isArray(groupsPage.groups) && groupsPage.groups.length > 0) {
      return groupsPage.groups[0].tags || [];
    }
    return [];
  }

  /**
   * Returns the raw group_tags pivot rows for a group.
   * Used by Group.tags resolver, which then intersects with scoped tag IDs to
   * avoid leaking tags from other projects/scopes.
   */
  public async getGroupTagPivots(params: {
    groupId: string;
  }): Promise<Array<{ tagId: string; isPrimary: boolean }>> {
    const pivots = await this.groupTags.getGroupTags({ groupId: params.groupId });
    return pivots.map((p) => ({ tagId: p.tagId, isPrimary: p.isPrimary }));
  }

  public async getGroupPermissions(
    params: { groupId: string } & SelectedFields<Group>
  ): Promise<Array<Permission>> {
    const { groupId, requestedFields } = params;
    const groupsPage = await this.groups.getGroups({ ids: [groupId], requestedFields });
    if (Array.isArray(groupsPage.groups) && groupsPage.groups.length > 0) {
      return groupsPage.groups[0].permissions || [];
    }
    return [];
  }

  public async countGroupPermissions(params: { groupId: string }): Promise<number> {
    return this.groupPermissions.countGroupPermissions(params);
  }
}
