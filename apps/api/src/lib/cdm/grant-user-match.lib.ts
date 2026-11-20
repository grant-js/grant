/**
 * The match rule behind `users[].key.grantUserId`: "this key is that existing Grant user".
 *
 * Pure on purpose, so each refusal has a named test and a reviewer can read the whole rule
 * without a database. The caller reads the facts (the key lookup, the candidate's markers)
 * and this decides. Messages name the position in the document, never the key (it can be an
 * address) and never an id.
 */

export type GrantUserMatchRefusal =
  /** The key already resolves to a live user, and the hint names a different one. */
  | 'other-user-under-key'
  /** The hint names no user, or a soft-deleted one. */
  | 'user-not-found'
  /** The user is already imported into this project under a different key. */
  | 'other-key';

export type GrantUserMatchDecision =
  /** No hint and nothing under the key: the caller creates the user as before. */
  | { outcome: 'create' }
  /** A live user already carries the key (and the hint, if any, agrees). */
  | { outcome: 'reuse-keyed'; userId: string }
  /** No user carries the key yet; the hinted user is the one. */
  | { outcome: 'matched'; userId: string }
  | { outcome: 'refused'; refusal: GrantUserMatchRefusal };

/**
 * What the repository read of a hinted user returns, `null` when the user does not exist or
 * is soft-deleted. Each marker is the raw `metadata.cdmImport` value (or `null`): the global
 * user's, and the live membership row's of the importing project.
 */
export interface GrantUserMatchCandidate {
  globalMarker: unknown;
  membershipMarker: unknown;
}

export interface GrantUserMatchInput {
  projectId: string;
  externalKey: string;
  /** The document's `key.grantUserId`, if any. */
  grantUserId: string | null | undefined;
  /** What the project's key lookup found: a live user carrying this key, if any. */
  userIdFoundByKey: string | null;
  /** Only read when there is a hint and nothing was found under the key. */
  candidate: GrantUserMatchCandidate | null;
  /**
   * Ids this import already resolved for a different key of the document. Two entries must
   * not claim one user: the assignment step writes one marker per membership row, so the
   * second key would silently replace the first.
   */
  userIdsProducedUnderOtherKeys?: ReadonlySet<string>;
}

/** Ids compare case-insensitively: a UUID is the same id in either case. */
function sameId(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * True when `marker` is an import marker of `projectId` that carries a key other than
 * `externalKey`. A marker of another project, another kind, or without a key does not
 * conflict: it says nothing about this project's key for the user.
 */
export function markerNamesAnotherKey(
  marker: unknown,
  projectId: string,
  externalKey: string
): boolean {
  if (marker == null || typeof marker !== 'object' || Array.isArray(marker)) {
    return false;
  }
  const {
    projectId: markerProjectId,
    kind,
    externalKey: markerKey,
  } = marker as Record<string, unknown>;
  if (markerProjectId !== projectId || kind !== 'user') {
    return false;
  }
  return typeof markerKey === 'string' && markerKey !== '' && markerKey !== externalKey;
}

export function decideGrantUserMatch(input: GrantUserMatchInput): GrantUserMatchDecision {
  const { projectId, externalKey, userIdFoundByKey, candidate } = input;
  const hint = input.grantUserId ?? null;

  if (userIdFoundByKey != null) {
    if (hint != null && !sameId(hint, userIdFoundByKey)) {
      return { outcome: 'refused', refusal: 'other-user-under-key' };
    }
    return { outcome: 'reuse-keyed', userId: userIdFoundByKey };
  }

  if (hint == null) {
    return { outcome: 'create' };
  }

  if (candidate == null) {
    return { outcome: 'refused', refusal: 'user-not-found' };
  }
  if (
    markerNamesAnotherKey(candidate.membershipMarker, projectId, externalKey) ||
    markerNamesAnotherKey(candidate.globalMarker, projectId, externalKey)
  ) {
    return { outcome: 'refused', refusal: 'other-key' };
  }
  const userId = hint.toLowerCase();
  if (input.userIdsProducedUnderOtherKeys?.has(userId)) {
    return { outcome: 'refused', refusal: 'other-key' };
  }
  return { outcome: 'matched', userId };
}

const REFUSAL_TEXT: Record<GrantUserMatchRefusal, string> = {
  'other-user-under-key':
    'grantUserId names another user than the one already imported under this key',
  'user-not-found': 'grantUserId does not name an existing user',
  'other-key': 'grantUserId is already imported under another key',
};

export function grantUserMatchRefusalMessage(
  position: number,
  refusal: GrantUserMatchRefusal
): string {
  return `users[${position}]: ${REFUSAL_TEXT[refusal]}`;
}
