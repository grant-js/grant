import {
  CDM_API_KEY_SECRET_FINGERPRINT_KEY,
  CDM_IMPORT_METADATA_KEY,
} from '@/constants/cdm-import.constants';
import { hmacSha256Hex, tokenHashesEqual } from '@/lib/token.lib';

export type CdmExistingApiKeyFingerprint = {
  apiKeyId: string;
  userId: string;
  clientId: string;
  externalKey: string | null;
  secretFingerprint: string | null;
  metadata: Record<string, unknown> | null;
};

export type CdmDocumentApiKeyForClassify = {
  classifyKey: string;
  externalKey: string | null;
  secret: string;
  documentIndex: number;
};

type CdmApiKeyKeep = {
  document: CdmDocumentApiKeyForClassify;
  existing: CdmExistingApiKeyFingerprint;
};

type CdmApiKeyRotate = {
  document: CdmDocumentApiKeyForClassify;
  existing: CdmExistingApiKeyFingerprint;
};

type CdmApiKeyCreate = {
  document: CdmDocumentApiKeyForClassify;
};

export type CdmApiKeyClassifyResult = {
  keep: CdmApiKeyKeep[];
  rotate: CdmApiKeyRotate[];
  create: CdmApiKeyCreate[];
  delete: CdmExistingApiKeyFingerprint[];
};

export function fingerprintCdmApiKeySecret(secret: string, hmacSecret: string): string {
  return hmacSha256Hex(hmacSecret, secret);
}

export function cdmApiKeyFingerprintsEqual(
  stored: string | null | undefined,
  computed: string
): boolean {
  if (!stored || !computed) {
    return false;
  }
  return tokenHashesEqual(stored, computed);
}

export function readCdmApiKeySecretFingerprint(metadata: unknown): string | null {
  const cdm = readCdmImportBlock(metadata);
  const value = cdm?.[CDM_API_KEY_SECRET_FINGERPRINT_KEY];
  return typeof value === 'string' && value !== '' ? value : null;
}

export function readCdmApiKeyExternalKey(metadata: unknown): string | null {
  const cdm = readCdmImportBlock(metadata);
  const value = cdm?.externalKey;
  return typeof value === 'string' && value !== '' ? value : null;
}

export function withCdmApiKeySecretFingerprint(
  metadata: Record<string, unknown>,
  secretFingerprint: string
): Record<string, unknown> {
  const current = metadata[CDM_IMPORT_METADATA_KEY];
  const block =
    current != null && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  if (secretFingerprint) {
    block[CDM_API_KEY_SECRET_FINGERPRINT_KEY] = secretFingerprint;
  } else {
    delete block[CDM_API_KEY_SECRET_FINGERPRINT_KEY];
  }
  return { ...metadata, [CDM_IMPORT_METADATA_KEY]: block };
}

/**
 * Replace classify by importer `externalKey` + server HMAC of the BYOK secret.
 * Keys without `externalKey` never keep/rotate. A missing HMAC secret or stored
 * fingerprint is a miss (rotate / create), not keep.
 */
export function classifyCdmApiKeyReplace(
  documentKeys: readonly CdmDocumentApiKeyForClassify[],
  existing: readonly CdmExistingApiKeyFingerprint[],
  hmacSecret: string
): CdmApiKeyClassifyResult {
  const keep: CdmApiKeyKeep[] = [];
  const rotate: CdmApiKeyRotate[] = [];
  const create: CdmApiKeyCreate[] = [];
  const toDelete: CdmExistingApiKeyFingerprint[] = [];

  const existingByKey = new Map<string, CdmExistingApiKeyFingerprint[]>();
  for (const row of existing) {
    const key = row.externalKey?.trim() ?? '';
    if (!key) {
      toDelete.push(row);
      continue;
    }
    const list = existingByKey.get(key) ?? [];
    list.push(row);
    existingByKey.set(key, list);
  }

  const seenExternalKeys = new Set<string>();
  for (const document of documentKeys) {
    const externalKey = document.externalKey?.trim() ?? '';
    if (!externalKey) {
      create.push({ document });
      continue;
    }
    seenExternalKeys.add(externalKey);
    const matches = existingByKey.get(externalKey) ?? [];
    const [primary, ...duplicates] = matches;
    for (const extra of duplicates) {
      toDelete.push(extra);
    }
    if (!primary) {
      create.push({ document });
      continue;
    }
    const computed = fingerprintCdmApiKeySecret(document.secret, hmacSecret);
    if (cdmApiKeyFingerprintsEqual(primary.secretFingerprint, computed)) {
      keep.push({ document, existing: primary });
    } else {
      rotate.push({ document, existing: primary });
    }
  }

  for (const [externalKey, rows] of existingByKey) {
    if (seenExternalKeys.has(externalKey)) {
      continue;
    }
    for (const row of rows) {
      toDelete.push(row);
    }
  }

  return { keep, rotate, create, delete: toDelete };
}

function readCdmImportBlock(metadata: unknown): Record<string, unknown> | null {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const cdm = (metadata as Record<string, unknown>)[CDM_IMPORT_METADATA_KEY];
  if (cdm == null || typeof cdm !== 'object' || Array.isArray(cdm)) {
    return null;
  }
  return cdm as Record<string, unknown>;
}
