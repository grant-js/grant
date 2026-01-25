import { DbSchema } from '@grantjs/database';
import {
  MutationCreatePermissionArgs,
  MutationDeletePermissionArgs,
  MutationUpdatePermissionArgs,
  Permission,
  PermissionPage,
  QueryPermissionsArgs,
  Tag,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { CacheHandler } from './base/cache-handler';

export class PermissionHandler extends CacheHandler {
  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async getPermissions(
    params: QueryPermissionsArgs & SelectedFields<Permission>
  ): Promise<PermissionPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let permissionIds = await this.getScopedPermissionIds(scope);

    if (tagIds && tagIds.length > 0) {
      const permissionTags = await this.services.permissionTags.getPermissionTagIntersection({
        permissionIds,
        tagIds,
      });
      permissionIds = permissionTags
        .filter(
          ({ permissionId, tagId }) =>
            permissionIds.includes(permissionId) && tagIds.includes(tagId)
        )
        .map(({ permissionId }) => permissionId);
    }

    if (ids && ids.length > 0) {
      permissionIds = ids.filter((permissionId) => permissionIds.includes(permissionId));
    }

    if (permissionIds.length === 0) {
      return {
        permissions: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const permissionsResult = await this.services.permissions.getPermissions({
      ids: permissionIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return permissionsResult;
  }

  public async createPermission(params: MutationCreatePermissionArgs): Promise<Permission> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, description, resourceId, action, condition, scope, tagIds, primaryTagId } =
        input;

      const permission = await this.services.permissions.createPermission(
        { name, description, resourceId, action, condition },
        tx
      );
      const { id: permissionId } = permission;

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationPermissions.addOrganizationPermission(
            { organizationId: scope.id, permissionId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.services.projectPermissions.addProjectPermission(
            { projectId, permissionId },
            tx
          );
          break;
        }
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.services.permissionTags.addPermissionTag(
              { permissionId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }

      this.addPermissionIdToScopeCache(scope, permissionId);

      return permission;
    });
  }

  public async updatePermission(params: MutationUpdatePermissionArgs): Promise<Permission> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: permissionId, input } = params;
      const { tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];

      if (Array.isArray(tagIds)) {
        const currentTags = await this.services.permissionTags.getPermissionTags(
          { permissionId },
          tx
        );
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }
      const updatedPermission = await this.services.permissions.updatePermission(
        permissionId,
        input,
        tx
      );

      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.services.permissionTags.addPermissionTag(
              { permissionId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) =>
            this.services.permissionTags.removePermissionTag({ permissionId, tagId }, tx)
          )
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.services.permissionTags.updatePermissionTag(
              { permissionId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }

      return updatedPermission;
    });
  }

  public async deletePermission(
    params: MutationDeletePermissionArgs & DeleteParams
  ): Promise<Permission> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: permissionId, scope } = params;
      const permissionTags = await this.services.permissionTags.getPermissionTags(
        { permissionId },
        tx
      );
      const tagIds = permissionTags.map((pt) => pt.tagId);

      // Get all GroupPermission relationships where this permission is assigned
      const groupPermissionRelations = await this.services.groupPermissions.getGroupPermissions(
        { permissionId },
        tx
      );

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationPermissions.removeOrganizationPermission(
            { organizationId: scope.id, permissionId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.services.projectPermissions.removeProjectPermission(
            { projectId, permissionId },
            tx
          );
          break;
        }
      }

      await Promise.all([
        ...tagIds.map((tagId) =>
          this.services.permissionTags.removePermissionTag({ permissionId, tagId }, tx)
        ),
        // Remove all GroupPermission relationships
        ...groupPermissionRelations.map((gp) =>
          this.services.groupPermissions.removeGroupPermission(
            { groupId: gp.groupId, permissionId: gp.permissionId },
            tx
          )
        ),
      ]);

      this.removePermissionIdFromScopeCache(scope, permissionId);

      return await this.services.permissions.deletePermission(params, tx);
    });
  }

  public async getPermissionTags(
    params: { permissionId: string } & SelectedFields<Permission>
  ): Promise<Array<Tag>> {
    const { permissionId, requestedFields } = params;
    const permissionsPage = await this.services.permissions.getPermissions({
      ids: [permissionId],
      requestedFields,
    });
    if (Array.isArray(permissionsPage.permissions) && permissionsPage.permissions.length > 0) {
      return permissionsPage.permissions[0].tags || [];
    }
    return [];
  }
}
