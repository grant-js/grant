import { Response } from 'express';

import { BaseController } from '@/rest/controllers/base.controller';
import {
  apiKeyIdParamsSchema,
  createProjectUserApiKeyRequestSchema,
  deleteProjectUserApiKeyRequestSchema,
  exchangeProjectUserApiKeyRequestSchema,
  getProjectUserApiKeysQuerySchema,
  projectUserApiKeyParamsSchema,
  revokeProjectUserApiKeyRequestSchema,
} from '@/rest/schemas/project-user-api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export class ProjectUserApiKeysController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  async getProjectUserApiKeys(
    req: TypedRequest<{
      params: typeof projectUserApiKeyParamsSchema;
      query: typeof getProjectUserApiKeysQuerySchema;
    }>,
    res: Response
  ) {
    const { projectId, userId } = req.params;
    const { page, limit, search, sort } = req.query;

    const apiKeys = await this.handlers.projectUserApiKeys.getProjectUserApiKeys({
      projectId,
      userId,
      page,
      limit,
      search,
      sort,
    });

    return this.success(res, apiKeys);
  }

  async createProjectUserApiKey(
    req: TypedRequest<{
      params: typeof projectUserApiKeyParamsSchema;
      body: typeof createProjectUserApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { projectId, userId } = req.params;
    const { name, description, expiresAt } = req.body;

    const result = await this.handlers.projectUserApiKeys.createProjectUserApiKey({
      input: {
        projectId,
        userId,
        name,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });

    return this.success(res, result, 201);
  }

  async exchangeProjectUserApiKey(
    req: TypedRequest<{
      body: typeof exchangeProjectUserApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { clientId, clientSecret } = req.body;

    const result = await this.handlers.projectUserApiKeys.exchangeProjectUserApiKey({
      input: {
        clientId,
        clientSecret,
      },
    });

    return this.success(res, result);
  }

  async revokeProjectUserApiKey(
    req: TypedRequest<{
      params: typeof apiKeyIdParamsSchema;
      body: typeof revokeProjectUserApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;

    const apiKey = await this.handlers.projectUserApiKeys.revokeProjectUserApiKey({
      input: { id },
    });

    return this.success(res, apiKey);
  }

  async deleteProjectUserApiKey(
    req: TypedRequest<{
      params: typeof apiKeyIdParamsSchema;
      body: typeof deleteProjectUserApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { hardDelete } = req.body;

    const apiKey = await this.handlers.projectUserApiKeys.deleteProjectUserApiKey({
      input: { id, hardDelete },
    });

    return this.success(res, apiKey);
  }
}
