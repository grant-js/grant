import { CdmFindBy, CdmModeStrategy } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import {
  peekPreparedCdmApiKeyHashes,
  withHashedCdmApiKeySecrets,
} from '@/lib/cdm/hash-cdm-api-key-secrets.lib';
import { verifySecret } from '@/lib/token.lib';

const secretA = 'a'.repeat(32);
const secretB = 'b'.repeat(32);

function documentWithKeys(): CdmDocumentInput {
  return {
    version: 1,
    mode: { strategy: CdmModeStrategy.Merge },
    roles: [],
    users: [
      {
        key: { value: 'u1', findBy: CdmFindBy.Key },
        name: 'Ada',
        apiKeys: [{ clientSecret: secretA }, { clientSecret: secretB }],
      },
    ],
  };
}

describe('hash-cdm-api-key-secrets', () => {
  it('hashes before the wrapped function and exposes bcrypt hashes to apply', async () => {
    const input = documentWithKeys();
    await withHashedCdmApiKeySecrets(input, async () => {
      const hashes = peekPreparedCdmApiKeyHashes();
      expect(hashes).toHaveLength(2);
      expect(hashes?.[0]).toMatch(/^\$2[aby]\$/);
      expect(hashes?.[0]).not.toBe(secretA);
      expect(verifySecret(secretA, hashes![0]!)).toBe(true);
      expect(verifySecret(secretB, hashes![1]!)).toBe(true);
    });
    expect(peekPreparedCdmApiKeyHashes()).toBeUndefined();
  });
});
