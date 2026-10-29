import type { EventExternalKey } from '@grantjs/schema';

import { CDM_IMPORT_METADATA_KEY, CDM_SOURCE_METADATA_KEY } from '@/constants/cdm-import.constants';

/** A live project membership: the project and the membership row's metadata. */
export interface MembershipMetadata {
  projectId: string;
  metadata: unknown;
}

const MAX_EXTERNAL_KEY_LENGTH = 255;

/** The importer's own e-mail test (`user-provision.cdm-entity.ts`), widened by `isEmailShaped`. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** E-mail shaped: the importer's pattern, or any value containing `@`. Never emitted. */
function isEmailShaped(value: string): boolean {
  return EMAIL_SHAPE.test(value) || value.includes('@');
}

/**
 * A usable key: a string of 1 to 255 characters once trimmed that is not e-mail
 * shaped. A value that fails is skipped, never truncated or transformed.
 */
function toKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  if (key.length === 0 || key.length > MAX_EXTERNAL_KEY_LENGTH) return null;
  return isEmailShaped(key) ? null : key;
}

/** The legacy-system id the importer declares: `metadata.cdmSource.legacy.id`, nothing else of `cdmSource`. */
function readImporterLegacyId(metadata: Record<string, unknown>): string | null {
  const source = asRecord(metadata[CDM_SOURCE_METADATA_KEY]);
  const legacy = source ? asRecord(source.legacy) : null;
  return legacy ? toKey(legacy.id) : null;
}

/**
 * The key the metadata carries for `projectId`: the Grant-internal marker
 * (`metadata.cdmImport.externalKey`) when it is not e-mail shaped, else the importer's
 * `cdmSource.legacy.id`. A marker that names another project, or another kind, is ignored.
 * `trustImporterWithoutMarker` is for a membership row, which is already project-scoped.
 */
function readKey(
  metadata: unknown,
  projectId: string,
  trustImporterWithoutMarker: boolean
): string | null {
  const record = asRecord(metadata);
  if (!record) return null;

  const marker = asRecord(record[CDM_IMPORT_METADATA_KEY]);
  const markerNamesProject = marker?.projectId === projectId && marker.kind === 'user';
  const fromMarker = markerNamesProject ? toKey(marker?.externalKey) : null;
  if (fromMarker) return fromMarker;

  if (!trustImporterWithoutMarker && !markerNamesProject) return null;
  return readImporterLegacyId(record);
}

/**
 * The only reader of `cdmImport` and `cdmSource.legacy.id` for events: the import keys
 * of a user, one entry per project the user is a member of (`memberships`).
 *
 * For a project: the membership row's key wins; when the row has none, the global
 * user's, but only if the global user's marker names that project (a user carries one
 * marker, so it names one project). Nothing but `projectId` and `externalKey` leaves
 * this function: no e-mail (a value that looks like one is skipped), no name, no hash,
 * and nothing else from `cdmSource`. Empty for a Grant-native user.
 */
export function resolveExternalKeys(
  userMetadata: unknown,
  memberships: readonly MembershipMetadata[]
): EventExternalKey[] {
  const entries: EventExternalKey[] = [];
  const seen = new Set<string>();
  for (const { projectId, metadata } of memberships) {
    if (typeof projectId !== 'string' || projectId === '' || seen.has(projectId)) continue;
    seen.add(projectId);
    const externalKey =
      readKey(metadata, projectId, true) ?? readKey(userMetadata, projectId, false);
    if (externalKey) entries.push({ projectId, externalKey });
  }
  return entries;
}
