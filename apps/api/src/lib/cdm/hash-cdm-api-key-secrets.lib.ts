import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

import { CdmModeStrategy } from '@grantjs/schema';

import { config } from '@/config';
import { hashSecret, hashSecretAsync } from '@/lib/token.lib';

import {
  type CdmDocumentApiKeyForClassify,
  type CdmExistingApiKeyFingerprint,
  classifyCdmApiKeyReplace,
} from './cdm-api-key-fingerprint.lib';
import type { CdmDocumentInput } from './cdm-document.schemas';

type PreparedCdmApiKeyHashStore = {
  documentOrder?: readonly string[];
  byClassifyKey: ReadonlyMap<string, string>;
};

const preparedHashes = new AsyncLocalStorage<PreparedCdmApiKeyHashStore>();

export type CdmApiKeyHashPrep = {
  secretCount: number;
  hashPrepSeconds: number;
};

export type WithHashedCdmApiKeySecretsOptions = {
  strategy?: CdmModeStrategy | string | null;
  existing?: readonly CdmExistingApiKeyFingerprint[];
  hmacSecret?: string;
};

/** Document-order BYOK secrets (`users[].apiKeys[]`), matching expand. */
export function collectCdmDocumentApiKeySecrets(input: CdmDocumentInput): string[] {
  return collectCdmDocumentApiKeys(input).map((row) => row.secret);
}

function collectCdmDocumentApiKeys(input: CdmDocumentInput): CdmDocumentApiKeyForClassify[] {
  const keys: CdmDocumentApiKeyForClassify[] = [];
  let documentIndex = 0;
  for (const user of input.users ?? []) {
    for (const key of user.apiKeys ?? []) {
      const secret = key.clientSecret?.trim() ?? '';
      if (!secret) {
        continue;
      }
      const externalKey = key.key?.trim() ? key.key.trim() : null;
      keys.push({
        classifyKey: externalKey ?? `__anon:${documentIndex}`,
        externalKey,
        secret,
        documentIndex,
      });
      documentIndex += 1;
    }
  }
  return keys;
}

async function hashCdmDocumentApiKeySecrets(input: CdmDocumentInput): Promise<string[]> {
  const secrets = collectCdmDocumentApiKeySecrets(input);
  return Promise.all(secrets.map((secret) => hashSecretAsync(secret)));
}

/**
 * One-thread bcrypt-10 of the given secrets (`hashSecret` / `hashSync`).
 * Used by the measure harness so a multi-core `Promise.all` is not mistaken
 * for Lambda's ~1 vCPU. Does not return or log hashes.
 */
export function hashCdmApiKeySecretsSerially(secrets: readonly string[]): CdmApiKeyHashPrep {
  const started = performance.now();
  for (const secret of secrets) {
    hashSecret(secret);
  }
  return {
    secretCount: secrets.length,
    hashPrepSeconds: (performance.now() - started) / 1000,
  };
}

/**
 * Hash BYOK secrets before the caller opens the import TX, then run `fn`
 * with those hashes visible to {@link peekPreparedCdmApiKeyHashes}.
 *
 * On replace, classify by `externalKey` + HMAC first and hash only create +
 * rotate. `onHashPrep` receives duration and count only — never secrets,
 * hashes, or fingerprints.
 */
export async function withHashedCdmApiKeySecrets<T>(
  input: CdmDocumentInput,
  fn: () => Promise<T>,
  onHashPrep?: (prep: CdmApiKeyHashPrep) => void,
  options?: WithHashedCdmApiKeySecretsOptions
): Promise<T> {
  const started = performance.now();
  const strategy = options?.strategy;
  const isReplace = strategy === CdmModeStrategy.Replace || strategy === 'replace';

  if (isReplace) {
    const documentKeys = collectCdmDocumentApiKeys(input);
    const classified = classifyCdmApiKeyReplace(
      documentKeys,
      options?.existing ?? [],
      options?.hmacSecret ?? config.cdm.apiKeyFingerprintHmacSecret
    );
    const toHash = [
      ...classified.create.map((row) => row.document),
      ...classified.rotate.map((row) => row.document),
    ];
    const hashes = await Promise.all(toHash.map((row) => hashSecretAsync(row.secret)));
    const byClassifyKey = new Map<string, string>();
    for (const [index, row] of toHash.entries()) {
      byClassifyKey.set(row.classifyKey, hashes[index]!);
    }
    onHashPrep?.({
      secretCount: hashes.length,
      hashPrepSeconds: (performance.now() - started) / 1000,
    });
    return preparedHashes.run({ byClassifyKey }, fn);
  }

  const hashes = await hashCdmDocumentApiKeySecrets(input);
  const documentKeys = collectCdmDocumentApiKeys(input);
  const byClassifyKey = new Map<string, string>();
  for (const [index, row] of documentKeys.entries()) {
    byClassifyKey.set(row.classifyKey, hashes[index]!);
  }
  onHashPrep?.({
    secretCount: hashes.length,
    hashPrepSeconds: (performance.now() - started) / 1000,
  });
  return preparedHashes.run({ documentOrder: hashes, byClassifyKey }, fn);
}

export function peekPreparedCdmApiKeyHashes(): readonly string[] | undefined {
  return preparedHashes.getStore()?.documentOrder;
}

export function peekPreparedCdmApiKeyHashByClassifyKey(classifyKey: string): string | undefined {
  return preparedHashes.getStore()?.byClassifyKey.get(classifyKey);
}
