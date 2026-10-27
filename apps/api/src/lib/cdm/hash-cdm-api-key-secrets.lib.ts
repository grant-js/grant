import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

import { hashSecret, hashSecretAsync } from '@/lib/token.lib';

import type { CdmDocumentInput } from './cdm-document.schemas';

const preparedHashes = new AsyncLocalStorage<readonly string[]>();

export type CdmApiKeyHashPrep = {
  secretCount: number;
  hashPrepSeconds: number;
};

/** Document-order BYOK secrets (`users[].apiKeys[]`), matching expand. */
export function collectCdmDocumentApiKeySecrets(input: CdmDocumentInput): string[] {
  const secrets: string[] = [];
  for (const user of input.users ?? []) {
    for (const key of user.apiKeys ?? []) {
      const secret = key.clientSecret?.trim() ?? '';
      if (secret) {
        secrets.push(secret);
      }
    }
  }
  return secrets;
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
 * `onHashPrep` receives duration and count only — never secrets or hashes.
 */
export async function withHashedCdmApiKeySecrets<T>(
  input: CdmDocumentInput,
  fn: () => Promise<T>,
  onHashPrep?: (prep: CdmApiKeyHashPrep) => void
): Promise<T> {
  const started = performance.now();
  const hashes = await hashCdmDocumentApiKeySecrets(input);
  onHashPrep?.({
    secretCount: hashes.length,
    hashPrepSeconds: (performance.now() - started) / 1000,
  });
  return preparedHashes.run(hashes, fn);
}

export function peekPreparedCdmApiKeyHashes(): readonly string[] | undefined {
  return preparedHashes.getStore();
}
