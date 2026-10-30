import { describe, expect, it } from 'vitest';

import {
  CDM_API_KEY_SECRET_FINGERPRINT_KEY,
  CDM_IMPORT_METADATA_KEY,
} from '@/constants/cdm-import.constants';
import {
  cdmApiKeyFingerprintsEqual,
  type CdmDocumentApiKeyForClassify,
  type CdmExistingApiKeyFingerprint,
  classifyCdmApiKeyReplace,
  fingerprintCdmApiKeySecret,
  readCdmApiKeySecretFingerprint,
  withCdmApiKeySecretFingerprint,
} from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import { hmacSha256Hex } from '@/lib/token.lib';

const HMAC = 'unit-test-cdm-api-key-fingerprint';
const OTHER_HMAC = 'rotated-hmac-key';
const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(32);

function documentKey(
  externalKey: string | null,
  secret: string,
  documentIndex = 0
): CdmDocumentApiKeyForClassify {
  return {
    classifyKey: externalKey ?? `__anon:${documentIndex}`,
    externalKey,
    secret,
    documentIndex,
  };
}

function existingKey(
  overrides: Partial<CdmExistingApiKeyFingerprint> & { externalKey: string | null }
): CdmExistingApiKeyFingerprint {
  return {
    apiKeyId: overrides.apiKeyId ?? '40000000-0000-4000-8000-000000000001',
    userId: overrides.userId ?? '30000000-0000-4000-8000-000000000099',
    clientId: overrides.clientId ?? 'cid-1',
    metadata: overrides.metadata ?? null,
    secretFingerprint: overrides.secretFingerprint ?? null,
    clientSecretFingerprint: overrides.clientSecretFingerprint ?? null,
    externalKey: overrides.externalKey,
  };
}

describe('cdm-api-key-fingerprint', () => {
  it('HMACs the secret and compares timing-safe', () => {
    const digest = fingerprintCdmApiKeySecret(SECRET_A, HMAC);
    expect(digest).toBe(hmacSha256Hex(HMAC, SECRET_A));
    expect(digest).toHaveLength(64);
    expect(digest).not.toBe(SECRET_A);
    expect(cdmApiKeyFingerprintsEqual(digest, digest)).toBe(true);
    expect(cdmApiKeyFingerprintsEqual(digest, fingerprintCdmApiKeySecret(SECRET_B, HMAC))).toBe(
      false
    );
    expect(cdmApiKeyFingerprintsEqual(null, digest)).toBe(false);
    expect(cdmApiKeyFingerprintsEqual('', digest)).toBe(false);
  });

  it('classifies keep / rotate / create / delete by externalKey', () => {
    const keepFingerprint = fingerprintCdmApiKeySecret(SECRET_A, HMAC);
    const result = classifyCdmApiKeyReplace(
      [
        documentKey('keep-key', SECRET_A, 0),
        documentKey('rotate-key', SECRET_B, 1),
        documentKey('new-key', SECRET_A, 2),
      ],
      [
        existingKey({
          apiKeyId: 'keep-id',
          externalKey: 'keep-key',
          secretFingerprint: keepFingerprint,
        }),
        existingKey({
          apiKeyId: 'rotate-id',
          externalKey: 'rotate-key',
          secretFingerprint: fingerprintCdmApiKeySecret(SECRET_A, HMAC),
        }),
        existingKey({ apiKeyId: 'gone-id', externalKey: 'gone-key', secretFingerprint: 'abc' }),
      ],
      HMAC
    );

    expect(result.keep.map((row) => row.existing.apiKeyId)).toEqual(['keep-id']);
    expect(result.rotate.map((row) => row.existing.apiKeyId)).toEqual(['rotate-id']);
    expect(result.create.map((row) => row.document.externalKey)).toEqual(['new-key']);
    expect(result.delete.map((row) => row.apiKeyId)).toEqual(['gone-id']);
  });

  it('treats a missing fingerprint as rotate, not keep', () => {
    const result = classifyCdmApiKeyReplace(
      [documentKey('k1', SECRET_A)],
      [existingKey({ apiKeyId: 'id-1', externalKey: 'k1', secretFingerprint: null })],
      HMAC
    );
    expect(result.rotate).toHaveLength(1);
    expect(result.keep).toHaveLength(0);
  });

  it('does not keep or rotate keys without externalKey', () => {
    const result = classifyCdmApiKeyReplace(
      [documentKey(null, SECRET_A, 0)],
      [
        existingKey({
          apiKeyId: 'orphan',
          externalKey: null,
          secretFingerprint: fingerprintCdmApiKeySecret(SECRET_A, HMAC),
        }),
      ],
      HMAC
    );
    expect(result.create).toHaveLength(1);
    expect(result.delete.map((row) => row.apiKeyId)).toEqual(['orphan']);
    expect(result.keep).toHaveLength(0);
    expect(result.rotate).toHaveLength(0);
  });

  it('rotates every key when the HMAC secret changes', () => {
    const stored = fingerprintCdmApiKeySecret(SECRET_A, HMAC);
    const result = classifyCdmApiKeyReplace(
      [documentKey('k1', SECRET_A)],
      [existingKey({ apiKeyId: 'id-1', externalKey: 'k1', secretFingerprint: stored })],
      OTHER_HMAC
    );
    expect(result.rotate).toHaveLength(1);
    expect(result.keep).toHaveLength(0);
  });

  it('fails closed when the same externalKey exists on more than one CDM key', () => {
    expect(() =>
      classifyCdmApiKeyReplace(
        [documentKey('k1', SECRET_A)],
        [
          existingKey({
            apiKeyId: 'id-a',
            userId: 'user-a',
            externalKey: 'k1',
            secretFingerprint: fingerprintCdmApiKeySecret(SECRET_A, HMAC),
          }),
          existingKey({
            apiKeyId: 'id-b',
            userId: 'user-b',
            externalKey: 'k1',
            secretFingerprint: fingerprintCdmApiKeySecret(SECRET_B, HMAC),
          }),
        ],
        HMAC
      )
    ).toThrow(/multiple existing CDM keys for externalKey 'k1'/);
  });

  it('fail-safes to rotate when the HMAC secret is empty', () => {
    const result = classifyCdmApiKeyReplace(
      [documentKey('k1', SECRET_A)],
      [existingKey({ apiKeyId: 'id-1', externalKey: 'k1', secretFingerprint: 'deadbeef' })],
      ''
    );
    expect(fingerprintCdmApiKeySecret(SECRET_A, '')).toBe('');
    expect(result.rotate).toHaveLength(1);
    expect(result.keep).toHaveLength(0);
  });

  it('reads and writes the fingerprint only under cdmImport', () => {
    const metadata = withCdmApiKeySecretFingerprint(
      {
        [CDM_IMPORT_METADATA_KEY]: { projectId: 'p', kind: 'projectUserApiKey', externalKey: 'k1' },
      },
      'abc123'
    );
    expect(readCdmApiKeySecretFingerprint(metadata)).toBe('abc123');
    expect(
      (metadata[CDM_IMPORT_METADATA_KEY] as Record<string, unknown>)[
        CDM_API_KEY_SECRET_FINGERPRINT_KEY
      ]
    ).toBe('abc123');
  });
});
