import { MILLISECONDS_PER_MINUTE } from '@grantjs/constants';
import type {
  IAccountProjectRepository,
  IApiKeyExportableSecretService,
  IApiKeyRepository,
  IApiKeyService,
  IAuditLogger,
  IEventPublisher,
  IOrganizationProjectRepository,
  OptionalListScope,
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
import { credentialFingerprint } from '@/lib/credential-fingerprint.lib';
import {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  NoSessionSigningKeyError,
  NotFoundError,
} from '@/lib/errors';
import { buildJwksIssuerUrl } from '@/lib/jwks.lib';
import { unboundedList } from '@/lib/pagination.lib';
import { generateRandomBytes, generateUUID, hashSecret, verifySecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  createDynamicPaginatedSchema,
  validateInput,
  validateOutput,
  validatePage,
} from '@/services/common';
import { SelectedFields } from '@/types';

import {
  apiKeySchema,
  createApiKeyForCdmImportParamsSchema,
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  createApiKeysForCdmImportParamsSchema,
  deleteApiKeyParamsSchema,
  deleteApiKeysForCdmImportParamsSchema,
  exchangeApiKeyParamsSchema,
  exchangeApiKeyResponseSchema,
  queryApiKeysArgsSchema,
  revokeApiKeyParamsSchema,
  rotateApiKeyParamsSchema,
  rotateApiKeysForCdmImportParamsSchema,
  setMissingClientSecretFingerprintsForCdmImportParamsSchema,
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

/**
 * How a client secret is issued. `base64url-32` is Grant's own form, 32 random bytes as
 * unpadded base64url (43 characters). `base64-64` is 64 random bytes as padded standard
 * base64 (88 characters), issued to the project-user keys of a project that opted in so one
 * string can be carried into a system that decodes standard base64. bcrypt verifies only the
 * first 72 bytes of either form.
 */
type ApiKeySecretForm = 'base64url-32' | 'base64-64';

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
    private readonly events: IEventPublisher,
    private readonly exportableSecrets: IApiKeyExportableSecretService
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

  /**
   * The project user an API key belongs to, and the projects it is linked to. The user is the
   * subject only when the key has exactly one owner in `project_user_api_keys`. Account and
   * organization-project keys have none, and the scoped `userId` of the token exchange falls
   * back to the key's own id for them, so it is never used here. Read before a delete: a hard
   * delete cascades the owner and project pivots.
   */
  private async resolveOwnerSubject(
    id: string,
    transaction?: Transaction
  ): Promise<{ subjectUserId: string | null; projectIds: string[] }> {
    const [projectIds, owningUserIds] = await Promise.all([
      this.events.resolveLinkedProjectIds([{ kind: 'apiKey', id }], transaction),
      this.apiKeyRepository.getOwningUserIds(id, transaction),
    ]);
    return { subjectUserId: owningUserIds.length === 1 ? owningUserIds[0] : null, projectIds };
  }

  private generateApiKeySecret(form: ApiKeySecretForm): string {
    return form === 'base64-64'
      ? generateRandomBytes(64).toString('base64')
      : generateRandomBytes(32).toString('base64url');
  }

  private generateApiKey(form: ApiKeySecretForm): { clientId: string; clientSecret: string } {
    return { clientId: generateUUID(), clientSecret: this.generateApiKeySecret(form) };
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
    params: Omit<CreateApiKeyInput, 'scope'> & {
      owner?: { projectId: string; userId: string };
      grant?: { kind: 'role' | 'permissions'; permissionCount: number };
    },
    transaction?: Transaction
  ): Promise<CreateApiKeyResult> {
    const context = 'ApiKeyService.createApiKey';
    const validatedParams = validateInput(createApiKeyRequestSchema, params, context);

    // Only a project-user key (given an `owner`) can have an exportable copy, and only when its
    // project opted in; that decides the form of the secret before it is generated.
    const owner = validatedParams.owner;
    const exportable = owner
      ? await this.exportableSecrets.isEnabled(owner.projectId, transaction)
      : false;

    const { clientId, clientSecret } = this.generateApiKey(
      exportable ? 'base64-64' : 'base64url-32'
    );
    const clientSecretHash = hashSecret(clientSecret);
    const createdBy = this.getPerformedBy();

    const apiKey = await this.apiKeyRepository.createApiKey(
      {
        clientId,
        clientSecretHash,
        clientSecretFingerprint: owner ? credentialFingerprint(clientSecret) : null,
        name: validatedParams.name || null,
        description: validatedParams.description || null,
        expiresAt: validatedParams.expiresAt || null,
        createdBy,
      },
      transaction
    );

    // Before the audit row and the event: a missing encryption key fails the call, and no key
    // is issued (the project opted in).
    if (owner && exportable) {
      await this.exportableSecrets.storeForKey(
        { apiKeyId: apiKey.id, projectId: owner.projectId, clientSecret },
        transaction
      );
    }

    const newValues = {
      id: apiKey.id,
      clientId: apiKey.clientId,
      name: apiKey.name,
      description: apiKey.description,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };

    await this.audit.logCreate(
      apiKey.id,
      newValues,
      {
        action: 'CREATE_API_KEY',
        ...(validatedParams.grant && {
          grant: validatedParams.grant.kind,
          permissionCount: validatedParams.grant.permissionCount,
        }),
      },
      transaction
    );

    await this.events.publish(
      {
        type: 'api_key.created',
        aggregate: { kind: 'apiKey', id: apiKey.id },
        data: { after: newValues },
        ...(validatedParams.owner && {
          subjectUserId: validatedParams.owner.userId,
          projectIds: [validatedParams.owner.projectId],
        }),
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
        clientSecretFingerprint: credentialFingerprint(validatedParams.clientSecret),
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

  public async createApiKeysForCdmImport(
    params: {
      keys: readonly {
        clientSecretHash: string;
        clientSecretFingerprint?: string | null;
        clientId?: string | null;
        scope?: Scope | null;
        name?: string | null;
        description?: string | null;
        expiresAt?: Date | null;
      }[];
    },
    transaction?: Transaction
  ): Promise<Array<{ id: string; clientId: string }>> {
    const context = 'ApiKeyService.createApiKeysForCdmImport';
    const validatedParams = validateInput(createApiKeysForCdmImportParamsSchema, params, context);
    if (validatedParams.keys.length === 0) {
      return [];
    }

    const createdBy = this.getPerformedBy();
    const seenClientIds = new Set<string>();
    const rows = [];
    for (const key of validatedParams.keys) {
      const clientId =
        key.clientId?.trim() && key.clientId.length > 0 ? key.clientId : generateUUID();
      if (key.clientId) {
        const scopeKey = key.scope ? `${key.scope.tenant}:${key.scope.id}:${clientId}` : clientId;
        if (seenClientIds.has(scopeKey)) {
          throw new ConflictError('clientId is already in use for this scope');
        }
        seenClientIds.add(scopeKey);
        if (key.scope) {
          await this.assertScopedClientIdAvailable(clientId, key.scope, transaction);
        } else {
          const existing = await this.apiKeyRepository.findByClientId(clientId, transaction);
          if (existing) {
            throw new ConflictError('clientId is already in use');
          }
        }
      }
      rows.push({
        clientId,
        clientSecretHash: key.clientSecretHash,
        clientSecretFingerprint: key.clientSecretFingerprint ?? null,
        name: key.name ?? null,
        description: key.description ?? null,
        expiresAt: key.expiresAt ?? null,
        createdBy,
      });
    }

    const created = await this.apiKeyRepository.createApiKeys(rows, transaction);
    for (const apiKey of created) {
      const newValues = {
        id: apiKey.id,
        clientId: apiKey.clientId,
        name: apiKey.name,
        description: apiKey.description,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      };
      await this.audit.logCreate(
        apiKey.id,
        newValues,
        { action: 'CREATE_API_KEY_CDM' },
        transaction
      );
    }

    return created.map((apiKey) => ({ id: apiKey.id, clientId: apiKey.clientId }));
  }

  public async deleteApiKeysForCdmImport(
    params: { ids: readonly string[] },
    transaction?: Transaction
  ): Promise<void> {
    const context = 'ApiKeyService.deleteApiKeysForCdmImport';
    const validatedParams = validateInput(deleteApiKeysForCdmImportParamsSchema, params, context);
    const ids = [...new Set(validatedParams.ids)];
    if (ids.length === 0) {
      return;
    }

    const { apiKeys } = await this.apiKeyRepository.getApiKeys(
      unboundedList({ ids, limit: -1 }),
      transaction
    );
    if (apiKeys.length !== ids.length) {
      throw new NotFoundError('ApiKey');
    }

    for (const apiKey of apiKeys) {
      await this.audit.logHardDelete(
        apiKey.id,
        {
          id: apiKey.id,
          clientId: apiKey.clientId,
          name: apiKey.name,
          deletedAt: apiKey.deletedAt,
        },
        { action: 'HARD_DELETE_API_KEY' },
        transaction
      );
    }
    await this.exportableSecrets.removeForKeys(ids, transaction);
    await this.apiKeyRepository.hardDeleteApiKeys(ids, transaction);
  }

  public async rotateApiKeysForCdmImport(
    params: {
      keys: readonly {
        id: string;
        clientSecretHash: string;
        clientSecretFingerprint?: string | null;
      }[];
    },
    transaction?: Transaction
  ): Promise<void> {
    const context = 'ApiKeyService.rotateApiKeysForCdmImport';
    const validatedParams = validateInput(rotateApiKeysForCdmImportParamsSchema, params, context);
    if (validatedParams.keys.length === 0) {
      return;
    }

    for (const key of validatedParams.keys) {
      const existing = await this.apiKeyRepository.getApiKey(key.id, transaction);
      if (!existing) {
        throw new NotFoundError('ApiKey');
      }
      const before = {
        id: existing.id,
        clientId: existing.clientId,
        name: existing.name,
        description: existing.description,
        expiresAt: existing.expiresAt,
      };
      const rotated = await this.apiKeyRepository.updateClientSecretHash(
        key.id,
        key.clientSecretHash,
        key.clientSecretFingerprint ?? null,
        transaction
      );
      await this.audit.logUpdate(
        key.id,
        before,
        {
          id: rotated.id,
          clientId: rotated.clientId,
          name: rotated.name,
          description: rotated.description,
          expiresAt: rotated.expiresAt,
        },
        { action: 'ROTATE_API_KEY_CDM' },
        transaction
      );
    }

    // The importing system holds the plaintext, Grant does not: a copy of the previous secret
    // must not outlive the hash it matched, and no copy of the new one is written.
    await this.exportableSecrets.removeForKeys(
      validatedParams.keys.map((key) => key.id),
      transaction
    );
  }

  public async setMissingClientSecretFingerprintsForCdmImport(
    params: { keys: readonly { id: string; clientSecretFingerprint: string }[] },
    transaction?: Transaction
  ): Promise<void> {
    const context = 'ApiKeyService.setMissingClientSecretFingerprintsForCdmImport';
    const validatedParams = validateInput(
      setMissingClientSecretFingerprintsForCdmImportParamsSchema,
      params,
      context
    );
    if (validatedParams.keys.length === 0) {
      return;
    }
    await this.apiKeyRepository.setMissingClientSecretFingerprints(
      validatedParams.keys,
      transaction
    );
  }

  public async getApiKeys(
    params: Omit<QueryApiKeysArgs, 'scope'> & OptionalListScope & SelectedFields<ApiKey>,
    transaction?: Transaction
  ): Promise<ApiKeyPage> {
    const context = 'ApiKeyService.getApiKeys';
    validateInput(queryApiKeysArgsSchema, params, context);
    const result = await this.apiKeyRepository.getApiKeys(params, transaction);

    validatePage(
      createDynamicPaginatedSchema(apiKeySchema, params.requestedFields),
      result.apiKeys,
      result,
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

    const { subjectUserId, projectIds } = await this.resolveOwnerSubject(id, transaction);
    const revokedBy = this.getPerformedBy();

    const oldValues = {
      id: apiKey.id,
      isRevoked: apiKey.isRevoked,
      revokedAt: apiKey.revokedAt,
      revokedBy: apiKey.revokedBy,
    };

    const revokedKey = await this.apiKeyRepository.revokeApiKey(id, revokedBy, transaction);
    await this.exportableSecrets.removeForKeys([id], transaction);

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
        subjectUserId,
        data: { before: oldValues, after: newValues },
        projectIds,
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

    const { subjectUserId, projectIds } = await this.resolveOwnerSubject(id, transaction);
    // Resolved before the secret is generated: the flag decides its form. A project-user key
    // has exactly one owner and one project.
    const isProjectUserKey = subjectUserId !== null;
    const exportableProjectId = isProjectUserKey && projectIds.length === 1 ? projectIds[0] : null;
    const exportable =
      exportableProjectId !== null
        ? await this.exportableSecrets.isEnabled(exportableProjectId, transaction)
        : false;
    const clientSecret = this.generateApiKeySecret(exportable ? 'base64-64' : 'base64url-32');
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
      isProjectUserKey ? credentialFingerprint(clientSecret) : null,
      transaction
    );

    // In place, before the audit row and the event: a missing encryption key fails the rotation
    // and the previous secret stays valid.
    if (exportable && exportableProjectId !== null) {
      await this.exportableSecrets.storeForKey(
        { apiKeyId: id, projectId: exportableProjectId, clientSecret },
        transaction
      );
    } else {
      // The hash just changed and no new copy is written: any copy of the previous secret goes,
      // whatever made this key not exportable now (the copy never outlives its hash).
      await this.exportableSecrets.removeForKeys([id], transaction);
    }

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
        subjectUserId,
        data: { before, after },
        projectIds,
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

    const { subjectUserId, projectIds } = await this.resolveOwnerSubject(id, transaction);

    // Soft delete keeps the row, so the copy is removed here; a hard delete would also cascade it.
    await this.exportableSecrets.removeForKeys([id], transaction);

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

    await this.events.publish(
      {
        type: 'api_key.deleted',
        aggregate: { kind: 'apiKey', id: deletedKey.id },
        subjectUserId,
        data: { before: oldValues },
        projectIds,
      },
      transaction
    );

    return deletedKey;
  }
}
