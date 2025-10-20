import {
  CreateTagMutationVariables,
  DeleteTagMutationVariables,
  Tag,
  UpdateTagMutationVariables,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import {
  createTagRequestSchema,
  deleteTagQuerySchema,
  getTagsQuerySchema,
  tagParamsSchema,
  updateTagRequestSchema,
} from '@/rest/schemas';
import {
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

    const result = await this.handlers.tags.getTags({
      page,
      limit,
      search: search || undefined,
      sort: sortField && sortOrder ? { field: sortField, order: sortOrder } : undefined,
      scope: { id: scopeId, tenant },
    });

    this.success(res, result);
  }

  async createTag(
    req: TypedRequest<TypedRequestBody<typeof createTagRequestSchema>>,
    res: Response
  ): Promise<void> {
    const variables: CreateTagMutationVariables = {
      input: req.body,
    };

    const tag: Tag = await this.handlers.tags.createTag(variables);

    this.success(res, tag, 201);
  }

  async updateTag(
    req: TypedRequest<
      TypedRequestBody<typeof updateTagRequestSchema> & TypedRequestParams<typeof tagParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const variables: UpdateTagMutationVariables = {
      id,
      input: req.body,
    };

    const tag: Tag = await this.handlers.tags.updateTag(variables);

    this.success(res, tag);
  }

  async deleteTag(
    req: TypedRequest<
      TypedRequestParams<typeof tagParamsSchema> & TypedRequestQuery<typeof deleteTagQuerySchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { scopeId, tenant } = req.query;

    const variables: DeleteTagMutationVariables = {
      id,
      scope: { id: scopeId, tenant },
    };

    const tag: Tag = await this.handlers.tags.deleteTag(variables);

    this.success(res, tag);
  }
}
