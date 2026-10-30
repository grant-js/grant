/**
 * The three decisions behind a deletion tombstone, as small pure functions so each branch
 * has a named test and a reviewer can read the whole policy without a database:
 *
 * - which import keys a self-deleted user leaves behind (`resolveTombstoneKeys`);
 * - whether and what to write on a deletion (`decideTombstoneWrite`);
 * - whether an import creates the identity a document names (`decideUserCreation`).
 *
 * Keys can be e-mail addresses. Nothing here returns, logs or embeds one in a message: the
 * only outputs are fingerprints, project ids, counts and reason codes.
 */
import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';
import { readMarkerExternalKey } from '@/lib/events/event-external-keys.lib';

import { fingerprintCdmExternalKey } from './cdm-api-key-fingerprint.lib';

/** The only marker kind tombstoned today. */
export const CDM_TOMBSTONE_KIND_USER = 'user';

export interface TombstoneMembership {
  projectId: string;
  /** The live membership row's metadata. */
  metadata: unknown;
}

/** One project's import key for a user, exactly as the marker stores it (an address included). */
export interface TombstoneKey {
  projectId: string;
  externalKey: string;
}

/**
 * The import keys a user leaves behind, one per project whose marker names them: the live
 * membership row's `cdmImport.externalKey`, else the global user's marker when it names that
 * project (also when the membership is gone: the key lookup reads the global marker too, so
 * a deleted identity would otherwise be created again). Never `cdmSource.legacy.id`, which
 * is the importer's own id and not what the import matches on. Empty for a Grant-native user.
 */
export function resolveTombstoneKeys(
  userMetadata: unknown,
  memberships: readonly TombstoneMembership[]
): TombstoneKey[] {
  const keys = new Map<string, string>();
  for (const { projectId, metadata } of memberships) {
    if (typeof projectId !== 'string' || projectId === '' || keys.has(projectId)) continue;
    const rowKey = readMarkerExternalKey(metadata, projectId);
    if (rowKey) keys.set(projectId, rowKey);
  }
  const globalProjectId = readMarkerProjectId(userMetadata);
  if (globalProjectId !== null && !keys.has(globalProjectId)) {
    const globalKey = readMarkerExternalKey(userMetadata, globalProjectId);
    if (globalKey) keys.set(globalProjectId, globalKey);
  }
  return [...keys].map(([projectId, externalKey]) => ({ projectId, externalKey }));
}

function readMarkerProjectId(metadata: unknown): string | null {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const marker = (metadata as Record<string, unknown>)[CDM_IMPORT_METADATA_KEY];
  if (marker === null || typeof marker !== 'object' || Array.isArray(marker)) return null;
  const projectId = (marker as Record<string, unknown>).projectId;
  return typeof projectId === 'string' && projectId !== '' ? projectId : null;
}

interface TombstoneRowToWrite {
  projectId: string;
  kind: typeof CDM_TOMBSTONE_KIND_USER;
  externalKeyFingerprint: string;
}

type TombstoneWriteSkipReason =
  /** An operator deleted someone else: recoverable by the next import (Gate 1 question 4). */
  | 'not-self-deletion'
  /** A Grant-native user: no import marker anywhere, nothing to remember. */
  | 'no-import-key'
  /** No fingerprint secret configured: nothing can be hashed, so nothing is written. */
  | 'no-fingerprint-secret';

export type TombstoneWriteDecision =
  | { outcome: 'write'; rows: TombstoneRowToWrite[] }
  | { outcome: 'skip'; reason: TombstoneWriteSkipReason };

/**
 * Write a tombstone only when the person deleted themselves (the actor is the subject), the
 * identity carries an import key, and the fingerprint secret is configured. Rows are one per
 * project, so a user the import marked in two projects leaves two.
 */
export function decideTombstoneWrite(input: {
  actorUserId: string | null | undefined;
  subjectUserId: string;
  keys: readonly TombstoneKey[];
  fingerprintSecret: string;
}): TombstoneWriteDecision {
  if (!input.actorUserId || input.actorUserId !== input.subjectUserId) {
    return { outcome: 'skip', reason: 'not-self-deletion' };
  }
  if (input.keys.length === 0) {
    return { outcome: 'skip', reason: 'no-import-key' };
  }
  const rows: TombstoneRowToWrite[] = [];
  for (const { projectId, externalKey } of input.keys) {
    const externalKeyFingerprint = fingerprintCdmExternalKey(
      CDM_TOMBSTONE_KIND_USER,
      externalKey,
      input.fingerprintSecret
    );
    if (externalKeyFingerprint === '') {
      return { outcome: 'skip', reason: 'no-fingerprint-secret' };
    }
    rows.push({ projectId, kind: CDM_TOMBSTONE_KIND_USER, externalKeyFingerprint });
  }
  return { outcome: 'write', rows };
}

/**
 * The fingerprints of a document's user keys, computed once before the loop that creates
 * them. Keys that cannot be fingerprinted (no secret) are absent from the map, so nothing
 * can match them and the caller reads no tombstones.
 */
export function fingerprintDocumentKeys(
  externalKeys: readonly string[],
  fingerprintSecret: string
): Map<string, string> {
  const fingerprints = new Map<string, string>();
  for (const externalKey of externalKeys) {
    const fingerprint = fingerprintCdmExternalKey(
      CDM_TOMBSTONE_KIND_USER,
      externalKey,
      fingerprintSecret
    );
    if (fingerprint !== '') fingerprints.set(externalKey, fingerprint);
  }
  return fingerprints;
}

export type UserCreationDecision = 'create' | 'skip-tombstoned';

/**
 * The skip rule, asked only where the import is about to **create** an identity: a tombstone
 * blocks creation of an identity for its key; it never blocks a document user that resolves to
 * a live identity (those never reach this function). A key with no fingerprint is created.
 */
export function decideUserCreation(input: {
  fingerprint: string | undefined;
  tombstoned: ReadonlySet<string>;
}): UserCreationDecision {
  return input.fingerprint !== undefined && input.tombstoned.has(input.fingerprint)
    ? 'skip-tombstoned'
    : 'create';
}
