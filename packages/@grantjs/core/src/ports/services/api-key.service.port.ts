/**
 * API-key-domain service port interfaces.
 * Covers: ApiKey, SigningKey.
 */
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

import type { OptionalListScope, SelectedFields } from '../repositories/common';

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
  /**
   * `owner` names the project user the key is about to be linked to; it only decides which
   * user and project the `api_key.created` event names (no API field, never stored here).
   */
  createApiKey(
    params: Omit<CreateApiKeyInput, 'scope'> & { owner?: { projectId: string; userId: string } },
    transaction?: unknown
  ): Promise<CreateApiKeyResult>;

  /**
   * Create an API key with an operator-supplied plaintext secret (CDM BYOK).
   * Optional `clientId` restores a prior export's public id when still unused.
   */
  createApiKeyForCdmImport(
    params: {
      clientSecret: string;
      clientId?: string | null;
      scope?: Scope | null;
      name?: string | null;
      description?: string | null;
      expiresAt?: Date | null;
    },
    transaction?: unknown
  ): Promise<CreateApiKeyResult>;

  /**
   * Import-only: insert already-hashed BYOK secrets in one write.
   * HTTP `createApiKey` stays sequential and still hashes inside its own path.
   * `clientSecretFingerprint` is the SHA-256 of the plaintext the importer supplied, `null`
   * (or absent) when it supplied only a hash. No encrypted copy is ever written here.
   */
  createApiKeysForCdmImport(
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
    transaction?: unknown
  ): Promise<Array<{ id: string; clientId: string }>>;

  /**
   * Import-only replace teardown: hard-delete CDM API keys in one write.
   */
  deleteApiKeysForCdmImport(
    params: { ids: readonly string[] },
    transaction?: unknown
  ): Promise<void>;

  /**
   * Import-only replace rotate: write an already-hashed BYOK secret onto existing
   * keys (preserves `api_keys.id` / `clientId`). HTTP `rotateApiKey` still mints
   * a new secret. The new hash replaces the fingerprint (`null` when the importer supplied
   * only a hash) and any encrypted copy is deleted: the importing system holds the plaintext,
   * Grant does not, so a copy of the previous secret must not outlive its hash.
   */
  rotateApiKeysForCdmImport(
    params: {
      keys: readonly {
        id: string;
        clientSecretHash: string;
        clientSecretFingerprint?: string | null;
      }[];
    },
    transaction?: unknown
  ): Promise<void>;

  /**
   * Import-only replace keep: fill the fingerprint of keys the import leaves unchanged and
   * that have none yet (the import holds the plaintext, and the key's secret is the one the
   * document supplies). A key that already has a fingerprint is not touched.
   */
  setMissingClientSecretFingerprintsForCdmImport(
    params: { keys: readonly { id: string; clientSecretFingerprint: string }[] },
    transaction?: unknown
  ): Promise<void>;

  getApiKeys(
    params: Omit<QueryApiKeysArgs, 'scope'> & OptionalListScope & SelectedFields<ApiKey>,
    transaction?: unknown
  ): Promise<ApiKeyPage>;

  exchangeApiKeyForToken(
    params: ExchangeApiKeyInput,
    transaction?: unknown,
    issuerBaseUrl?: string
  ): Promise<ExchangeTokenResult>;

  revokeApiKey(params: { id: string }, transaction?: unknown): Promise<ApiKey>;

  rotateApiKey(params: { id: string }, transaction?: unknown): Promise<CreateApiKeyResult>;

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
