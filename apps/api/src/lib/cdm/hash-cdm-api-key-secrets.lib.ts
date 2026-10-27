import { AsyncLocalStorage } from 'node:async_hooks';

import { hashSecretAsync } from '@/lib/token.lib';

import type { CdmDocumentInput } from './cdm-document.schemas';

const preparedHashes = new AsyncLocalStorage<readonly string[]>();

/** Document-order BYOK secrets (`users[].apiKeys[]`), matching expand. */
function collectCdmDocumentApiKeySecrets(input: CdmDocumentInput): string[] {
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
 * Hash BYOK secrets before the caller opens the import TX, then run `fn`
 * with those hashes visible to {@link peekPreparedCdmApiKeyHashes}.
 */
export async function withHashedCdmApiKeySecrets<T>(
  input: CdmDocumentInput,
  fn: () => Promise<T>
): Promise<T> {
  const hashes = await hashCdmDocumentApiKeySecrets(input);
  return preparedHashes.run(hashes, fn);
}

export function peekPreparedCdmApiKeyHashes(): readonly string[] | undefined {
  return preparedHashes.getStore();
}
