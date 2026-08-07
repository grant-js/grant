import type {
  IGroupPermissionService,
  IOrganizationPermissionService,
  IPermissionService,
  IPermissionTagService,
  IProjectPermissionService,
  IRolePermissionService,
  ITransactionalConnection,
  IUserPermissionService,
} from '@grantjs/core';
import {
  MutationCreatePermissionArgs,
  MutationDeletePermissionArgs,
  MutationUpdatePermissionArgs,
  Permission,
  PermissionPage,
  QueryPermissionsArgs,
  Scope,
  Tag,
  Tenant,
} from '@grantjs/schema';

import {
  type PermissionListHydrationContext,
  permissionListHydrators,
} from '@/hydrators/permissions.hydrators';
import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { hydrateList, stripHydratedFields } from '@/lib/list-hydration/list-hydration.lib';
import { intersectScopedIds } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class PermissionHandler extends CacheHandler {
  constructor(
    private readonly permissionTags: IPermissionTagService,
    private readonly permissions: IPermissionService,
    private readonly organizationPermissions: IOrganizationPermissionService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly groupPermissions: IGroupPermissionService,
    private readonly rolePermissions: IRolePermissionService,
    private readonly userPermissions: IUserPermissionService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getPermissions(
    params: QueryPermissionsArgs & SelectedFields<Permission>
  ): Promise<PermissionPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let permissionIds = await this.getScopedPermissionIds(scope);

    if (tagIds && tagIds.length > 0) {
      const permissionTags = await this.permissionTags.getPermissionTagIntersection({
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

    permissionIds = intersectScopedIds(permissionIds, ids);

    if (permissionIds.length === 0) {
      return {
        permissions: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const repositoryRequestedFields = stripHydratedFields<Permission>(
      requestedFields,
      permissionListHydrators
    );
    const permissionsResult = await this.permissions.getPermissions({
      ids: permissionIds,
      page,
      limit,
      sort,
      search,
      requestedFields: repositoryRequestedFields,
    });

    return hydrateList({
      context: this.createPermissionListHydrationContext(scope),
      hydrators: permissionListHydrators,
      itemsKey: 'permissions',
      page: permissionsResult,
      requestedFields,
    });
  }

  private createPermissionListHydrationContext(scope: Scope): PermissionListHydrationContext {
    return {
      loadScopedTags: async (permissionIds) => {
        const pivots = await this.permissionTags.getPermissionTagsByPermissionIds(permissionIds);
        return this.hydrateScopedTagsForOwners({
          scope,
          ownerIds: permissionIds,
          pivots,
          getOwnerId: (pivot) => pivot.permissionId,
        });
      },
    };
  }

  /** Permissions linked by `resource_id` (e.g. Resource.permissions field resolver). */
  public async getPermissionsByResourceId(resourceId: string): Promise<Permission[]> {
    return this.permissions.getPermissionsByResourceId(resourceId);
  }

  public async createPermission(params: MutationCreatePermissionArgs): Promise<Permission> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, description, resourceId, action, condition, scope, tagIds, primaryTagId } =
        input;

      const permission = await this.permissions.createPermission(
        { name, description, resourceId, action, condition },
        tx
      );
      const { id: permissionId } = permission;

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.organizationPermissions.addOrganizationPermission(
            { organizationId: scope.id, permissionId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectPermissions.addProjectPermission({ projectId, permissionId }, tx);
          break;
        }
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.permissionTags.addPermissionTag(
              { permissionId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }

      await this.addPermissionIdToScopeCache(scope, permissionId);

      return permission;
    });
  }

  public async updatePermission(params: MutationUpdatePermissionArgs): Promise<Permission> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: permissionId, input } = params;
      const { tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];

      if (Array.isArray(tagIds)) {
        const currentTags = await this.permissionTags.getPermissionTags({ permissionId }, tx);
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }
      const updatedPermission = await this.permissions.updatePermission(permissionId, input, tx);

      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.permissionTags.addPermissionTag(
              { permissionId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) =>
            this.permissionTags.removePermissionTag({ permissionId, tagId }, tx)
          )
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.permissionTags.updatePermissionTag(
              { permissionId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      } else if (primaryTagId !== undefined) {
        const permissionTagPivots = await this.permissionTags.getPermissionTags(
          { permissionId },
          tx
        );
        if (
          primaryTagId &&
          !permissionTagPivots.some((permissionTag) => permissionTag.tagId === primaryTagId)
        ) {
          throw new BadRequestError('Primary tag must be one of the permission assigned tags');
        }
        await Promise.all(
          permissionTagPivots.map((permissionTag) =>
            this.permissionTags.updatePermissionTag(
              {
                permissionId,
                tagId: permissionTag.tagId,
                isPrimary: primaryTagId ? permissionTag.tagId === primaryTagId : false,
              },
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
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: permissionId, scope } = params;
      const permissionTags = await this.permissionTags.getPermissionTags({ permissionId }, tx);
      const tagIds = permissionTags.map((pt) => pt.tagId);

      // Get all GroupPermission relationships where this permission is assigned
      const groupPermissionRelations = await this.groupPermissions.getGroupPermissions(
        { permissionId },
        tx
      );
      const rolePermissionRelations = await this.rolePermissions.getRolePermissions(
        { permissionId },
        tx
      );
      const userPermissionRelations = await this.userPermissions.getUserPermissions(
        { permissionId },
        tx
      );

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.organizationPermissions.removeOrganizationPermission(
            { organizationId: scope.id, permissionId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectPermissions.removeProjectPermission({ projectId, permissionId }, tx);
          break;
        }
      }

      await Promise.all([
        ...tagIds.map((tagId) =>
          this.permissionTags.removePermissionTag({ permissionId, tagId }, tx)
        ),
        // Remove all GroupPermission relationships
        ...groupPermissionRelations.map((gp) =>
          this.groupPermissions.removeGroupPermission(
            { groupId: gp.groupId, permissionId: gp.permissionId },
            tx
          )
        ),
        ...rolePermissionRelations.map((rp) =>
          this.rolePermissions.revokeRolePermission(
            { roleId: rp.roleId, permissionId: rp.permissionId, scope },
            tx
          )
        ),
        ...userPermissionRelations.map((up) =>
          this.userPermissions.revokeUserPermission(
            { userId: up.userId, permissionId: up.permissionId, scope },
            tx
          )
        ),
      ]);

      await this.removePermissionIdFromScopeCache(scope, permissionId);

      return await this.permissions.deletePermission(params, tx);
    });
  }

  /**
   * Returns the raw permission_tags pivot rows for a permission.
   * Used by Permission.tags resolver, which then intersects with scoped tag
   * IDs to avoid leaking tags from other projects/scopes.
   */
  public async getPermissionTagPivots(params: {
    permissionId: string;
  }): Promise<Array<{ tagId: string; isPrimary: boolean }>> {
    const pivots = await this.permissionTags.getPermissionTags({
      permissionId: params.permissionId,
    });
    return pivots.map((p) => ({ tagId: p.tagId, isPrimary: p.isPrimary }));
  }

  public async getPermissionTags(
    params: { permissionId: string } & SelectedFields<Permission>
  ): Promise<Array<Tag>> {
    const { permissionId, requestedFields } = params;
    const permissionsPage = await this.permissions.getPermissions({
      ids: [permissionId],
      requestedFields,
    });
    if (Array.isArray(permissionsPage.permissions) && permissionsPage.permissions.length > 0) {
      return permissionsPage.permissions[0].tags || [];
    }
    return [];
  }
}
