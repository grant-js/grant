/**
 * Deletion tombstones written by `UserService.deleteUser` (Gate 1 questions 4 and 5): on a
 * self-deletion only, one row per project whose marker names the user, the fingerprint of the
 * raw key and nothing else, in the deletion's own transaction. The keys here include an
 * address, so the sentinel test also reads everything the service emits.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fingerprintCdmExternalKey } from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import { UserService } from '@/services/users.service';

const SECRET = 'unit-test-tombstone-secret';
const config = vi.hoisted(() => ({
  system: { systemUserId: '00000000-0000-0000-0000-000000000001' },
  cdm: { apiKeyFingerprintHmacSecret: 'unit-test-tombstone-secret' },
}));
vi.mock('@/config', () => ({ config }));

const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/logger', () => ({ createLogger: () => logger }));

const USER_ID = '10000000-0000-4000-8000-0000000000a1';
const OPERATOR_ID = '10000000-0000-4000-8000-0000000000a2';
const PROJECT_A = '10000000-0000-4000-8000-0000000000b1';
const PROJECT_B = '10000000-0000-4000-8000-0000000000b2';
const ADDRESS = 'sentinel.person@example.com';
const tx = { __tx: true };

const marker = (projectId: string, externalKey: string, kind = 'user') => ({
  cdmImport: { projectId, kind, externalKey },
});

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Jane Example',
    pictureUrl: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function build(options: {
  actorId?: string;
  memberships?: Array<{ projectId: string; metadata: unknown }>;
  userMetadata?: Record<string, unknown>;
}) {
  const { actorId = USER_ID, memberships = [], userMetadata = {} } = options;
  const order: string[] = [];
  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({
      users: [userRow({ metadata: userMetadata })],
      totalCount: 1,
      hasNextPage: false,
    }),
    getUserMembershipMetadata: vi.fn().mockResolvedValue(memberships),
    countHumanUsers: vi.fn().mockResolvedValue(2),
    softDeleteUser: vi.fn().mockImplementation(async () => {
      order.push('delete');
      return userRow({ deletedAt: new Date('2026-02-01T00:00:00.000Z') });
    }),
    hardDeleteUser: vi.fn().mockImplementation(async () => {
      order.push('delete');
      return userRow();
    }),
  };
  const events = { publish: vi.fn(), resolveLinkedProjectIds: vi.fn().mockResolvedValue([]) };
  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const tombstones = {
    insertIgnoringDuplicates: vi.fn().mockImplementation(async () => {
      order.push('tombstone');
    }),
    filterTombstoned: vi.fn(),
  };
  const service = new UserService(
    userRepository as never,
    { userId: actorId } as never,
    audit as never,
    { getUrl: vi.fn() } as never,
    { removeAllForUser: vi.fn() } as never,
    events as never,
    tombstones as never
  );
  return { service, tombstones, userRepository, events, audit, order };
}

beforeEach(() => {
  vi.clearAllMocks();
  config.cdm.apiKeyFingerprintHmacSecret = SECRET;
});

describe('UserService.deleteUser deletion tombstones', () => {
  it('writes the fingerprint of the membership row key, in the same transaction, before the delete', async () => {
    const { service, tombstones, order } = build({
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, 'legacy-17') }],
    });

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    expect(tombstones.insertIgnoringDuplicates).toHaveBeenCalledTimes(1);
    expect(tombstones.insertIgnoringDuplicates).toHaveBeenCalledWith(
      [
        {
          projectId: PROJECT_A,
          kind: 'user',
          externalKeyFingerprint: fingerprintCdmExternalKey('user', 'legacy-17', SECRET),
        },
      ],
      tx
    );
    expect(order).toEqual(['tombstone', 'delete']);
  });

  it('hashes the raw key of an e-mail keyed identity: the address never reaches the repository', async () => {
    const { service, tombstones } = build({
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, ADDRESS) }],
    });

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    const rows = tombstones.insertIgnoringDuplicates.mock.calls[0][0];
    expect(rows).toEqual([
      {
        projectId: PROJECT_A,
        kind: 'user',
        externalKeyFingerprint: fingerprintCdmExternalKey('user', ADDRESS, SECRET),
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain('sentinel');
    expect(JSON.stringify(rows)).not.toContain(USER_ID);
  });

  it('takes the global marker when it names a project and the membership row carries none', async () => {
    const { service, tombstones } = build({
      memberships: [{ projectId: PROJECT_A, metadata: {} }],
      userMetadata: marker(PROJECT_A, 'global-key'),
    });

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    expect(tombstones.insertIgnoringDuplicates.mock.calls[0][0]).toEqual([
      {
        projectId: PROJECT_A,
        kind: 'user',
        externalKeyFingerprint: fingerprintCdmExternalKey('user', 'global-key', SECRET),
      },
    ]);
  });

  it('writes one row per project, de-duplicated when the row and the global marker name the same one', async () => {
    const { service, tombstones } = build({
      memberships: [
        { projectId: PROJECT_A, metadata: marker(PROJECT_A, 'row-a') },
        { projectId: PROJECT_B, metadata: marker(PROJECT_B, 'row-b') },
      ],
      userMetadata: marker(PROJECT_A, 'global-a'),
    });

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    const rows = tombstones.insertIgnoringDuplicates.mock.calls[0][0];
    expect(rows.map((r: { projectId: string }) => r.projectId)).toEqual([PROJECT_A, PROJECT_B]);
    expect(rows[0].externalKeyFingerprint).toBe(fingerprintCdmExternalKey('user', 'row-a', SECRET));
  });

  it('behaves the same for a hard delete', async () => {
    const { service, tombstones, order } = build({
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, 'legacy-17') }],
    });

    await service.deleteOwnUser({ hardDelete: true }, tx as never);

    expect(tombstones.insertIgnoringDuplicates).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['tombstone', 'delete']);
  });

  it('writes nothing for a Grant-native user', async () => {
    const { service, tombstones } = build({
      memberships: [{ projectId: PROJECT_A, metadata: {} }],
    });

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    expect(tombstones.insertIgnoringDuplicates).not.toHaveBeenCalled();
  });

  it('writes nothing when an operator deletes someone else (the actor is not the subject)', async () => {
    const { service, tombstones } = build({
      actorId: OPERATOR_ID,
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, 'legacy-17') }],
    });

    await service.deleteUser({ id: USER_ID }, tx as never);

    expect(tombstones.insertIgnoringDuplicates).not.toHaveBeenCalled();
  });

  it('writes nothing, and warns once without a key, when the fingerprint secret is empty', async () => {
    config.cdm.apiKeyFingerprintHmacSecret = '';
    const { service, tombstones } = build({
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, ADDRESS) }],
    });

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    expect(tombstones.insertIgnoringDuplicates).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][1]).toContain('CDM_API_KEY_FINGERPRINT_HMAC_SECRET');
  });

  it('does not warn when there is nothing to remember, secret or not', async () => {
    config.cdm.apiKeyFingerprintHmacSecret = '';
    const { service } = build({ memberships: [{ projectId: PROJECT_A, metadata: {} }] });

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not delete when the tombstone write fails: one transaction, one outcome', async () => {
    const { service, tombstones, userRepository } = build({
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, 'legacy-17') }],
    });
    tombstones.insertIgnoringDuplicates.mockRejectedValueOnce(new Error('write failed'));

    await expect(service.deleteOwnUser({ hardDelete: false }, tx as never)).rejects.toThrow(
      'write failed'
    );
    expect(userRepository.softDeleteUser).not.toHaveBeenCalled();
  });

  it('sentinel: no address reaches a log line, the event, the audit values or the repository', async () => {
    config.cdm.apiKeyFingerprintHmacSecret = '';
    const empty = build({
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, ADDRESS) }],
    });
    await empty.service.deleteOwnUser({ hardDelete: false }, tx as never);

    config.cdm.apiKeyFingerprintHmacSecret = SECRET;
    const configured = build({
      memberships: [{ projectId: PROJECT_A, metadata: marker(PROJECT_A, ADDRESS) }],
    });
    await configured.service.deleteOwnUser({ hardDelete: true }, tx as never);

    const emitted = JSON.stringify([
      logger.info.mock.calls,
      logger.warn.mock.calls,
      logger.error.mock.calls,
      empty.events.publish.mock.calls,
      configured.events.publish.mock.calls,
      empty.audit.logSoftDelete.mock.calls,
      configured.audit.logHardDelete.mock.calls,
      configured.tombstones.insertIgnoringDuplicates.mock.calls,
    ]);
    expect(emitted).not.toContain('sentinel');
    expect(emitted).not.toContain(ADDRESS);
  });
});

describe('removing a user from a project writes no tombstone', () => {
  it('keeps the project membership service and repository free of any tombstone dependency', () => {
    const root = resolve(__dirname, '../../../src');
    for (const file of [
      'services/project-users.service.ts',
      'repositories/project-users.repository.ts',
    ]) {
      const source = readFileSync(resolve(root, file), 'utf8');
      expect(source, file).not.toMatch(/tombstone/i);
    }
  });
});
