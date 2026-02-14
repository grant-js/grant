/**
 * API-key-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  ApiKey,
  ApiKeyPage,
  CreateApiKeyInput,
  QueryApiKeysArgs,
  SigningKey,
} from '@grantjs/schema';

export interface IApiKeyRepository {
  getApiKeys(
    params: Omit<QueryApiKeysArgs, 'scope'> & SelectedFields<ApiKey>,
    transaction?: unknown
  ): Promise<ApiKeyPage>;

  getApiKey(id: string, transaction?: unknown): Promise<ApiKey | null>;

  findByClientId(clientId: string, transaction?: unknown): Promise<ApiKey | null>;

  findActiveByClientId(clientId: string, transaction?: unknown): Promise<ApiKey | null>;

  getClientSecretHash(id: string, transaction?: unknown): Promise<string | null>;

  createApiKey(
    params: Omit<CreateApiKeyInput, 'scope'> & {
      clientId: string;
      clientSecretHash: string;
      createdBy: string;
    },
    transaction?: unknown
  ): Promise<ApiKey>;

  updateLastUsedAt(id: string, lastUsedAt: Date, transaction?: unknown): Promise<ApiKey>;

  revokeApiKey(id: string, revokedBy: string, transaction?: unknown): Promise<ApiKey>;

  softDeleteApiKey(id: string, transaction?: unknown): Promise<ApiKey>;

  hardDeleteApiKey(id: string, transaction?: unknown): Promise<ApiKey>;
}

/** Public-key subset returned by signing-key queries (kid + PEM). */
export interface SigningKeyPublic {
  kid: string;
  publicKeyPem: string;
}

export interface ISigningKeyRepository {
  getByScope(
    scopeTenant: string,
    scopeId: string,
    transaction?: unknown
  ): Promise<SigningKey | null>;

  getPublicKeyPemByKid(kid: string, transaction?: unknown): Promise<string | null>;

  getActivePublicKeys(transaction?: unknown): Promise<SigningKeyPublic[]>;

  getPublicKeysForJwks(retentionCutoff: Date, transaction?: unknown): Promise<SigningKeyPublic[]>;

  getPublicKeysForJwksByScope(
    scopeTenant: string,
    scopeId: string,
    retentionCutoff: Date,
    transaction?: unknown
  ): Promise<SigningKeyPublic[]>;

  listByScope(
    scopeTenant: string,
    scopeId: string,
    options?: { limit?: number },
    transaction?: unknown
  ): Promise<SigningKey[]>;

  createSigningKey(
    data: {
      kid: string;
      publicKeyPem: string;
      privateKeyPem: string;
      scopeTenant: string;
      scopeId: string;
      algorithm?: string;
      active?: boolean;
      rotatedAt?: Date | null;
    },
    transaction?: unknown
  ): Promise<SigningKey>;

  updateSigningKey(
    id: string,
    input: { active?: boolean; rotatedAt?: Date | null },
    transaction?: unknown
  ): Promise<SigningKey>;
}
