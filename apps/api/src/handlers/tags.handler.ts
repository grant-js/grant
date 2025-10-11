import { DbSchema } from '@logusgraphics/grant-database';
import { TagModel } from '@logusgraphics/grant-database';
import {
  QueryTagsArgs,
  MutationCreateTagArgs,
  MutationUpdateTagArgs,
  MutationDeleteTagArgs,
  Tag,
  TagPage,
  Tenant,
} from '@logusgraphics/grant-schema';

import { ScopeHandler } from './base/scope-handler';

import { EntityCache } from '@/handlers/base/scope-handler';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

export class TagHandler extends ScopeHandler {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getTags(params: QueryTagsArgs & SelectedFields<TagModel>): Promise<TagPage> {
    const { scope, page, limit, sort, search, ids, requestedFields } = params;

    let tagIds = await this.getScopedTagIds(scope);

    // Tags can be inherited from organization to project
    // We don't want to mix scopes for tags
    if (scope.tenant === Tenant.Project) {
      // TODO: we need to determine if it's an account project or an organization project
      const projectOrganization = await this.services.organizationProjects.getOrganizationProject({
        projectId: scope.id,
      });
      const organizationId = projectOrganization.organizationId;
      const organizationTags = await this.services.organizationTags.getOrganizationTags({
        organizationId,
      });
      const organizationTagIds = organizationTags.map((ot) => ot.tagId);
      tagIds = tagIds.filter((tagId) => !organizationTagIds.includes(tagId));
    }

    if (ids && ids.length > 0) {
      tagIds = ids.filter((tagId) => tagIds.includes(tagId));
    }

    if (tagIds.length === 0) {
      return {
        tags: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const tagsResult = await this.services.tags.getTags({
      ids: tagIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return tagsResult;
  }

  public async createTag(params: MutationCreateTagArgs): Promise<Tag> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, color, scope } = input;

      const tag = await this.services.tags.createTag({ name, color }, tx);
      const { id: tagId } = tag;

      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationTags.addOrganizationTag(
            { organizationId: scope.id, tagId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectTags.addProjectTag({ projectId: scope.id, tagId }, tx);
          break;
      }

      return tag;
    });
  }

  public async updateTag(params: MutationUpdateTagArgs): Promise<Tag> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const updatedTag = await this.services.tags.updateTag(params, tx);
      return updatedTag;
    });
  }

  public async deleteTag(params: MutationDeleteTagArgs & DeleteParams): Promise<Tag> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: tagId, scope, hardDelete } = params;
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationTags.removeOrganizationTag(
            { organizationId: scope.id, tagId, hardDelete },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectTags.removeProjectTag(
            { projectId: scope.id, tagId, hardDelete },
            tx
          );
          break;
      }

      await Promise.all([
        this.services.userTags.removeUserTags({ tagId, hardDelete }, tx),
        this.services.roleTags.removeRoleTags({ tagId, hardDelete }, tx),
        this.services.groupTags.removeGroupTags({ tagId, hardDelete }, tx),
        this.services.permissionTags.removePermissionTags({ tagId, hardDelete }, tx),
      ]);

      return await this.services.tags.deleteTag(params, tx);
    });
  }
}
