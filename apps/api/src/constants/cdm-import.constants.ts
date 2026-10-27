import { ValidationError } from '@/lib/errors';

/** Metadata key for roles/groups created by project CDM import. */
export const CDM_IMPORT_METADATA_KEY = 'cdmImport' as const;

/**
 * HMAC-SHA256 hex of a BYOK secret, stored only under `metadata.cdmImport`.
 * Classification on replace — never a verifier, never exportable.
 */
export const CDM_API_KEY_SECRET_FINGERPRINT_KEY = 'secretFingerprint' as const;

/** Importer-owned payload merged under this key (never overwrites `cdmImport`). */
export const CDM_SOURCE_METADATA_KEY = 'cdmSource' as const;

/** The only password hash algorithm a CDM import accepts (ADR 0010). */
export const CDM_PASSWORD_ALGORITHM_BCRYPT = 'bcrypt' as const;

/**
 * Cost bounds for an imported bcrypt hash. 4 is bcrypt's own floor. 15 is a ceiling on
 * what a document can make every later sign-in cost, since `verifySecret` is a synchronous
 * compare on the event loop and the cost is read from the hash, not from configuration
 * (ADR 0010 § Security notes). Constants rather than env keys: this is a security limit
 * a reviewer should see change, not a deployment-sizing knob like `CDM_IMPORT_MAX_ENTITIES`.
 */
export const CDM_BCRYPT_MIN_COST = 4;
export const CDM_BCRYPT_MAX_COST = 15;

/** What `/payload` and a finished job's stored payload show in place of an imported hash. */
export const CDM_PASSWORD_HASH_REDACTED = '[redacted]' as const;

/**
 * When true on exported `resources[]` / `permissions[]` metadata, apply must
 * bind to existing catalog rows (`grantResourceId` / `grantPermissionId`) and
 * must not create new resource/permission entities.
 */
export const CDM_EXPORT_CATALOG_SNAPSHOT_KEY = 'cdmExportCatalogSnapshot' as const;

function readMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

/** True when persisted metadata marks a row as CDM-owned for this project and kind. */
export function isProjectCdmImportKind(
  metadata: Record<string, unknown>,
  projectId: string,
  kind: 'resource' | 'permission'
): boolean {
  const cdm = metadata[CDM_IMPORT_METADATA_KEY];
  if (cdm == null || typeof cdm !== 'object' || Array.isArray(cdm)) {
    return false;
  }
  const c = cdm as Record<string, unknown>;
  return c.projectId === projectId && c.kind === kind;
}

/** True when export metadata requests catalog bind-only apply (no entity create). */
export function isCdmCatalogSnapshotMetadata(metadata: unknown): boolean {
  const m = readMetadataRecord(metadata);
  if (!m) return false;
  if (m[CDM_EXPORT_CATALOG_SNAPSHOT_KEY] === true) return true;
  const src = m[CDM_SOURCE_METADATA_KEY];
  if (src != null && typeof src === 'object' && !Array.isArray(src)) {
    return (src as Record<string, unknown>)[CDM_EXPORT_CATALOG_SNAPSHOT_KEY] === true;
  }
  return false;
}

export function readGrantResourceIdFromCdmExportMetadata(metadata: unknown): string | null {
  return readGrantEntityIdFromCdmExportMetadata(metadata, 'grantResourceId');
}

export function readGrantPermissionIdFromCdmExportMetadata(metadata: unknown): string | null {
  return readGrantEntityIdFromCdmExportMetadata(metadata, 'grantPermissionId');
}

function readGrantEntityIdFromCdmExportMetadata(
  metadata: unknown,
  grantKey: 'grantResourceId' | 'grantPermissionId'
): string | null {
  const m = readMetadataRecord(metadata);
  if (!m) return null;
  const top = m[grantKey];
  if (typeof top === 'string' && top.trim() !== '') return top;
  const src = m[CDM_SOURCE_METADATA_KEY];
  if (src != null && typeof src === 'object' && !Array.isArray(src)) {
    const v = (src as Record<string, unknown>)[grantKey];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return null;
}

export type CdmImportMetadata = {
  projectId: string;
  kind:
    | 'role'
    | 'group'
    | 'directRole'
    | 'projectUserApiKey'
    | 'tag'
    | 'resource'
    | 'permission'
    | 'user';
  externalKey?: string;
  secretFingerprint?: string;
};

export function buildCdmImportMetadata(
  projectId: string,
  kind: CdmImportMetadata['kind'],
  externalKey?: string,
  secretFingerprint?: string
): Record<string, unknown> {
  const payload: CdmImportMetadata = { projectId, kind };
  if (externalKey) {
    payload.externalKey = externalKey;
  }
  if (secretFingerprint) {
    payload.secretFingerprint = secretFingerprint;
  }
  return { [CDM_IMPORT_METADATA_KEY]: payload };
}

/**
 * Merges importer JSON into Grant entity metadata under {@link CDM_SOURCE_METADATA_KEY}.
 * Shallow-merges into any existing `cdmSource` object. Preserves `cdmImport` from `base`.
 */
export function mergeCdmImporterMetadata(
  base: Record<string, unknown>,
  importerRaw: unknown
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  if (importerRaw == null) {
    return out;
  }
  if (typeof importerRaw !== 'object' || Array.isArray(importerRaw)) {
    throw new ValidationError('CDM metadata must be a JSON object');
  }
  const importer = importerRaw as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(importer, CDM_IMPORT_METADATA_KEY)) {
    throw new ValidationError(
      `CDM metadata must not include reserved top-level key "${CDM_IMPORT_METADATA_KEY}"`
    );
  }
  if (Object.prototype.hasOwnProperty.call(importer, CDM_API_KEY_SECRET_FINGERPRINT_KEY)) {
    throw new ValidationError(
      `CDM metadata must not include reserved top-level key "${CDM_API_KEY_SECRET_FINGERPRINT_KEY}"`
    );
  }
  const prev = out[CDM_SOURCE_METADATA_KEY];
  const prevObj =
    prev != null && typeof prev === 'object' && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  out[CDM_SOURCE_METADATA_KEY] = { ...prevObj, ...importer };
  return out;
}

/**
 * Builds the flat `userAssignments[].metadata` object for CDM export from
 * persisted `project_users.metadata`.
 *
 * - Includes every key stored under `cdmSource` (importer history from CDM
 *   import), minus any nested `cdmImport` key.
 * - Includes any other top-level keys (e.g. from `updateProjectUserMetadata`)
 *   so API-written metadata is not dropped. Top-level keys win on collision
 *   with `cdmSource` keys.
 * - Omits `cdmImport` and the `cdmSource` container so re-import via
 *   {@link mergeCdmImporterMetadata} round-trips.
 */
export function extractProjectUserMetadataForCdmExport(
  metadata: Record<string, unknown>
): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};

  const source = metadata[CDM_SOURCE_METADATA_KEY];
  if (source != null && typeof source === 'object' && !Array.isArray(source)) {
    for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
      if (k === CDM_IMPORT_METADATA_KEY || k === CDM_API_KEY_SECRET_FINGERPRINT_KEY) continue;
      out[k] = v;
    }
  }

  for (const [k, v] of Object.entries(metadata)) {
    if (
      k === CDM_IMPORT_METADATA_KEY ||
      k === CDM_SOURCE_METADATA_KEY ||
      k === CDM_API_KEY_SECRET_FINGERPRINT_KEY
    ) {
      continue;
    }
    out[k] = v;
  }

  return Object.keys(out).length > 0 ? out : null;
}
