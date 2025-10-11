import { Response } from 'express';

import {
  CreateTagMutationVariables,
  DeleteTagMutationVariables,
  QueryTagsArgs,
  Tag,
  UpdateTagMutationVariables,
} from '@logusgraphics/grant-schema';

import {
  createTagRequestSchema,
  deleteTagQuerySchema,
  getTagsQuerySchema,
  tagParamsSchema,
  updateTagRequestSchema,
} from '@/rest/schemas';
import {
  RequestContext,
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

import { BaseController } from './base.controller';

export class TagsController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  async getTags(
    req: TypedRequest<TypedRequestQuery<typeof getTagsQuerySchema>>,
    res: Response
  ): Promise<void> {
    const { page, limit, search, sortField, sortOrder, scopeId, tenant } = req.query;

    try {
      const args: QueryTagsArgs = {
        pagination: { page, limit },
        search: search || undefined,
        sortBy: sortField || undefined,
        sortOrder: sortOrder || undefined,
        scope: { id: scopeId, tenant },
      };

      const result = await req.context.handlers.tags.getTags(args, [
        'id',
        'name',
        'color',
        'isPrimary',
      ] as any);

      this.ok(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch tags');
    }
  }

  async createTag(
    req: TypedRequest<TypedRequestBody<typeof createTagRequestSchema>>,
    res: Response
  ): Promise<void> {
    try {
      const variables: CreateTagMutationVariables = {
        input: req.body,
      };

      const tag: Tag = await req.context.handlers.tags.createTag(variables, [
        'id',
        'name',
        'color',
      ] as any);

      this.created(res, tag);
    } catch (error) {
      this.handleError(res, error, 'Failed to create tag');
    }
  }

  async updateTag(
    req: TypedRequest<
      TypedRequestBody<typeof updateTagRequestSchema> & TypedRequestParams<typeof tagParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      const variables: UpdateTagMutationVariables = {
        id,
        input: req.body,
      };

      const tag: Tag = await req.context.handlers.tags.updateTag(variables, [
        'id',
        'name',
        'color',
      ] as any);

      this.ok(res, tag);
    } catch (error) {
      this.handleError(res, error, 'Failed to update tag');
    }
  }

  async deleteTag(
    req: TypedRequest<
      TypedRequestParams<typeof tagParamsSchema> & TypedRequestQuery<typeof deleteTagQuerySchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { scopeId, tenant, hardDelete } = req.query;

    try {
      const variables: DeleteTagMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
        hardDelete: hardDelete || false,
      };

      const tag: Tag = await req.context.handlers.tags.deleteTag(variables, ['id', 'name'] as any);

      this.ok(res, tag);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete tag');
    }
  }
}
