import { MILLISECONDS_PER_MINUTE } from '@grantjs/constants';
import type {
  IAccountProjectRepository,
  IApiKeyRepository,
  IApiKeyService,
  IAuditLogger,
  IEventPublisher,
  IOrganizationProjectRepository,
} from '@grantjs/core';
import { Grant, GrantAuth } from '@grantjs/core';
import {
  ApiKey,
  ApiKeyPage,
  CreateApiKeyInput,
  CreateApiKeyResult,
  ExchangeApiKeyInput,
  QueryApiKeysArgs,
  Scope,
  Tenant,
} from '@grantjs/schema';
import { sql } from 'drizzle-orm';

import { config } from '@/config';
import {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  NoSessionSigningKeyError,
  NotFoundError,
} from '@/lib/errors';
import { buildJwksIssuerUrl } from '@/lib/jwks.lib';
import { generateRandomBytes, generateUUID, hashSecret, verifySecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { createDynamicPaginatedSchema, validateInput, validateOutput } from '@/services/common';
import { SelectedFields } from '@/types';

import {
  apiKeySchema,
  createApiKeyForCdmImportParamsSchema,
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  deleteApiKeyParamsSchema,
  exchangeApiKeyParamsSchema,
  exchangeApiKeyResponseSchema,
  queryApiKeysArgsSchema,
  revokeApiKeyParamsSchema,
  rotateApiKeyParamsSchema,
} from './api-keys.schemas';

interface ExchangeTokenResult {
  accessToken: string;
  expiresIn: number;
}

interface SignTokenParams {
  apiKeyId: string;
  scope: Scope;
  userId: string;
}

interface ScopedApiKeyResolution {
  apiKeys: ApiKey[];
  userId: string;
}

export class ApiKeyService implements IApiKeyService {
  constructor(
    private readonly accountProjectRepository: IAccountProjectRepository,
    private readonly organizationProjectRepository: IOrganizationProjectRepository,
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger,
    private readonly grant: Grant,
    private readonly events: IEventPublisher
  ) {}

  private getPerformedBy(): string {
    return this.user !== null ? this.user.userId : config.system.systemUserId;
  }

  private getAccessTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + config.jwt.accessTokenExpirationMinutes * MILLISECONDS_PER_MINUTE);
  }

  private async resolveSigningScope(
    scope: Scope,
    transaction?: Transaction
  ): Promise<Scope | null> {
    switch (scope.tenant) {
      case Tenant.AccountProject:
      case Tenant.OrganizationProject:
        return scope;
      case Tenant.AccountProjectUser: {
        const parts = scope.id.split(':');
        if (parts.length >= 2) {
          return { tenant: Tenant.AccountProject, id: `${parts[0]}:${parts[1]}` };
        }
        return null;
      }
      case Tenant.OrganizationProjectUser: {
        const parts = scope.id.split(':');
        if (parts.length >= 2) {
          return { tenant: Tenant.OrganizationProject, id: `${parts[0]}:${parts[1]}` };
        }
        return null;
      }
      case Tenant.ProjectUser: {
        const parts = scope.id.split(':');
        const projectId = parts[0];
        if (!projectId) return null;
        const accountProject = await this.accountProjectRepository.getFirstByProjectId(
          projectId,
          transaction
        );
        if (accountProject) {
          return {
            tenant: Tenant.AccountProject,
            id: `${accountProject.accountId}:${accountProject.projectId}`,
          };
        }
        const orgProject = await this.organizationProjectRepository.getFirstByProjectId(
          projectId,
          transaction
        );
        if (orgProject) {
          return {
            tenant: Tenant.OrganizationProject,
            id: `${orgProject.organizationId}:${orgProject.projectId}`,
          };
        }
        return null;
      }
      default:
        return null;
    }
  }

  private async signToken(
    params: SignTokenParams,
    transaction?: Transaction,
    issuerBaseUrl?: string
  ): Promise<string> {
    const { apiKeyId, scope, userId } = params;
    const base = (issuerBaseUrl ?? config.app.url).replace(/\/$/, '');
    const aud = base;
    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(this.getAccessTokenExpirationDate(Date.now()).getTime() / 1000);

    const signingScope = await this.resolveSigningScope(scope, transaction);
    if (!signingScope) {
      throw new NoSessionSigningKeyError('No session signing key found');
    }

    const iss = buildJwksIssuerUrl(signingScope, issuerBaseUrl);

    const payload = {
      sub: userId,
      aud,
      iss,
      exp,
      iat,
      jti: apiKeyId,
      scope,
    };
    return this.grant.signApiKeyToken(payload, { signingScope, transaction });
  }

  private validateApiKeyActive(apiKey: ApiKey | null): void {
    if (!apiKey) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (apiKey.isRevoked) {
      throw new AuthenticationError('API key has been revoked');
    }

    if (apiKey.deletedAt) {
      throw new AuthenticationError('API key has been deleted');
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      throw new AuthenticationError('API key has expired');
    }
  }

  private generateApiKey(): { clientId: string; clientSecret: string } {
    const clientId = generateUUID();
    const secretBytes = generateRandomBytes(32);
    const clientSecret = secretBytes.toString('base64url');
    return { clientId, clientSecret };
  }

  private parseScopeId(scope: Scope, expectedParts: number, label: string): string[] {
    const parts = scope.id.split(':');
    if (parts.length !== expectedParts || parts.some((part) => !part)) {
      throw new AuthenticationError(`Invalid ${label} scope`);
    }
    return parts;
  }

  private async findScopedApiKeysByClientId(
    clientId: string,
    scope: Scope,
    transaction?: Transaction
  ): Promise<ScopedApiKeyResolution> {
    switch (scope.tenant) {
      case Tenant.ProjectUser: {
        const [projectId, userId] = this.parseScopeId(scope, 2, 'projectUser');
        const apiKeys = await this.apiKeyRepository.findActiveProjectUserApiKeysByClientId(
          { clientId, projectId, userId },
          transaction
        );
        return { apiKeys, userId };
      }

      case Tenant.AccountProject: {
        const [accountId, projectId] = this.parseScopeId(scope, 2, 'accountProject');
        const apiKeys = await this.apiKeyRepository.findActiveAccountProjectApiKeysByClientId(
          { clientId, accountId, projectId },
          transaction
        );
        return { apiKeys, userId: apiKeys[0]?.id ?? '' };
      }

      case Tenant.OrganizationProject: {
        const [organizationId, projectId] = this.parseScopeId(scope, 2, 'organizationProject');
        const apiKeys = await this.apiKeyRepository.findActiveOrganizationProjectApiKeysByClientId(
          { clientId, organizationId, projectId },
          transaction
        );
        return { apiKeys, userId: apiKeys[0]?.id ?? '' };
      }

      case Tenant.Organization:
      case Tenant.Account:
        throw new AuthenticationError(
          `API key exchange for ${scope.tenant} scope is not yet implemented`
        );

      default:
        throw new AuthenticationError(`Unsupported tenant type: ${scope.tenant}`);
    }
  }

  private async lockScopedClientId(
    params: { clientId: string; scope: Scope },
    transaction?: Transaction
  ): Promise<void> {
    if (!transaction) {
      return;
    }

    const lockKey = `${params.scope.tenant}:${params.scope.id}:${params.clientId}`;
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('grant-api-key-client-id'), hashtext(${lockKey}))`
    );
  }

  private async assertScopedClientIdAvailable(
    clientId: string,
    scope: Scope,
    transaction?: Transaction
  ): Promise<void> {
    await this.lockScopedClientId({ clientId, scope }, transaction);
    const { apiKeys } = await this.findScopedApiKeysByClientId(clientId, scope, transaction);

    if (apiKeys.length > 0) {
      throw new ConflictError('clientId is already in use for this scope');
    }
  }

  public async createApiKey(
    params: Omit<CreateApiKeyInput, 'scope'>,
    transaction?: Transaction
  ): Promise<CreateApiKeyResult> {
    const context = 'ApiKeyService.createApiKey';
    const validatedParams = validateInput(createApiKeyRequestSchema, params, context);

    const { clientId, clientSecret } = this.generateApiKey();
    const clientSecretHash = hashSecret(clientSecret);
    const createdBy = this.getPerformedBy();

    const apiKey = await this.apiKeyRepository.createApiKey(
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

    await this.audit.logCreate(apiKey.id, newValues, { action: 'CREATE_API_KEY' }, transaction);

    await this.events.publish(
      {
        type: 'api_key.created',
        aggregate: { kind: 'apiKey', id: apiKey.id },
        data: { after: newValues },
      },
      transaction
    );

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

  public async createApiKeyForCdmImport(
    params: {
      clientSecret: string;
      clientId?: string | null;
      scope?: Scope | null;
      name?: string | null;
      description?: string | null;
      expiresAt?: Date | null;
    },
    transaction?: Transaction
  ): Promise<CreateApiKeyResult> {
    const context = 'ApiKeyService.createApiKeyForCdmImport';
    const validatedParams = validateInput(createApiKeyForCdmImportParamsSchema, params, context);

    const clientId =
      validatedParams.clientId?.trim() && validatedParams.clientId.length > 0
        ? validatedParams.clientId
        : generateUUID();

    if (validatedParams.clientId && validatedParams.scope) {
      await this.assertScopedClientIdAvailable(clientId, validatedParams.scope, transaction);
    } else if (validatedParams.clientId) {
      const existing = await this.apiKeyRepository.findByClientId(clientId, transaction);
      if (existing) {
        throw new ConflictError('clientId is already in use');
      }
    }

    const clientSecretHash = hashSecret(validatedParams.clientSecret);
    const createdBy = this.getPerformedBy();

    const apiKey = await this.apiKeyRepository.createApiKey(
      {
        clientId,
        clientSecretHash,
        name: validatedParams.name ?? null,
        description: validatedParams.description ?? null,
        expiresAt: validatedParams.expiresAt ?? null,
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

    await this.audit.logCreate(apiKey.id, newValues, { action: 'CREATE_API_KEY_CDM' }, transaction);

    const response: CreateApiKeyResult = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      clientSecret: validatedParams.clientSecret,
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
    const result = await this.apiKeyRepository.getApiKeys(params, transaction);

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
    transaction?: Transaction,
    issuerBaseUrl?: string
  ): Promise<ExchangeTokenResult> {
    const context = 'ApiKeyService.exchangeApiKeyForToken';
    const validatedParams = validateInput(exchangeApiKeyParamsSchema, params, context);

    const { clientId, clientSecret, scope } = validatedParams;

    const scopedResolution = await this.findScopedApiKeysByClientId(clientId, scope, transaction);

    if (scopedResolution.apiKeys.length === 0) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (scopedResolution.apiKeys.length > 1) {
      throw new AuthenticationError('Invalid credentials');
    }

    const apiKey = scopedResolution.apiKeys[0];

    this.validateApiKeyActive(apiKey);

    const clientSecretHash = await this.apiKeyRepository.getClientSecretHash(
      apiKey.id,
      transaction
    );

    if (!clientSecretHash) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (!verifySecret(clientSecret, clientSecretHash)) {
      throw new AuthenticationError('Invalid credentials');
    }

    await this.apiKeyRepository.updateLastUsedAt(apiKey.id, new Date(), transaction);

    const userId = scopedResolution.userId || apiKey.id;

    if (!userId) {
      throw new AuthenticationError('User ID not found');
    }

    const accessToken = await this.signToken(
      { apiKeyId: apiKey.id, scope, userId },
      transaction,
      issuerBaseUrl
    );
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

    const apiKey = await this.apiKeyRepository.getApiKey(id, transaction);

    if (!apiKey) {
      throw new NotFoundError('ApiKey');
    }

    if (apiKey.isRevoked) {
      throw new BadRequestError('API key is already revoked');
    }

    const revokedBy = this.getPerformedBy();

    const oldValues = {
      id: apiKey.id,
      isRevoked: apiKey.isRevoked,
      revokedAt: apiKey.revokedAt,
      revokedBy: apiKey.revokedBy,
    };

    const revokedKey = await this.apiKeyRepository.revokeApiKey(id, revokedBy, transaction);

    const newValues = {
      id: revokedKey.id,
      isRevoked: revokedKey.isRevoked,
      revokedAt: revokedKey.revokedAt,
      revokedBy: revokedKey.revokedBy,
    };

    await this.audit.logUpdate(id, oldValues, newValues, { action: 'REVOKE_API_KEY' }, transaction);

    await this.events.publish(
      {
        type: 'api_key.revoked',
        aggregate: { kind: 'apiKey', id: revokedKey.id },
        data: { before: oldValues, after: newValues },
      },
      transaction
    );

    return revokedKey;
  }

  public async rotateApiKey(
    params: { id: string },
    transaction?: Transaction
  ): Promise<CreateApiKeyResult> {
    const context = 'ApiKeyService.rotateApiKey';
    const validatedParams = validateInput(rotateApiKeyParamsSchema, params, context);

    const { id } = validatedParams;

    const apiKey = await this.apiKeyRepository.getApiKey(id, transaction);

    if (!apiKey) {
      throw new NotFoundError('ApiKey');
    }

    if (apiKey.isRevoked) {
      throw new BadRequestError('Cannot rotate a revoked API key');
    }

    const clientSecret = generateRandomBytes(32).toString('base64url');
    const clientSecretHash = hashSecret(clientSecret);

    const before = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      name: apiKey.name,
      description: apiKey.description,
      expiresAt: apiKey.expiresAt,
    };

    const rotatedKey = await this.apiKeyRepository.updateClientSecretHash(
      id,
      clientSecretHash,
      transaction
    );

    const after = {
      id: rotatedKey.id,
      clientId: rotatedKey.clientId,
      name: rotatedKey.name,
      description: rotatedKey.description,
      expiresAt: rotatedKey.expiresAt,
    };

    await this.audit.logUpdate(id, before, after, { action: 'ROTATE_API_KEY' }, transaction);

    await this.events.publish(
      {
        type: 'api_key.rotated',
        aggregate: { kind: 'apiKey', id: rotatedKey.id },
        data: { before, after },
      },
      transaction
    );

    const response: CreateApiKeyResult = {
      id: rotatedKey.id,
      clientId: rotatedKey.clientId,
      clientSecret,
      name: rotatedKey.name,
      description: rotatedKey.description,
      expiresAt: rotatedKey.expiresAt,
      createdAt: rotatedKey.createdAt,
    };

    return validateOutput(createApiKeyResponseSchema, response, context) as CreateApiKeyResult;
  }

  public async deleteApiKey(
    params: { id: string; hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<ApiKey> {
    const context = 'ApiKeyService.deleteApiKey';
    const validatedParams = validateInput(deleteApiKeyParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const apiKey = await this.apiKeyRepository.getApiKey(id, transaction);

    if (!apiKey) {
      throw new NotFoundError('ApiKey');
    }

    const oldValues = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      name: apiKey.name,
      deletedAt: apiKey.deletedAt,
    };

    let deletedKey: ApiKey;
    if (hardDelete) {
      // Audit row FKs to `api_keys.id`; insert the log before the row is removed
      // so the transaction is not left aborted (Postgres aborts the whole tx on FK failure).
      await this.audit.logHardDelete(id, oldValues, { action: 'HARD_DELETE_API_KEY' }, transaction);
      deletedKey = await this.apiKeyRepository.hardDeleteApiKey(id, transaction);
    } else {
      deletedKey = await this.apiKeyRepository.softDeleteApiKey(id, transaction);
      await this.audit.logSoftDelete(
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
