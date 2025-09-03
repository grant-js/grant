import {
  QueryTagsArgs,
  MutationCreateTagArgs,
  MutationUpdateTagArgs,
  MutationDeleteTagArgs,
  Tag,
  TagPage,
  Tenant,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { TagModel } from '@/graphql/repositories/tags/schema';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class TagController extends ScopeController {
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
    const { id: tagId, scope } = params;

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationTags.removeOrganizationTag(
            { organizationId: scope.id, tagId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectTags.removeProjectTag({ projectId: scope.id, tagId }, tx);
          break;
      }

      return await this.services.tags.deleteTag(params, tx);
    });
  }
}
