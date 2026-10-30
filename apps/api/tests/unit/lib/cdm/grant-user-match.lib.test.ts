/**
 * The `key.grantUserId` match rule, one named test per refusal. Pure: no database, so the
 * rule a Security reviewer reads is the rule these tests pin.
 */
import { describe, expect, it } from 'vitest';

import {
  decideGrantUserMatch,
  type GrantUserMatchCandidate,
  grantUserMatchRefusalMessage,
  markerNamesAnotherKey,
} from '@/lib/cdm/grant-user-match.lib';

const projectId = '10000000-0000-4000-8000-000000000011';
const otherProjectId = '10000000-0000-4000-8000-000000000012';
const hinted = '30000000-0000-4000-8000-000000000001';
const other = '30000000-0000-4000-8000-000000000002';
const externalKey = 'legacy-user-17';

const marker = (overrides: Record<string, unknown> = {}) => ({
  projectId,
  kind: 'user',
  externalKey,
  ...overrides,
});

const liveWithoutMarkers: GrantUserMatchCandidate = { globalMarker: null, membershipMarker: null };

const decide = (
  overrides: Partial<Parameters<typeof decideGrantUserMatch>[0]> & {
    candidate?: GrantUserMatchCandidate | null;
  } = {}
) =>
  decideGrantUserMatch({
    projectId,
    externalKey,
    grantUserId: hinted,
    userIdFoundByKey: null,
    candidate: liveWithoutMarkers,
    ...overrides,
  });

describe('decideGrantUserMatch', () => {
  it('creates a user when there is no hint and nothing carries the key', () => {
    expect(decide({ grantUserId: null, candidate: null })).toEqual({ outcome: 'create' });
    expect(decide({ grantUserId: undefined, candidate: null })).toEqual({ outcome: 'create' });
  });

  it('reuses the user an earlier import keyed when there is no hint', () => {
    expect(decide({ grantUserId: null, userIdFoundByKey: other, candidate: null })).toEqual({
      outcome: 'reuse-keyed',
      userId: other,
    });
  });

  it('reuses the keyed user when the hint names that same user, in either case', () => {
    expect(decide({ userIdFoundByKey: hinted, candidate: null })).toEqual({
      outcome: 'reuse-keyed',
      userId: hinted,
    });
    expect(decide({ grantUserId: hinted.toUpperCase(), userIdFoundByKey: hinted })).toEqual({
      outcome: 'reuse-keyed',
      userId: hinted,
    });
  });

  it('matches a live hinted user that carries no marker', () => {
    expect(decide()).toEqual({ outcome: 'matched', userId: hinted });
  });

  it('matches a hinted user whose marker already carries this very key', () => {
    expect(decide({ candidate: { globalMarker: null, membershipMarker: marker() } })).toEqual({
      outcome: 'matched',
      userId: hinted,
    });
  });

  describe('refusals', () => {
    it('refuses when the key already resolves to another user than the hint', () => {
      expect(decide({ userIdFoundByKey: other, candidate: null })).toEqual({
        outcome: 'refused',
        refusal: 'other-user-under-key',
      });
    });

    it('refuses a hint that names no user', () => {
      expect(decide({ candidate: null })).toEqual({
        outcome: 'refused',
        refusal: 'user-not-found',
      });
    });

    it('refuses a soft-deleted user: the read returns no candidate for it', () => {
      // `findLiveUserCdmMarkers` filters `users.deleted_at IS NULL`; its null is the whole
      // signal the rule gets, so a soft-deleted user is indistinguishable from a missing one.
      expect(decide({ candidate: null }).outcome).toBe('refused');
    });

    it('refuses a user whose membership row carries a marker with another key', () => {
      expect(
        decide({
          candidate: { globalMarker: null, membershipMarker: marker({ externalKey: 'x' }) },
        })
      ).toEqual({ outcome: 'refused', refusal: 'other-key' });
    });

    it('refuses a user whose global marker names this project with another key', () => {
      expect(
        decide({
          candidate: { globalMarker: marker({ externalKey: 'x' }), membershipMarker: null },
        })
      ).toEqual({ outcome: 'refused', refusal: 'other-key' });
    });

    it('refuses a user this import already resolved for a different key of the document', () => {
      expect(decide({ userIdsProducedUnderOtherKeys: new Set([hinted]) })).toEqual({
        outcome: 'refused',
        refusal: 'other-key',
      });
    });

    it('does not refuse when the user produced for other keys is somebody else', () => {
      expect(decide({ userIdsProducedUnderOtherKeys: new Set([other]) })).toEqual({
        outcome: 'matched',
        userId: hinted,
      });
    });

    it('does not refuse a user whose marker names another project', () => {
      expect(
        decide({
          candidate: {
            globalMarker: marker({ projectId: otherProjectId, externalKey: 'x' }),
            membershipMarker: null,
          },
        })
      ).toEqual({ outcome: 'matched', userId: hinted });
    });
  });
});

describe('markerNamesAnotherKey', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'user'],
    ['an array', []],
    ['another project', marker({ projectId: otherProjectId, externalKey: 'x' })],
    ['another kind', marker({ kind: 'role', externalKey: 'x' })],
    ['no key', { projectId, kind: 'user' }],
    ['an empty key', marker({ externalKey: '' })],
    ['a non-string key', marker({ externalKey: 5 })],
    ['this key', marker()],
  ])('is false for %s', (_label, value) => {
    expect(markerNamesAnotherKey(value, projectId, externalKey)).toBe(false);
  });

  it('is true for this project, kind user, a different key', () => {
    expect(markerNamesAnotherKey(marker({ externalKey: 'x' }), projectId, externalKey)).toBe(true);
  });
});

describe('grantUserMatchRefusalMessage', () => {
  it.each(['other-user-under-key', 'user-not-found', 'other-key'] as const)(
    'names the position and nothing else for %s',
    (refusal) => {
      const message = grantUserMatchRefusalMessage(4, refusal);
      expect(message).toMatch(/^users\[4\]: grantUserId /);
      expect(message).not.toContain(externalKey);
      expect(message).not.toContain(hinted);
      expect(message).not.toContain(projectId);
    }
  );
});
