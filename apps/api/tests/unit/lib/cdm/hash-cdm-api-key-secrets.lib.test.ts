import { CdmFindBy, CdmModeStrategy } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { fingerprintCdmApiKeySecret } from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import {
  collectCdmDocumentApiKeySecrets,
  hashCdmApiKeySecretsSerially,
  peekPreparedCdmApiKeyHashByClassifyKey,
  peekPreparedCdmApiKeyHashes,
  withHashedCdmApiKeySecrets,
} from '@/lib/cdm/hash-cdm-api-key-secrets.lib';
import * as tokenLib from '@/lib/token.lib';
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

  it('reports hash-prep count and seconds without exposing secrets', async () => {
    const input = documentWithKeys();
    const events: Array<{ secretCount: number; hashPrepSeconds: number }> = [];
    await withHashedCdmApiKeySecrets(
      input,
      async () => undefined,
      (prep) => {
        events.push(prep);
      }
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.secretCount).toBe(2);
    expect(events[0]?.hashPrepSeconds).toBeGreaterThan(0);
    expect(JSON.stringify(events)).not.toContain(secretA);
    expect(JSON.stringify(events)).not.toContain(secretB);
  });

  it('serial hash-prep times the same secret count on one thread', () => {
    const secrets = collectCdmDocumentApiKeySecrets(documentWithKeys());
    expect(secrets).toEqual([secretA, secretB]);
    const prep = hashCdmApiKeySecretsSerially(secrets);
    expect(prep.secretCount).toBe(2);
    expect(prep.hashPrepSeconds).toBeGreaterThan(0);
    expect(JSON.stringify(prep)).not.toContain(secretA);
  });

  it('replace hash-prep hashes zero secrets when fingerprints match', async () => {
    const hmac = 'hash-prep-test-hmac';
    const input = documentWithKeyedSecrets();
    const hashSpy = vi.spyOn(tokenLib, 'hashSecretAsync');
    await withHashedCdmApiKeySecrets(
      input,
      async () => {
        expect(peekPreparedCdmApiKeyHashes()).toBeUndefined();
        expect(peekPreparedCdmApiKeyHashByClassifyKey('k-a')).toBeUndefined();
      },
      (prep) => {
        expect(prep.secretCount).toBe(0);
      },
      {
        strategy: CdmModeStrategy.Replace,
        hmacSecret: hmac,
        existing: [
          {
            apiKeyId: '1',
            userId: 'u',
            clientId: 'c1',
            externalKey: 'k-a',
            secretFingerprint: fingerprintCdmApiKeySecret(secretA, hmac),
            metadata: {},
          },
          {
            apiKeyId: '2',
            userId: 'u',
            clientId: 'c2',
            externalKey: 'k-b',
            secretFingerprint: fingerprintCdmApiKeySecret(secretB, hmac),
            metadata: {},
          },
        ],
      }
    );
    expect(hashSpy).not.toHaveBeenCalled();
    hashSpy.mockRestore();
  });

  it('replace hash-prep hashes only the rotated secret', async () => {
    const hmac = 'hash-prep-test-hmac';
    const input = documentWithKeyedSecrets();
    const hashSpy = vi.spyOn(tokenLib, 'hashSecretAsync');
    await withHashedCdmApiKeySecrets(
      input,
      async () => {
        expect(peekPreparedCdmApiKeyHashByClassifyKey('k-b')).toMatch(/^\$2[aby]\$/);
        expect(peekPreparedCdmApiKeyHashByClassifyKey('k-a')).toBeUndefined();
      },
      (prep) => {
        expect(prep.secretCount).toBe(1);
      },
      {
        strategy: CdmModeStrategy.Replace,
        hmacSecret: hmac,
        existing: [
          {
            apiKeyId: '1',
            userId: 'u',
            clientId: 'c1',
            externalKey: 'k-a',
            secretFingerprint: fingerprintCdmApiKeySecret(secretA, hmac),
            metadata: {},
          },
          {
            apiKeyId: '2',
            userId: 'u',
            clientId: 'c2',
            externalKey: 'k-b',
            secretFingerprint: fingerprintCdmApiKeySecret(secretA, hmac),
            metadata: {},
          },
        ],
      }
    );
    expect(hashSpy).toHaveBeenCalledTimes(1);
    expect(hashSpy).toHaveBeenCalledWith(secretB);
    hashSpy.mockRestore();
  });
});

function documentWithKeyedSecrets(): CdmDocumentInput {
  return {
    version: 1,
    mode: { strategy: CdmModeStrategy.Replace, confirmDestructive: true },
    roles: [],
    users: [
      {
        key: { value: 'u1', findBy: CdmFindBy.Key },
        name: 'Ada',
        apiKeys: [
          { key: 'k-a', clientSecret: secretA },
          { key: 'k-b', clientSecret: secretB },
        ],
      },
    ],
  };
}
