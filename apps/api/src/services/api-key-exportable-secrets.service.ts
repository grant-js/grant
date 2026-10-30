import type {
  IApiKeyExportableSecretRepository,
  IApiKeyExportableSecretService,
  IProjectRepository,
  ISecretResolver,
} from '@grantjs/core';

import { ConfigurationError } from '@/lib/errors';
import { API_KEY_EXPORTABLE_SECRET_PURPOSE, sealSecret } from '@/lib/sealed-secret.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

const ENCRYPTION_KEY_VARIABLE = 'API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY';

/**
 * The encrypted exportable copy of a project user's API-key secret, behind the project's
 * opt-in. This class seals and stores; nothing here decrypts. The key is resolved at the point
 * of use through `ISecretResolver` and is never logged, audited or put in an error.
 */
export class ApiKeyExportableSecretService implements IApiKeyExportableSecretService {
  constructor(
    private readonly copies: IApiKeyExportableSecretRepository,
    private readonly projects: IProjectRepository,
    private readonly secrets: ISecretResolver
  ) {}

  public isEnabled(projectId: string, transaction?: Transaction): Promise<boolean> {
    return this.projects.isExportableApiKeySecretsEnabled(projectId, transaction);
  }

  public async storeForKey(
    params: { apiKeyId: string; projectId: string; clientSecret: string },
    transaction?: Transaction
  ): Promise<void> {
    const keyMaterial = await this.secrets.resolve(ENCRYPTION_KEY_VARIABLE);
    if (!keyMaterial) {
      throw new ConfigurationError(`${ENCRYPTION_KEY_VARIABLE} must be configured`);
    }
    const sealed = sealSecret(params.clientSecret, keyMaterial, API_KEY_EXPORTABLE_SECRET_PURPOSE);
    await this.copies.upsertForKey(
      { apiKeyId: params.apiKeyId, projectId: params.projectId, sealed },
      transaction
    );
  }

  public removeForKeys(apiKeyIds: readonly string[], transaction?: Transaction): Promise<number> {
    return this.copies.deleteForKeys(apiKeyIds, transaction);
  }

  public removeForProject(projectId: string, transaction?: Transaction): Promise<number> {
    return this.copies.deleteForProject(projectId, transaction);
  }
}
