import { DbSchema, TagModel } from '@grantjs/database';
import {
  MutationCreateTagArgs,
  MutationDeleteTagArgs,
  MutationUpdateTagArgs,
  QueryTagsArgs,
  Tag,
  TagPage,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { CacheHandler } from './base/cache-handler';

export class TagHandler extends CacheHandler {
  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
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
        case Tenant.Account:
          await this.services.accountTags.addAccountTag({ accountId: scope.id, tagId }, tx);
          break;
        case Tenant.Organization:
          await this.services.organizationTags.addOrganizationTag(
            { organizationId: scope.id, tagId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.services.projectTags.addProjectTag({ projectId, tagId }, tx);
          break;
        }
      }

      this.addTagIdToScopeCache(scope, tagId);

      return tag;
    });
  }

  public async updateTag(params: MutationUpdateTagArgs): Promise<Tag> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: tagId, input } = params;
      const updatedTag = await this.services.tags.updateTag(tagId, input, tx);
      return updatedTag;
    });
  }

  public async deleteTag(params: MutationDeleteTagArgs & DeleteParams): Promise<Tag> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: tagId, scope, hardDelete } = params;
      switch (scope.tenant) {
        case Tenant.Account:
          await this.services.accountTags.removeAccountTag(
            { accountId: scope.id, tagId, hardDelete },
            tx
          );
          break;
        case Tenant.Organization:
          await this.services.organizationTags.removeOrganizationTag(
            { organizationId: scope.id, tagId, hardDelete },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.services.projectTags.removeProjectTag({ projectId, tagId, hardDelete }, tx);
          break;
        }
      }

      await Promise.all([
        this.services.userTags.removeUserTags({ tagId, hardDelete }, tx),
        this.services.roleTags.removeRoleTags({ tagId, hardDelete }, tx),
        this.services.groupTags.removeGroupTags({ tagId, hardDelete }, tx),
        this.services.permissionTags.removePermissionTags({ tagId, hardDelete }, tx),
        this.services.resourceTags.removeResourceTags({ tagId, hardDelete }, tx),
      ]);

      this.removeTagIdFromScopeCache(scope, tagId);

      return await this.services.tags.deleteTag(params, tx);
    });
  }
}
