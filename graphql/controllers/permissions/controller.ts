import {
  QueryPermissionsArgs,
  MutationCreatePermissionArgs,
  MutationUpdatePermissionArgs,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
  Tenant,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { PermissionModel } from '@/graphql/repositories/permissions/schema';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class PermissionController extends ScopeController {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getPermissions(
    params: QueryPermissionsArgs & SelectedFields<PermissionModel>
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
      const { name, description, action, scope, tagIds } = input;

      const permission = await this.services.permissions.createPermission(
        { name, description, action },
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
        case Tenant.Project:
          await this.services.projectPermissions.addProjectPermission(
            { projectId: scope.id, permissionId },
            tx
          );
          break;
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.services.permissionTags.addPermissionTag({ permissionId, tagId }, tx)
          )
        );
      }

      return permission;
    });
  }

  public async updatePermission(params: MutationUpdatePermissionArgs): Promise<Permission> {
    const { id: permissionId, input } = params;
    const { tagIds } = input;
    let currentTagIds: string[] = [];

    if (tagIds && tagIds.length > 0) {
      const currentTags = await this.services.permissionTags.getPermissionTags({
        permissionId,
      });
      currentTagIds = currentTags.map((pt) => pt.tagId);
    }

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const updatedPermission = await this.services.permissions.updatePermission(params, tx);

      if (tagIds && tagIds.length > 0) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));

        await Promise.all(
          newTagIds.map((tagId) =>
            this.services.permissionTags.addPermissionTag({ permissionId, tagId }, tx)
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) =>
            this.services.permissionTags.removePermissionTag({ permissionId, tagId }, tx)
          )
        );
      }

      return updatedPermission;
    });
  }

  public async deletePermission(
    params: MutationDeletePermissionArgs & DeleteParams
  ): Promise<Permission> {
    const { id: permissionId, scope } = params;
    const permissionTags = await this.services.permissionTags.getPermissionTags({ permissionId });
    const tagIds = permissionTags.map((pt) => pt.tagId);

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationPermissions.removeOrganizationPermission(
            { organizationId: scope.id, permissionId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectPermissions.removeProjectPermission(
            { projectId: scope.id, permissionId },
            tx
          );
          break;
      }

      await Promise.all(
        tagIds.map((tagId) =>
          this.services.permissionTags.removePermissionTag({ permissionId, tagId }, tx)
        )
      );

      return await this.services.permissions.deletePermission(params, tx);
    });
  }
}
