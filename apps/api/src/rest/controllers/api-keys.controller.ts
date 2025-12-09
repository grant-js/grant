import { Response } from 'express';

import { BaseController } from '@/rest/controllers/base.controller';
import {
  apiKeyIdParamsSchema,
  createApiKeyRequestSchema,
  deleteApiKeyRequestSchema,
  exchangeApiKeyRequestSchema,
  getApiKeysQuerySchema,
  revokeApiKeyRequestSchema,
} from '@/rest/schemas/api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export class ApiKeysController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  async getApiKeys(
    req: TypedRequest<{
      query: typeof getApiKeysQuerySchema;
    }>,
    res: Response
  ) {
    const { scopeId, tenant, page, limit, search, sortField, sortOrder, ids } = req.query;

    const scope = {
      id: scopeId,
      tenant,
    };

    const sort =
      sortField && sortOrder
        ? {
            field: sortField,
            order: sortOrder,
          }
        : undefined;

    const apiKeys = await this.handlers.apiKeys.getApiKeys({
      scope,
      page,
      limit,
      search,
      sort,
      ids,
    });

    return this.success(res, apiKeys);
  }

  async createApiKey(
    req: TypedRequest<{
      body: typeof createApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { name, description, expiresAt, scope } = req.body;

    const result = await this.handlers.apiKeys.createApiKey({
      input: {
        name,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        scope,
      },
    });

    return this.success(res, result, 201);
  }

  async exchangeApiKey(
    req: TypedRequest<{
      body: typeof exchangeApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { clientId, clientSecret, scope } = req.body;

    const result = await this.handlers.apiKeys.exchangeApiKey({
      input: {
        clientId,
        clientSecret,
        scope,
      },
    });

    return this.success(res, result);
  }

  async revokeApiKey(
    req: TypedRequest<{
      params: typeof apiKeyIdParamsSchema;
      body: typeof revokeApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;

    const apiKey = await this.handlers.apiKeys.revokeApiKey({
      input: { id },
    });

    return this.success(res, apiKey);
  }

  async deleteApiKey(
    req: TypedRequest<{
      params: typeof apiKeyIdParamsSchema;
      body: typeof deleteApiKeyRequestSchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { hardDelete } = req.body;

    const apiKey = await this.handlers.apiKeys.deleteApiKey({
      input: { id, hardDelete },
    });

    return this.success(res, apiKey);
  }
}
