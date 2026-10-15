import type {
  CredentialRecord,
  CredentialScope,
  CredentialWithHash,
  ICredentialLockoutService,
  ICredentialRepository,
} from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifySecretSpy = vi.hoisted(() => vi.fn());

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return {
    ...actual,
    hashSecret: (value: string) => actual.hashSecret(value, 4),
    verifySecret: (value: string, hash: string) => {
      verifySecretSpy(value, hash);
      return actual.verifySecret(value, hash);
    },
  };
});

const { CredentialService } = await import('@/services/credentials.service');
const { hashSecret } = await import('@/lib/token.lib');

const USER = 'user-1';
const OTHER_USER = 'user-2';
const PROJECT = 'project-1';
const OTHER_PROJECT = 'project-2';
const PLATFORM: CredentialScope = { scope: 'platform' };
const IN_PROJECT: CredentialScope = { scope: 'project', projectId: PROJECT };
const IN_OTHER_PROJECT: CredentialScope = { scope: 'project', projectId: OTHER_PROJECT };

/** In-memory repository with the semantics of the real ones: one live row per key. */
class FakeCredentialRepository implements ICredentialRepository<CredentialScope> {
  rows: Array<CredentialWithHash & { deletedAt: Date | null }> = [];
  private nextId = 1;

  constructor(private readonly kind: 'platform' | 'project') {}

  private key(scope: CredentialScope, userId: string) {
    return (row: { userId: string; projectId: string | null; deletedAt: Date | null }) =>
      row.deletedAt === null &&
      row.userId === userId &&
      row.projectId === (scope.scope === 'project' ? scope.projectId : null);
  }

  private toRecord(row: CredentialWithHash): CredentialRecord {
    const { hash: _hash, ...record } = row;
    return record;
  }

  async findActive(scope: CredentialScope, userId: string) {
    const row = this.rows.find(this.key(scope, userId));
    return row ? { ...row } : null;
  }

  async upsert(scope: CredentialScope, input: { userId: string; hash: string; source: never }) {
    const existing = this.rows.find(this.key(scope, input.userId));
    if (existing) {
      Object.assign(existing, {
        hash: input.hash,
        source: input.source,
        lastUsedAt: null,
        updatedAt: new Date(),
      });
      return this.toRecord(existing);
    }
    const row = {
      id: `${this.kind}-cred-${this.nextId++}`,
      scope: this.kind,
      projectId: scope.scope === 'project' ? scope.projectId : null,
      userId: input.userId,
      hash: input.hash,
      source: input.source,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } satisfies CredentialWithHash & { deletedAt: Date | null };
    this.rows.push(row);
    return this.toRecord(row);
  }

  async touchLastUsed(scope: CredentialScope, userId: string, at: Date) {
    const row = this.rows.find(this.key(scope, userId));
    if (row) row.lastUsedAt = at;
  }

  async softDelete(scope: CredentialScope, userId: string) {
    const row = this.rows.find(this.key(scope, userId));
    if (!row) return null;
    row.deletedAt = new Date();
    return this.toRecord(row);
  }

  async softDeleteAllForUser(userId: string) {
    const removed = this.rows.filter((r) => r.userId === userId && r.deletedAt === null);
    removed.forEach((r) => (r.deletedAt = new Date()));
    return removed.map((r) => this.toRecord(r));
  }

  async listActiveForUser(userId: string) {
    return this.rows
      .filter((r) => r.userId === userId && r.deletedAt === null)
      .map((r) => this.toRecord(r));
  }

  async purgeSoftDeleted() {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.deletedAt === null);
    return before - this.rows.length;
  }
}

function build() {
  const platform = new FakeCredentialRepository('platform');
  const project = new FakeCredentialRepository('project');
  const audit = () => ({
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
    logAction: vi.fn(),
  });
  const platformAudit = audit();
  const projectAudit = audit();
  const lockouts: ICredentialLockoutService = {
    getStatus: vi.fn(),
    recordFailure: vi.fn(),
    reset: vi.fn(),
    resetAllForUser: vi.fn().mockResolvedValue(undefined),
  };
  const service = new CredentialService(
    { platform, project },
    { platform: platformAudit, project: projectAudit },
    lockouts
  );
  return { service, platform, project, platformAudit, projectAudit, lockouts };
}

