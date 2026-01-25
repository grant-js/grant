import { DbSchema } from '@grantjs/database';
import {
  MutationCreateResourceArgs,
  MutationDeleteResourceArgs,
  MutationUpdateResourceArgs,
  QueryResourcesArgs,
  Resource,
  ResourcePage,
  Tag,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { CacheHandler } from './base/cache-handler';

export class ResourceHandler extends CacheHandler {
  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async getResources(
    params: QueryResourcesArgs & SelectedFields<Resource>
  ): Promise<ResourcePage> {
    const { scope, page, limit, sort, search, ids, tagIds, isActive, requestedFields } = params;

    let resourceIds = await this.getScopedResourceIds(scope);

    if (tagIds && tagIds.length > 0) {
      const resourceTags = await this.services.resourceTags.getResourceTagIntersection({
        resourceIds,
        tagIds,
      });
      resourceIds = resourceTags
        .filter(
          ({ resourceId, tagId }) => resourceIds.includes(resourceId) && tagIds.includes(tagId)
        )
        .map(({ resourceId }) => resourceId);
    }

    if (ids && ids.length > 0) {
      resourceIds = ids.filter((resourceId) => resourceIds.includes(resourceId));
    }

    if (resourceIds.length === 0) {
      return {
        resources: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const resourcesResult = await this.services.resources.getResources({
      ids: resourceIds,
      page,
      limit,
      sort,
      search,
      isActive,
      requestedFields,
    });

    return resourcesResult;
  }

  private async validateSlugUniqueness(
    slug: string,
    scopeResourceIds: string[],
    excludeResourceId?: string,
    transaction?: Transaction
  ): Promise<void> {
    await this.services.resources.validateSlugUniqueness(
      slug,
      scopeResourceIds,
      excludeResourceId,
      transaction
    );
  }

  public async createResource(params: MutationCreateResourceArgs): Promise<Resource> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, slug, description, actions, isActive, scope, tagIds, primaryTagId } = input;

      const scopeResourceIds = await this.getScopedResourceIds(scope);

      await this.validateSlugUniqueness(slug, scopeResourceIds, undefined, tx);

      const resource = await this.services.resources.createResource(
        {
          name,
          slug,
          description,
          actions,
          isActive,
        },
        tx
      );

      const { id: resourceId } = resource;

      switch (scope.tenant) {
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.services.projectResources.addProjectResource({ projectId, resourceId }, tx);
          break;
        }
        case Tenant.Organization:
        case Tenant.Account:
        default:
          throw new BadRequestError(
            'Resources are only supported at project level',
            'errors:validation.invalid',
            {
              field: 'scope.tenant',
              value: scope.tenant,
            }
          );
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.services.resourceTags.addResourceTag(
              { resourceId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }

      await this.addResourceIdToScopeCache(scope, resourceId);

      return resource;
    });
  }

  public async updateResource(params: MutationUpdateResourceArgs): Promise<Resource> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: resourceId, input } = params;
      const { scope, slug, tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];
      if (Array.isArray(tagIds)) {
        const currentTags = await this.services.resourceTags.getResourceTags({ resourceId }, tx);
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }

      const existingResource = await this.services.resources.getResources({
        ids: [resourceId],
        limit: 1,
      });

      if (existingResource.resources.length === 0) {
        throw new NotFoundError('Resource not found', 'errors:notFound.resource');
      }

      const currentSlug = existingResource.resources[0].slug;

      if (slug && slug !== currentSlug) {
        let scopeResourceIds: string[] = [];
        switch (scope.tenant) {
          case Tenant.OrganizationProject:
          case Tenant.AccountProject:
            scopeResourceIds = await this.getScopedResourceIds(scope);
            break;
          case Tenant.Organization:
          case Tenant.Account:
          default:
            throw new BadRequestError(
              'Resources are only supported at project level',
              'errors:validation.invalid',
              {
                field: 'scope.tenant',
                value: scope.tenant,
              }
            );
        }
        await this.validateSlugUniqueness(slug, scopeResourceIds, resourceId, tx);
      }

      const updatedResource = await this.services.resources.updateResource(
        {
          id: resourceId,
          input: {
            scope,
            name: input.name,
            slug: input.slug,
            description: input.description,
            actions: input.actions,
            isActive: input.isActive,
            tagIds: input.tagIds,
            primaryTagId: input.primaryTagId,
          },
        },
        tx
      );
      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.services.resourceTags.addResourceTag(
              { resourceId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) =>
            this.services.resourceTags.removeResourceTag({ resourceId, tagId }, tx)
          )
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.services.resourceTags.updateResourceTag(
              { resourceId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }
      return updatedResource;
    });
  }

  public async deleteResource(
    params: MutationDeleteResourceArgs & DeleteParams
  ): Promise<Resource> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: resourceId, scope, hardDelete } = params;

      const [resourceTags, allProjectResources, resourcePermissions] = await Promise.all([
        this.services.resourceTags.getResourceTags({ resourceId }, tx),
        this.services.projectResources.getProjectResourcesByResourceId(resourceId, tx),
        this.services.permissions.getPermissionsByResourceId(resourceId, tx),
      ]);

      const tagIds = resourceTags.map((rt) => rt.tagId);

      for (const permission of resourcePermissions) {
        const permissionId = permission.id;

        const [
          permissionTags,
          groupPermissions,
          organizationPermissions,
          projectPermissions,
        ] = await Promise.all([
          this.services.permissionTags.getPermissionTags({ permissionId }, tx),
          this.services.groupPermissions.getGroupPermissions({ permissionId }, tx),
          this.services.organizationPermissions.getOrganizationPermissions(
            { permissionId },
            tx
          ),
          this.services.projectPermissions.getProjectPermissions({ permissionId }, tx),
        ]);

        await Promise.all([
          ...permissionTags.map((pt) =>
            this.services.permissionTags.removePermissionTag(
              { permissionId, tagId: pt.tagId },
              tx
            )
          ),
          ...groupPermissions.map((gp) =>
            this.services.groupPermissions.removeGroupPermission(
              { groupId: gp.groupId, permissionId: gp.permissionId },
              tx
            )
          ),
          ...organizationPermissions.map((op) =>
            this.services.organizationPermissions.removeOrganizationPermission(
              { organizationId: op.organizationId, permissionId: op.permissionId },
              tx
            )
          ),
          ...projectPermissions.map((pp) =>
            this.services.projectPermissions.removeProjectPermission(
              { projectId: pp.projectId, permissionId: pp.permissionId },
              tx
            )
          ),
        ]);

        await this.services.permissions.deletePermission(
          { id: permissionId, hardDelete: hardDelete === true },
          tx
        );
      }
      await Promise.all([
        ...allProjectResources.map((pr) =>
          this.services.projectResources.removeProjectResource(
            { projectId: pr.projectId, resourceId },
            tx
          )
        ),
        ...tagIds.map((tagId) =>
          this.services.resourceTags.removeResourceTag({ resourceId, tagId }, tx)
        ),
      ]);

      await this.removeResourceIdFromScopeCache(scope, resourceId);

      return await this.services.resources.deleteResource(params, tx);
    });
  }

  public async getResourceTags(
    params: { resourceId: string } & SelectedFields<Resource>
  ): Promise<Array<Tag>> {
    const { resourceId, requestedFields } = params;
    const resourcesPage = await this.services.resources.getResources({
      ids: [resourceId],
      requestedFields,
    });
    if (Array.isArray(resourcesPage.resources) && resourcesPage.resources.length > 0) {
      return resourcesPage.resources[0].tags || [];
    }
    return [];
  }
}
