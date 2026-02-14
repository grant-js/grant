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
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type {
  IAccountTagService,
  IGroupTagService,
  IOrganizationTagService,
  IPermissionTagService,
  IProjectTagService,
  IResourceTagService,
  IRoleTagService,
  ITagService,
  ITransactionalConnection,
  IUserTagService,
} from '@grantjs/core';

export class TagHandler extends CacheHandler {
  constructor(
    private readonly tags: ITagService,
    private readonly accountTags: IAccountTagService,
    private readonly organizationTags: IOrganizationTagService,
    private readonly projectTags: IProjectTagService,
    private readonly userTags: IUserTagService,
    private readonly roleTags: IRoleTagService,
    private readonly groupTags: IGroupTagService,
    private readonly permissionTags: IPermissionTagService,
    private readonly resourceTags: IResourceTagService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getTags(params: QueryTagsArgs & SelectedFields<Tag>): Promise<TagPage> {
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

    const tagsResult = await this.tags.getTags({
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
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, color, scope } = input;

      const tag = await this.tags.createTag({ name, color }, tx);
      const { id: tagId } = tag;

      switch (scope.tenant) {
        case Tenant.Account:
          await this.accountTags.addAccountTag({ accountId: scope.id, tagId }, tx);
          break;
        case Tenant.Organization:
          await this.organizationTags.addOrganizationTag({ organizationId: scope.id, tagId }, tx);
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectTags.addProjectTag({ projectId, tagId }, tx);
          break;
        }
      }

      this.addTagIdToScopeCache(scope, tagId);

      return tag;
    });
  }

  public async updateTag(params: MutationUpdateTagArgs): Promise<Tag> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: tagId, input } = params;
      const updatedTag = await this.tags.updateTag(tagId, input, tx);
      return updatedTag;
    });
  }

  public async deleteTag(params: MutationDeleteTagArgs & DeleteParams): Promise<Tag> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: tagId, scope, hardDelete } = params;
      switch (scope.tenant) {
        case Tenant.Account:
          await this.accountTags.removeAccountTag({ accountId: scope.id, tagId, hardDelete }, tx);
          break;
        case Tenant.Organization:
          await this.organizationTags.removeOrganizationTag(
            { organizationId: scope.id, tagId, hardDelete },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectTags.removeProjectTag({ projectId, tagId, hardDelete }, tx);
          break;
        }
      }

      await Promise.all([
        this.userTags.removeUserTags({ tagId, hardDelete }, tx),
        this.roleTags.removeRoleTags({ tagId, hardDelete }, tx),
        this.groupTags.removeGroupTags({ tagId, hardDelete }, tx),
        this.permissionTags.removePermissionTags({ tagId, hardDelete }, tx),
        this.resourceTags.removeResourceTags({ tagId, hardDelete }, tx),
      ]);

      this.removeTagIdFromScopeCache(scope, tagId);

      return await this.tags.deleteTag(params, tx);
    });
  }
}