const PASSWORD = 'correct horse battery staple';

function auditPayloads(...audits: Array<ReturnType<typeof build>['platformAudit']>): string {
  return JSON.stringify(
    audits.flatMap((a) => [
      ...a.logCreate.mock.calls,
      ...a.logUpdate.mock.calls,
      ...a.logSoftDelete.mock.calls,
    ])
  );
}

describe('CredentialService', () => {
  beforeEach(() => {
    verifySecretSpy.mockClear();
  });

  describe('create and replace', () => {
    it('creates a credential per scope, storing a bcrypt hash and never the password', async () => {
      const { service, platform, project } = build();

      const platformRecord = await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      const projectRecord = await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });

      expect(platformRecord).toMatchObject({
        scope: 'platform',
        projectId: null,
        source: 'register',
      });
      expect(projectRecord).toMatchObject({
        scope: 'project',
        projectId: PROJECT,
        source: 'reset',
      });
      expect(platformRecord).not.toHaveProperty('hash');
      expect(platform.rows).toHaveLength(1);
      expect(project.rows).toHaveLength(1);
      expect(platform.rows[0].hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(platform.rows[0].hash).not.toContain(PASSWORD);
    });

    it('replaces the live credential in place and audits it as an update', async () => {
      const { service, platform, platformAudit } = build();

      const first = await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      const firstHash = platform.rows[0].hash;
      const second = await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: 'another password',
        source: 'change',
      });

      expect(second.id).toBe(first.id);
      expect(second.source).toBe('change');
      expect(platform.rows).toHaveLength(1);
      expect(platform.rows[0].hash).not.toBe(firstHash);
      expect(platformAudit.logCreate).toHaveBeenCalledTimes(1);
      expect(platformAudit.logUpdate).toHaveBeenCalledTimes(1);
      const [, oldValues, newValues] = platformAudit.logUpdate.mock.calls[0];
      expect(oldValues).toMatchObject({ source: 'register' });
      expect(newValues).toMatchObject({ source: 'change' });
    });

    it('keeps the scopes apart: a platform credential is not a project credential', async () => {
      const { service, project } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });

      expect(project.rows).toHaveLength(0);
      expect(await service.hasCredential(IN_PROJECT, USER)).toBe(false);
      expect(await service.hasCredential(PLATFORM, USER)).toBe(true);
    });

    it('keeps one project apart from another', async () => {
      const { service } = build();
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'cdm-import',
      });

      expect(await service.hasCredential(IN_OTHER_PROJECT, USER)).toBe(false);
      expect(
        await service.verifyPassword({ scope: IN_OTHER_PROJECT, userId: USER, password: PASSWORD })
      ).toBe(false);
    });

    it('sends audit rows without the hash, the password or the plaintext of either', async () => {
      const { service, platform, platformAudit, projectAudit } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: 'second-password-x',
        source: 'change',
      });
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });
      await service.removeCredential(IN_PROJECT, USER);

      const payload = auditPayloads(platformAudit, projectAudit);
      expect(payload).toContain('"source":"register"');
      expect(payload).not.toContain(platform.rows[0].hash);
      expect(payload).not.toContain(PASSWORD);
      expect(payload).not.toContain('second-password-x');
      expect(payload).not.toContain('$2');
      expect(payload).not.toContain('"hash"');
    });
  });

  describe('input handling', () => {
    it('refuses an empty password with a message that does not echo input', async () => {
      const { service } = build();
      await expect(
        service.setPassword({ scope: PLATFORM, userId: USER, password: '', source: 'register' })
      ).rejects.toThrow(/non-empty string/);
    });

    it('does not put the password into a validation error about the rest of the call', async () => {
      const { service } = build();
      const failure = await service
        .setPassword({
          scope: PLATFORM,
          userId: USER,
          password: PASSWORD,
          source: 'not-a-source' as never,
        })
        .catch((e: Error) => e);
      expect(failure).toBeInstanceOf(Error);
      expect(String((failure as Error).message)).not.toContain(PASSWORD);
    });

    it('refuses a hash that is not bcrypt or is outside the cost bounds, without echoing it', async () => {
      const { service } = build();
      const notBcrypt = 'plaintext-looking-secret-value';
      const tooCostly = '$2b$31$' + 'a'.repeat(53);

      for (const hash of [notBcrypt, tooCostly]) {
        const failure = await service
          .setPasswordHash({ scope: PLATFORM, userId: USER, hash, source: 'migrated' })
          .catch((e: Error) => e);
        expect(failure).toBeInstanceOf(Error);
        expect(String((failure as Error).message)).not.toContain(hash);
      }
    });

    it('stores an imported bcrypt hash verbatim so the same password verifies', async () => {
      const { service, project } = build();
      const imported = hashSecret(PASSWORD);

      await service.setPasswordHash({
        scope: IN_PROJECT,
        userId: USER,
        hash: imported,
        source: 'cdm-import',
      });

      expect(project.rows[0].hash).toBe(imported);
      expect(
        await service.verifyPassword({ scope: IN_PROJECT, userId: USER, password: PASSWORD })
      ).toBe(true);
    });
  });

  describe('verifier', () => {
    it('is true for the right password and records the use', async () => {
      const { service, platform } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      expect(platform.rows[0].lastUsedAt).toBeNull();

      expect(
        await service.verifyPassword({ scope: PLATFORM, userId: USER, password: PASSWORD })
      ).toBe(true);
      expect(platform.rows[0].lastUsedAt).toBeInstanceOf(Date);
    });

    it('is false for a wrong password and does not record a use', async () => {
      const { service, platform } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });

      expect(
        await service.verifyPassword({ scope: PLATFORM, userId: USER, password: 'wrong' })
      ).toBe(false);
      expect(platform.rows[0].lastUsedAt).toBeNull();
    });

    it('is false for a user with no credential, after a compare against a dummy hash', async () => {
      const { service, platform } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      verifySecretSpy.mockClear();

      expect(
        await service.verifyPassword({ scope: PLATFORM, userId: OTHER_USER, password: PASSWORD })
      ).toBe(false);

      expect(verifySecretSpy).toHaveBeenCalledTimes(1);
      expect(verifySecretSpy.mock.calls[0][1]).not.toBe(platform.rows[0].hash);
    });

    it('does one compare for a hit and one for a miss', async () => {
      const { service } = build();
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });
      verifySecretSpy.mockClear();

      await service.verifyPassword({ scope: IN_PROJECT, userId: USER, password: PASSWORD });
      await service.verifyPassword({ scope: IN_PROJECT, userId: OTHER_USER, password: PASSWORD });

      expect(verifySecretSpy).toHaveBeenCalledTimes(2);
    });

    it('does not accept the platform password for a project credential, nor the reverse', async () => {
      const { service } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: 'platform-password',
        source: 'register',
      });
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: 'project-password',
        source: 'reset',
      });

      expect(
        await service.verifyPassword({
          scope: PLATFORM,
          userId: USER,
          password: 'project-password',
        })
      ).toBe(false);
      expect(
        await service.verifyPassword({
          scope: IN_PROJECT,
          userId: USER,
          password: 'platform-password',
        })
      ).toBe(false);
      expect(
        await service.verifyPassword({
          scope: PLATFORM,
          userId: USER,
          password: 'platform-password',
        })
      ).toBe(true);
      expect(
        await service.verifyPassword({
          scope: IN_PROJECT,
          userId: USER,
          password: 'project-password',
        })
      ).toBe(true);
    });

    it('takes a resolved user id and no identifier: an email-shaped id finds nothing', async () => {
      const { service } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      expect(
        await service.verifyPassword({
          scope: PLATFORM,
          userId: 'someone@example.com',
          password: PASSWORD,
        })
      ).toBe(false);
    });
  });

  describe('soft delete', () => {
    it('soft-deletes one scope only and audits it', async () => {
      const { service, platform, project, projectAudit } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });

      expect(await service.removeCredential(IN_PROJECT, USER)).toBe(true);

      expect(project.rows[0].deletedAt).toBeInstanceOf(Date);
      expect(platform.rows[0].deletedAt).toBeNull();
      expect(await service.hasCredential(IN_PROJECT, USER)).toBe(false);
      expect(
        await service.verifyPassword({ scope: IN_PROJECT, userId: USER, password: PASSWORD })
      ).toBe(false);
      expect(projectAudit.logSoftDelete).toHaveBeenCalledTimes(1);
    });

    it('returns false, and audits nothing, when there is no credential', async () => {
      const { service, projectAudit } = build();
      expect(await service.removeCredential(IN_PROJECT, USER)).toBe(false);
      expect(projectAudit.logSoftDelete).not.toHaveBeenCalled();
    });

    it('allows a new credential after a soft delete, as a new row', async () => {
      const { service, project } = build();
      const first = await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });
      await service.removeCredential(IN_PROJECT, USER);
      const second = await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });

      expect(second.id).not.toBe(first.id);
      expect(project.rows).toHaveLength(2);
    });

    it('does not let a removed password verify after a re-add', async () => {
      const { service } = build();
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: 'old-password-1',
        source: 'cdm-import',
      });
      await service.removeCredential(IN_PROJECT, USER);

      expect(
        await service.verifyPassword({
          scope: IN_PROJECT,
          userId: USER,
          password: 'old-password-1',
        })
      ).toBe(false);
    });
  });

  describe('erasure', () => {
    it('soft-deletes every credential of the user in both scopes and clears the lockout state', async () => {
      const { service, platform, project, lockouts, platformAudit, projectAudit } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });
      await service.setPassword({
        scope: IN_OTHER_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });
      await service.setPassword({
        scope: PLATFORM,
        userId: OTHER_USER,
        password: PASSWORD,
        source: 'register',
      });

      expect(await service.removeAllForUser(USER)).toBe(3);

      expect(platform.rows.filter((r) => r.userId === USER && r.deletedAt === null)).toHaveLength(
        0
      );
      expect(project.rows.filter((r) => r.userId === USER && r.deletedAt === null)).toHaveLength(0);
      expect(platform.rows.find((r) => r.userId === OTHER_USER)?.deletedAt).toBeNull();
      expect(lockouts.resetAllForUser).toHaveBeenCalledWith(USER, undefined);
      expect(platformAudit.logSoftDelete).toHaveBeenCalledTimes(1);
      expect(projectAudit.logSoftDelete).toHaveBeenCalledTimes(2);
    });
  });

  describe('export listing', () => {
    it('lists live credentials of both scopes without any hash', async () => {
      const { service } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'cdm-import',
      });
      await service.setPassword({
        scope: IN_OTHER_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });
      await service.removeCredential(IN_OTHER_PROJECT, USER);

      const listed = await service.listForUser(USER);

      expect(listed.map((c) => [c.scope, c.projectId, c.source])).toEqual([
        ['platform', null, 'register'],
        ['project', PROJECT, 'cdm-import'],
      ]);
      for (const credential of listed) {
        expect(credential).not.toHaveProperty('hash');
      }
      expect(JSON.stringify(listed)).not.toContain('$2');
    });

    it('getCredential returns metadata without the hash', async () => {
      const { service } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      const credential = await service.getCredential(PLATFORM, USER);
      expect(credential).not.toBeNull();
      expect(credential).not.toHaveProperty('hash');
    });
  });

  describe('retention purge', () => {
    it('hard-deletes soft-deleted rows only, in both scopes', async () => {
      const { service, platform, project } = build();
      await service.setPassword({
        scope: PLATFORM,
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      await service.setPassword({
        scope: PLATFORM,
        userId: OTHER_USER,
        password: PASSWORD,
        source: 'register',
      });
      await service.setPassword({
        scope: IN_PROJECT,
        userId: USER,
        password: PASSWORD,
        source: 'reset',
      });
      await service.removeCredential(PLATFORM, OTHER_USER);
      await service.removeCredential(IN_PROJECT, USER);

      expect(await service.purgeSoftDeleted()).toEqual({ platform: 1, project: 1 });

      expect(platform.rows.map((r) => r.userId)).toEqual([USER]);
      expect(project.rows).toHaveLength(0);
      expect(await service.purgeSoftDeleted()).toEqual({ platform: 0, project: 0 });
    });
  });
});
