import type {
  ExportableApiKeySecretEntry,
  IApiKeyExportableSecretRepository,
  IApiKeyExportableSecretService,
  IProjectRepository,
  ISecretResolver,
} from '@grantjs/core';

import { ConfigurationError } from '@/lib/errors';
import {
  API_KEY_EXPORTABLE_SECRET_PURPOSE,
  sealSecret,
  unsealSecret,
} from '@/lib/sealed-secret.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

const ENCRYPTION_KEY_VARIABLE = 'API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY';

/**
 * The encrypted exportable copy of a project user's API-key secret, behind the project's
 * opt-in. This class seals and stores, and `readForExport` is the one place a copy is decrypted
 * (for the credential export, which is gated and audited by its caller). The key is resolved at
 * the point of use through `ISecretResolver` and is never logged, audited or put in an error;
 * neither is a decrypted secret.
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
    const keyMaterial = await this.requireKeyMaterial();
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

  public async readForExport(
    params: { projectId: string; userIds: readonly string[] },
    transaction?: Transaction
  ): Promise<ExportableApiKeySecretEntry[]> {
    const rows = await this.copies.findSealedForExport(params, transaction);

    // The key is needed only when a copy is to be opened, so keys without one are listed even
    // on an installation that has no encryption key configured.
    const keyMaterial = rows.some((row) => row.sealed !== null)
      ? await this.requireKeyMaterial()
      : null;

    return rows.map((row) => ({
      userId: row.userId,
      apiKeyId: row.apiKeyId,
      clientId: row.clientId,
      fingerprint: row.clientSecretFingerprint,
      secret:
        row.sealed !== null && keyMaterial !== null ? this.unseal(row.sealed, keyMaterial) : null,
    }));
  }

  private async requireKeyMaterial(): Promise<string> {
    const keyMaterial = await this.secrets.resolve(ENCRYPTION_KEY_VARIABLE);
    if (!keyMaterial) {
      throw new ConfigurationError(`${ENCRYPTION_KEY_VARIABLE} must be configured`);
    }
    return keyMaterial;
  }

  /** A failure names the variable, never the key material, the ciphertext or the original error. */
  private unseal(
    sealed: { encryptedSecret: string; secretIv: string; secretTag: string },
    keyMaterial: string
  ): string {
    try {
      return unsealSecret(sealed, keyMaterial, API_KEY_EXPORTABLE_SECRET_PURPOSE);
    } catch {
      throw new ConfigurationError(
        `Failed to decrypt an exportable API-key secret; check ${ENCRYPTION_KEY_VARIABLE}`
      );
    }
  }
}
