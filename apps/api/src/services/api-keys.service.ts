import { MILLISECONDS_PER_MINUTE } from '@logusgraphics/grant-constants';
import { DbSchema, apiKeyAuditLogs } from '@logusgraphics/grant-database';
import {
  ApiKey,
  ApiKeyPage,
  CreateApiKeyResult,
  ExchangeApiKeyInput,
  ProjectUserApiKey,
  QueryApiKeysArgs,
  Tenant,
} from '@logusgraphics/grant-schema';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { config } from '@/config';
import { AuthenticationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { generateRandomBytes, generateUUID, hashSecret, verifySecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import {
  SelectedFields,
  createDynamicPaginatedSchema,
  validateInput,
  validateOutput,
} from '@/services/common';
import { AuthenticatedUser } from '@/types';

import {
  apiKeySchema,
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  deleteApiKeyParamsSchema,
  exchangeApiKeyParamsSchema,
  exchangeApiKeyResponseSchema,
  queryApiKeysArgsSchema,
  revokeApiKeyParamsSchema,
} from './api-keys.schemas';
import { AuditService } from './common';

interface ExchangeTokenResult {
  accessToken: string;
  expiresIn: number;
}

export class ApiKeyService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(apiKeyAuditLogs, 'apiKeyId', user, db);
  }

  private getAccessTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + config.jwt.accessTokenExpirationMinutes * MILLISECONDS_PER_MINUTE);
  }

  private signToken(apiKey: ApiKey, scope: string): string {
    const sub = apiKey.createdBy;
    const aud = config.app.url;
    const iss = config.app.url;
    const jti = apiKey.id;
    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(this.getAccessTokenExpirationDate(Date.now()).getTime() / 1000);

    const jwtPayload: JwtPayload = {
      sub,
      aud,
      iss,
      exp,
      iat,
      jti,
      scope,
    };

    return jwt.sign(jwtPayload, config.jwt.secret);
  }

  private validateApiKeyActive(apiKey: ApiKey | null): void {
    if (!apiKey) {
      throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
    }

    if (apiKey.isRevoked) {
      throw new AuthenticationError('API key has been revoked', 'errors:auth.apiKeyRevoked');
    }

    if (apiKey.deletedAt) {
      throw new AuthenticationError('API key has been deleted', 'errors:auth.apiKeyDeleted');
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      throw new AuthenticationError('API key has expired', 'errors:auth.apiKeyExpired');
    }
  }

  private generateApiKey(): { clientId: string; clientSecret: string } {
    const clientId = generateUUID();
    const secretBytes = generateRandomBytes(32);
    const clientSecret = secretBytes.toString('base64url');
    return { clientId, clientSecret };
  }

  public async createApiKey(
    params: {
      name?: string | null;
      description?: string | null;
      expiresAt?: Date | null;
    },
    transaction?: Transaction
  ): Promise<CreateApiKeyResult> {
    const context = 'ApiKeyService.createApiKey';
    const validatedParams = validateInput(createApiKeyRequestSchema, params, context);

    const { clientId, clientSecret } = this.generateApiKey();
    const clientSecretHash = hashSecret(clientSecret);
    const createdBy = this.getPerformedBy();

    const apiKey = await this.repositories.apiKeyRepository.createApiKey(
      {
        clientId,
        clientSecretHash,
        name: validatedParams.name || null,
        description: validatedParams.description || null,
        expiresAt: validatedParams.expiresAt || null,
        createdBy,
      },
      transaction
    );

    const newValues = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      name: apiKey.name,
      description: apiKey.description,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };

    await this.logCreate(apiKey.id, newValues, { action: 'CREATE_API_KEY' }, transaction);

    const response: CreateApiKeyResult = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      clientSecret,
      name: apiKey.name,
      description: apiKey.description,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };

    return validateOutput(createApiKeyResponseSchema, response, context) as CreateApiKeyResult;
  }

  public async getApiKeys(
    params: Omit<QueryApiKeysArgs, 'scope'> & SelectedFields<ApiKey>,
    transaction?: Transaction
  ): Promise<ApiKeyPage> {
    const context = 'ApiKeyService.getApiKeys';
    validateInput(queryApiKeysArgsSchema, params, context);
    const result = await this.repositories.apiKeyRepository.getApiKeys(params, transaction);

    const transformedResult = {
      items: result.apiKeys,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(apiKeySchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async exchangeApiKeyForToken(
    params: ExchangeApiKeyInput,
    transaction?: Transaction
  ): Promise<ExchangeTokenResult> {
    const context = 'ApiKeyService.exchangeApiKeyForToken';
    const validatedParams = validateInput(exchangeApiKeyParamsSchema, params, context);

    const { clientId, clientSecret, scope } = validatedParams;

    const apiKey = await this.repositories.apiKeyRepository.findActiveByClientId(
      clientId,
      transaction
    );

    this.validateApiKeyActive(apiKey);

    if (!apiKey) {
      throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
    }

    const clientSecretHash = await this.repositories.apiKeyRepository.getClientSecretHash(
      apiKey.id,
      transaction
    );

    if (!clientSecretHash) {
      throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
    }

    if (!verifySecret(clientSecret, clientSecretHash)) {
      throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
    }

    await this.repositories.apiKeyRepository.updateLastUsedAt(apiKey.id, new Date(), transaction);

    let pivot: ProjectUserApiKey | null = null;

    switch (scope.tenant) {
      case Tenant.ProjectUser: {
        const [projectId, userId] = scope.id.split(':');
        if (!projectId || !userId) {
          throw new AuthenticationError(
            'Invalid projectUser scope: id must be in format "projectId:userId"',
            'errors:auth.invalidScope'
          );
        }
        const pivots = await this.repositories.projectUserApiKeyRepository.getProjectUserApiKeys(
          { projectId, userId },
          transaction
        );
        pivot = pivots.find((p) => p.apiKeyId === apiKey.id) || null;
        break;
      }

      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.Organization:
      case Tenant.Account:
        // Future implementations
        throw new AuthenticationError(
          `API key exchange for ${scope.tenant} scope is not yet implemented`,
          'errors:auth.scopeNotSupported'
        );

      default:
        throw new AuthenticationError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:auth.invalidScope'
        );
    }

    if (!pivot) {
      throw new AuthenticationError(
        'API key is not associated with the specified scope',
        'errors:auth.apiKeyNoScope'
      );
    }

    const tokenScope = `${scope.tenant}:${pivot.projectId}`;
    const accessToken = this.signToken(apiKey, tokenScope);
    const expiresIn = config.jwt.accessTokenExpirationMinutes * 60;

    const response: ExchangeTokenResult = {
      accessToken,
      expiresIn,
    };

    return validateOutput(exchangeApiKeyResponseSchema, response, context);
  }

  public async revokeApiKey(params: { id: string }, transaction?: Transaction): Promise<ApiKey> {
    const context = 'ApiKeyService.revokeApiKey';
    const validatedParams = validateInput(revokeApiKeyParamsSchema, params, context);

    const { id } = validatedParams;

    const apiKey = await this.repositories.apiKeyRepository.getApiKey(id, transaction);

    if (!apiKey) {
      throw new NotFoundError('API key not found', 'errors:notFound.apiKey');
    }

    if (apiKey.isRevoked) {
      throw new BadRequestError('API key is already revoked', 'errors:validation.alreadyRevoked');
    }

    const revokedBy = this.getPerformedBy();

    const oldValues = {
      id: apiKey.id,
      isRevoked: apiKey.isRevoked,
      revokedAt: apiKey.revokedAt,
      revokedBy: apiKey.revokedBy,
    };

    const revokedKey = await this.repositories.apiKeyRepository.revokeApiKey(
      id,
      revokedBy,
      transaction
    );

    const newValues = {
      id: revokedKey.id,
      isRevoked: revokedKey.isRevoked,
      revokedAt: revokedKey.revokedAt,
      revokedBy: revokedKey.revokedBy,
    };

    await this.logUpdate(id, oldValues, newValues, { action: 'REVOKE_API_KEY' }, transaction);

    return revokedKey;
  }

  public async deleteApiKey(
    params: { id: string; hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<ApiKey> {
    const context = 'ApiKeyService.deleteApiKey';
    const validatedParams = validateInput(deleteApiKeyParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const apiKey = await this.repositories.apiKeyRepository.getApiKey(id, transaction);

    if (!apiKey) {
      throw new NotFoundError('API key not found', 'errors:notFound.apiKey');
    }

    const oldValues = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      name: apiKey.name,
      deletedAt: apiKey.deletedAt,
    };

    let deletedKey: ApiKey;
    if (hardDelete) {
      deletedKey = await this.repositories.apiKeyRepository.hardDeleteApiKey(id, transaction);
      await this.logHardDelete(id, oldValues, { action: 'HARD_DELETE_API_KEY' }, transaction);
    } else {
      deletedKey = await this.repositories.apiKeyRepository.softDeleteApiKey(id, transaction);
      await this.logSoftDelete(
        id,
        oldValues,
        { deletedAt: deletedKey.deletedAt },
        { action: 'SOFT_DELETE_API_KEY' },
        transaction
      );
    }

    return deletedKey;
  }
}
