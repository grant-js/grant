import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import {
  QueryGroupsArgs,
  MutationCreateGroupArgs,
  MutationUpdateGroupArgs,
  MutationDeleteGroupArgs,
  Group,
  GroupPage,
  Tenant,
  Tag,
  Permission,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { GroupModel } from '@/graphql/repositories/groups/schema';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class GroupController extends ScopeController {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getGroups(params: QueryGroupsArgs & SelectedFields<GroupModel>): Promise<GroupPage> {
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
        case Tenant.Project:
          await this.services.projectGroups.addProjectGroup({ projectId: scope.id, groupId }, tx);
          break;
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

      return group;
    });
  }

  public async updateGroup(params: MutationUpdateGroupArgs): Promise<Group> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: groupId, input } = params;
      const { tagIds, permissionIds, primaryTagId } = input;
      let currentTagIds: string[] = [];
      let currentPermissionIds: string[] = [];
      if (tagIds && tagIds.length > 0) {
        const currentTags = await this.services.groupTags.getGroupTags({ groupId }, tx);
        currentTagIds = currentTags.map((gt) => gt.tagId);
      }
      if (permissionIds && permissionIds.length > 0) {
        const currentPermissions = await this.services.groupPermissions.getGroupPermissions(
          { groupId },
          tx
        );
        currentPermissionIds = currentPermissions.map((gp) => gp.permissionId);
      }
      const updatedGroup = await this.services.groups.updateGroup(params, tx);
      if (tagIds && tagIds.length > 0) {
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
      if (permissionIds && permissionIds.length > 0) {
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
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationGroups.removeOrganizationGroup(
            { organizationId: scope.id, groupId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectGroups.removeProjectGroup(
            { projectId: scope.id, groupId },
            tx
          );
          break;
      }
      await Promise.all([
        ...tagIds.map((tagId) => this.services.groupTags.removeGroupTag({ groupId, tagId }, tx)),
        ...permissionIds.map((permissionId) =>
          this.services.groupPermissions.removeGroupPermission({ groupId, permissionId }, tx)
        ),
      ]);
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
