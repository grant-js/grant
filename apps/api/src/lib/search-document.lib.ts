import { CDM_IMPORT_METADATA_KEY, CDM_SOURCE_METADATA_KEY } from '@/constants/cdm-import.constants';

/** Importer-owned searchable payload key (also stored under cdmSource). */
export const CDM_SEARCHABLE_METADATA_KEY = 'searchable' as const;

type SearchDocumentEntityKind = 'user' | 'role' | 'group';

const DENYLISTED_METADATA_KEYS = new Set([
  'passwordHash',
  'clientSecret',
  'accessKeySecretReferenceId',
  'permissionJson',
  'permissions',
]);

const USER_ALLOWLIST_PATHS: readonly string[] = [
  `${CDM_SOURCE_METADATA_KEY}.legacy.email`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.phone`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.id`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.description`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.accessKeyId`,
  `${CDM_SOURCE_METADATA_KEY}.agent.name`,
  `${CDM_SOURCE_METADATA_KEY}.partner.name`,
  `${CDM_SOURCE_METADATA_KEY}.customer.email`,
  `${CDM_SOURCE_METADATA_KEY}.customer.firstName`,
  `${CDM_SOURCE_METADATA_KEY}.customer.lastName`,
  `${CDM_IMPORT_METADATA_KEY}.externalKey`,
  `${CDM_SOURCE_METADATA_KEY}.${CDM_SEARCHABLE_METADATA_KEY}`,
];

const ROLE_GROUP_ALLOWLIST_PATHS: readonly string[] = [
  `${CDM_SOURCE_METADATA_KEY}.legacy.id`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.partnerId`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.inferredRole`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.name`,
  `${CDM_SOURCE_METADATA_KEY}.legacy.source`,
  `${CDM_IMPORT_METADATA_KEY}.externalKey`,
  `${CDM_SOURCE_METADATA_KEY}.${CDM_SEARCHABLE_METADATA_KEY}`,
];

export interface BuildSearchDocumentParams {
  kind: SearchDocumentEntityKind;
  name?: string | null;
  description?: string | null;
  displayName?: string | null;
  globalUserName?: string | null;
  searchable?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

function readMetadataRecord(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  return raw as Record<string, unknown>;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function collectString(value: unknown, out: Set<string>): void {
  if (value == null) return;
  if (typeof value === 'string') {
    const normalized = normalizeToken(value);
    if (normalized.length > 0) out.add(normalized);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    out.add(normalizeToken(String(value)));
  }
}

function collectSearchableObject(
  searchable: Record<string, unknown> | null | undefined,
  out: Set<string>
): void {
  if (!searchable) return;
  for (const [key, value] of Object.entries(searchable)) {
    if (DENYLISTED_METADATA_KEYS.has(key)) continue;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        collectString(nested, out);
      }
      continue;
    }
    collectString(value, out);
  }
}

function readPath(root: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = root;
  for (const part of parts) {
    if (current == null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function collectAllowlistedMetadataPaths(
  metadata: Record<string, unknown>,
  paths: readonly string[],
  out: Set<string>
): void {
  for (const path of paths) {
    if (path.endsWith(`.${CDM_SEARCHABLE_METADATA_KEY}`)) {
      const searchable = readPath(metadata, path);
      if (searchable != null && typeof searchable === 'object' && !Array.isArray(searchable)) {
        collectSearchableObject(searchable as Record<string, unknown>, out);
      }
      continue;
    }
    const leafKey = path.split('.').pop() ?? path;
    if (DENYLISTED_METADATA_KEYS.has(leafKey)) continue;
    collectString(readPath(metadata, path), out);
  }
}

/**
 * Builds a normalized space-delimited search blob for list-view partial matching.
 * Combines explicit CDM searchable values, native identity fields, and allowlisted metadata paths.
 */
export function buildSearchDocument(params: BuildSearchDocumentParams): string {
  const tokens = new Set<string>();

  collectString(params.name, tokens);
  collectString(params.description, tokens);
  collectString(params.displayName, tokens);
  collectString(params.globalUserName, tokens);
  collectSearchableObject(params.searchable ?? undefined, tokens);

  const metadata = readMetadataRecord(params.metadata);
  if (metadata) {
    const paths = params.kind === 'user' ? USER_ALLOWLIST_PATHS : ROLE_GROUP_ALLOWLIST_PATHS;
    collectAllowlistedMetadataPaths(metadata, paths, tokens);
  }

  return [...tokens].join(' ');
}

export function mergeImporterMetadataWithSearchable(
  metadata: Record<string, unknown> | null | undefined,
  searchable: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (searchable == null || Object.keys(searchable).length === 0) {
    return metadata;
  }
  const base =
    metadata != null && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  return { ...base, [CDM_SEARCHABLE_METADATA_KEY]: searchable };
}

/** Reads persisted importer searchable from entity metadata for CDM export. */
export function extractCdmSearchableFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const source = metadata[CDM_SOURCE_METADATA_KEY];
  if (source == null || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  const searchable = (source as Record<string, unknown>)[CDM_SEARCHABLE_METADATA_KEY];
  if (searchable == null || typeof searchable !== 'object' || Array.isArray(searchable)) {
    return null;
  }
  return Object.keys(searchable).length > 0 ? (searchable as Record<string, unknown>) : null;
}

export function readCdmInputSearchable(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  return Object.keys(obj).length > 0 ? obj : null;
}
