/**
 * API-key-domain service port interfaces.
 * Covers: ApiKey, SigningKey.
 */
import type { SelectedFields } from '../repositories/common';
import type {
  ApiKey,
  ApiKeyPage,
  CreateApiKeyInput,
  CreateApiKeyResult,
  ExchangeApiKeyInput,
  QueryApiKeysArgs,
  Scope,
  SigningKey,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// Shared helper types
// ---------------------------------------------------------------------------

export interface SigningKeyResult {
  kid: string;
  privateKeyPem: string;
}

interface ExchangeTokenResult {
  accessToken: string;
  expiresIn: number;
}

// ---------------------------------------------------------------------------
// IApiKeyService
// ---------------------------------------------------------------------------

export interface IApiKeyService {
  createApiKey(
    params: Omit<CreateApiKeyInput, 'scope'>,
    transaction?: unknown
  ): Promise<CreateApiKeyResult>;

  getApiKeys(
    params: Omit<QueryApiKeysArgs, 'scope'> & SelectedFields<ApiKey>,
    transaction?: unknown
  ): Promise<ApiKeyPage>;

  exchangeApiKeyForToken(
    params: ExchangeApiKeyInput,
    transaction?: unknown
  ): Promise<ExchangeTokenResult>;

  revokeApiKey(params: { id: string }, transaction?: unknown): Promise<ApiKey>;

  deleteApiKey(
    params: { id: string; hardDelete?: boolean },
    transaction?: unknown
  ): Promise<ApiKey>;
}

// ---------------------------------------------------------------------------
// ISigningKeyService
// ---------------------------------------------------------------------------

export interface ISigningKeyService {
  getOrCreateForScope(scope: Scope, transaction?: unknown): Promise<SigningKeyResult>;

  getPublicKeyPemByKid(kid: string, transaction?: unknown): Promise<string | null>;

  getActivePublicKeys(transaction?: unknown): Promise<Array<{ kid: string; publicKeyPem: string }>>;

  getPublicKeysForJwks(
    retentionCutoff: Date,
    transaction?: unknown
  ): Promise<Array<{ kid: string; publicKeyPem: string }>>;

  getPublicKeysForJwksByScope(
    scopeTenant: string,
    scopeId: string,
    retentionCutoff: Date,
    transaction?: unknown
  ): Promise<Array<{ kid: string; publicKeyPem: string }>>;

  listByScope(
    scope: Scope,
    options?: { limit?: number },
    transaction?: unknown
  ): Promise<SigningKey[]>;

  rotateForScope(scope: Scope, transaction?: unknown): Promise<SigningKey>;
}
