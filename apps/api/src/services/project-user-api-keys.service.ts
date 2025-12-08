import { MILLISECONDS_PER_MINUTE } from '@logusgraphics/grant-constants';
import { DbSchema, projectUserApiKeyAuditLogs } from '@logusgraphics/grant-database';
import {
  CreateProjectUserApiKeyResult,
  ProjectUserApiKey,
  ProjectUserApiKeyPage,
  QueryProjectUserApiKeysArgs,
  Tenant,
} from '@logusgraphics/grant-schema';
import { compareSync, hashSync } from 'bcrypt';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { config } from '@/config';
import { AuthenticationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { generateRandomBytes, generateUUID } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import { AuditService, validateInput, validateOutput } from './common';
import {
  createProjectUserApiKeyParamsSchema,
  createProjectUserApiKeyResponseSchema,
  deleteProjectUserApiKeyParamsSchema,
  exchangeProjectUserApiKeyParamsSchema,
  exchangeProjectUserApiKeyResponseSchema,
  revokeProjectUserApiKeyParamsSchema,
} from './project-user-api-keys.schemas';

interface GenerateApiKeyResult {
  clientId: string;
  clientSecret: string;
}

interface ExchangeTokenResult {
  accessToken: string;
  expiresIn: number;
}

export class ProjectUserApiKeyService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(projectUserApiKeyAuditLogs, 'projectUserApiKeyId', user, db);
  }

  private generateApiKey(): GenerateApiKeyResult {
    const clientId = generateUUID();

    const secretBytes = generateRandomBytes(32);
    const clientSecret = secretBytes.toString('base64url');

    return { clientId, clientSecret };
  }

  private hashClientSecret(secret: string): string {
    return hashSync(secret, 10);
  }

  private verifyClientSecret(secret: string, hash: string): boolean {
    return compareSync(secret, hash);
  }

  private getAccessTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + config.jwt.accessTokenExpirationMinutes * MILLISECONDS_PER_MINUTE);
  }

  public signToken(apiKey: ProjectUserApiKey): string {
    const sub = apiKey.userId;
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
      scope: `${Tenant.Project}:${apiKey.projectId}`,
    };

    return jwt.sign(jwtPayload, config.jwt.secret);
  }

  private validateApiKeyActive(apiKey: ProjectUserApiKey | null): void {
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

  public async createProjectUserApiKey(
    params: {
      projectId: string;
      userId: string;
      name?: string | null;
      description?: string | null;
      expiresAt?: Date | null;
    },
    transaction?: Transaction
  ): Promise<CreateProjectUserApiKeyResult> {
    const context = 'ProjectUserApiKeyService.createProjectUserApiKey';
    const validatedParams = validateInput(createProjectUserApiKeyParamsSchema, params, context);

    const { projectId, userId, name, description, expiresAt } = validatedParams;

    const existingKeys = await this.repositories.projectUserApiKeyRepository.findByProjectAndUser(
      projectId,
      userId,
      transaction
    );

    const activeKey = existingKeys.find(
      (key) =>
        !key.isRevoked && !key.deletedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date())
    );

    if (activeKey) {
      throw new BadRequestError(
        'An active API key already exists for this project and user',
        'errors:validation.apiKeyAlreadyExists'
      );
    }

    const { clientId, clientSecret } = this.generateApiKey();

    const clientSecretHash = this.hashClientSecret(clientSecret);

    const createdBy = this.getPerformedBy();

    const apiKey = await this.repositories.projectUserApiKeyRepository.createProjectUserApiKey(
      {
        projectId,
        userId,
        clientId,
        clientSecretHash,
        name: name || null,
        description: description || null,
        expiresAt: expiresAt || null,
        createdBy,
      },
      transaction
    );

    await this.logCreate(
      apiKey.id,
      {
        projectId: apiKey.projectId,
        userId: apiKey.userId,
        clientId: apiKey.clientId,
        name: apiKey.name,
        expiresAt: apiKey.expiresAt,
      },
      { action: 'CREATE_API_KEY' },
      transaction
    );

    const response = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      clientSecret,
      name: (apiKey.name ?? null) as string | null,
      description: (apiKey.description ?? null) as string | null,
      expiresAt: (apiKey.expiresAt ?? null) as Date | null,
      createdAt: apiKey.createdAt,
    };

    return validateOutput(
      createProjectUserApiKeyResponseSchema,
      response,
      context
    ) as CreateProjectUserApiKeyResult;
  }

  public async exchangeApiKeyForToken(
    params: {
      clientId: string;
      clientSecret: string;
    },
    transaction?: Transaction
  ): Promise<ExchangeTokenResult> {
    const context = 'ProjectUserApiKeyService.exchangeApiKeyForToken';
    const validatedParams = validateInput(exchangeProjectUserApiKeyParamsSchema, params, context);

    const { clientId, clientSecret } = validatedParams;

    const apiKey = await this.repositories.projectUserApiKeyRepository.findByClientId(
      clientId,
      transaction
    );

    this.validateApiKeyActive(apiKey);

    if (!apiKey) {
      throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
    }

    const clientSecretHash =
      await this.repositories.projectUserApiKeyRepository.getClientSecretHash(
        apiKey.id,
        transaction
      );

    if (!clientSecretHash) {
      throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
    }

    if (!this.verifyClientSecret(clientSecret, clientSecretHash)) {
      throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
    }

    await this.repositories.projectUserApiKeyRepository.updateLastUsedAt(
      apiKey.id,
      new Date(),
      transaction
    );

    const accessToken = this.signToken(apiKey);
    const expiresIn = config.jwt.accessTokenExpirationMinutes * 60;

    const response: ExchangeTokenResult = {
      accessToken,
      expiresIn,
    };

    return validateOutput(exchangeProjectUserApiKeyResponseSchema, response, context);
  }

  public async revokeProjectUserApiKey(
    params: { id: string },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    const context = 'ProjectUserApiKeyService.revokeProjectUserApiKey';
    const validatedParams = validateInput(revokeProjectUserApiKeyParamsSchema, params, context);

    const { id } = validatedParams;

    const apiKey = await this.repositories.projectUserApiKeyRepository.getProjectUserApiKey(
      id,
      transaction
    );

    if (!apiKey) {
      throw new NotFoundError('API key not found', 'errors:notFound.apiKey');
    }

    if (apiKey.isRevoked) {
      throw new BadRequestError('API key is already revoked', 'errors:validation.alreadyRevoked');
    }

    const revokedBy = this.getPerformedBy();

    const revokedKey = await this.repositories.projectUserApiKeyRepository.revokeApiKey(
      id,
      revokedBy,
      transaction
    );

    await this.logUpdate(
      id,
      {
        isRevoked: false,
        revokedAt: null,
        revokedBy: null,
      },
      {
        isRevoked: true,
        revokedAt: revokedKey.revokedAt,
        revokedBy: revokedKey.revokedBy,
      },
      { action: 'REVOKE_API_KEY' },
      transaction
    );

    return revokedKey;
  }

  public async deleteProjectUserApiKey(
    params: { id: string; hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    const context = 'ProjectUserApiKeyService.deleteProjectUserApiKey';
    const validatedParams = validateInput(deleteProjectUserApiKeyParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const apiKey = await this.repositories.projectUserApiKeyRepository.getProjectUserApiKey(
      id,
      transaction
    );

    if (!apiKey) {
      throw new NotFoundError('API key not found', 'errors:notFound.apiKey');
    }
    const oldValues = {
      id: apiKey.id,
      projectId: apiKey.projectId,
      userId: apiKey.userId,
      clientId: apiKey.clientId,
      deletedAt: apiKey.deletedAt,
    };

    let deletedKey: ProjectUserApiKey;

    if (hardDelete) {
      deletedKey = await this.repositories.projectUserApiKeyRepository.hardDeleteProjectUserApiKey(
        id,
        transaction
      );

      await this.logHardDelete(id, oldValues, { action: 'HARD_DELETE_API_KEY' }, transaction);
    } else {
      deletedKey = await this.repositories.projectUserApiKeyRepository.softDeleteProjectUserApiKey(
        id,
        transaction
      );

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

  public async getProjectUserApiKeys(
    params: QueryProjectUserApiKeysArgs,
    transaction?: Transaction
  ): Promise<ProjectUserApiKeyPage> {
    return await this.repositories.projectUserApiKeyRepository.getProjectUserApiKeys(
      params,
      transaction
    );
  }
}
