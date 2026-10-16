/**
 * Unit tests: ProjectPasswordResetService (ADR 0011 § 6 token rules): the token is random,
 * stored only as a SHA-256 digest scoped to (project, user), short-lived and single-use, and
 * the per-address limit never says anything to the caller beyond "no email". The SQL itself
 * (the atomic upsert, the row lock) is covered against PostgreSQL in
 * `project-password-reset.postgres.integration.test.ts`.
 */
import { createHash } from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProjectPasswordResetService } from '@/services/project-password-resets.service';

import { FakeResetRepository } from '../../helpers/project-password-reset-fakes';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const USER = '11111111-1111-4111-8111-111111111111';
const PROJECT = '22222222-2222-4222-8222-222222222222';
const OTHER_PROJECT = '33333333-3333-4333-8333-333333333333';
const METHOD = '44444444-4444-4444-8444-444444444444';

const TTL_MS = 30 * 60_000;
const WINDOW_MS = 60 * 60_000;
const MAX_REQUESTS = 3;

describe('ProjectPasswordResetService', () => {
  let repo: FakeResetRepository;
  let now: Date;
  let service: ProjectPasswordResetService;

  beforeEach(() => {
    repo = new FakeResetRepository();
    now = new Date('2026-10-16T10:00:00.000Z');
    service = new ProjectPasswordResetService(
      repo,
      { tokenTtlMs: TTL_MS, maxRequests: MAX_REQUESTS, windowMs: WINDOW_MS },
      () => now
    );
  });

  const issue = (overrides: Partial<{ projectId: string; userId: string }> = {}) =>
    service.issueToken({ projectId: PROJECT, userId: USER, authMethodId: METHOD, ...overrides });

  describe('issueToken', () => {
    it('issues a 256-bit random token that expires after the configured TTL', async () => {
      const issued = await issue();

      expect(issued).not.toBeNull();
      expect(issued!.token).toMatch(/^[0-9a-f]{64}$/);
      expect(issued!.expiresAt).toEqual(new Date(now.getTime() + TTL_MS));
      const second = await service.issueToken({
        projectId: PROJECT,
        userId: '55555555-5555-4555-8555-555555555555',
        authMethodId: METHOD,
      });
      expect(second!.token).not.toBe(issued!.token);
    });

    it('stores only the SHA-256 digest of the token, never the token', async () => {
      const issued = await issue();

      expect(repo.rows).toHaveLength(1);
      expect(repo.rows[0].tokenHash).toBe(sha256(issued!.token));
      expect(JSON.stringify(repo.rows)).not.toContain(issued!.token);
    });

    it('replaces the previous link: only the newest token works', async () => {
      const first = await issue();
      const second = await issue();

      expect(await service.consumeToken({ projectId: PROJECT, token: first!.token })).toBeNull();
      expect(await service.consumeToken({ projectId: PROJECT, token: second!.token })).toEqual({
        userId: USER,
        authMethodId: METHOD,
      });
    });

    it('stops issuing once the per-address budget of the window is spent, and keeps the live link', async () => {
      const issued = [];
      for (let i = 0; i < MAX_REQUESTS; i += 1) issued.push(await issue());
      expect(issued.every(Boolean)).toBe(true);

      expect(await issue()).toBeNull();

      // The newest link is still the one that works; the refused request changed nothing.
      const last = issued.at(-1)!;
      expect(await service.consumeToken({ projectId: PROJECT, token: last.token })).not.toBeNull();
    });

    it('budgets per (project, user): another member, or another project, is unaffected', async () => {
      for (let i = 0; i < MAX_REQUESTS; i += 1) await issue();
      expect(await issue()).toBeNull();

      expect(await issue({ userId: '66666666-6666-4666-8666-666666666666' })).not.toBeNull();
      expect(await issue({ projectId: OTHER_PROJECT })).not.toBeNull();
    });

    it('starts a new window after the old one lapses', async () => {
      for (let i = 0; i < MAX_REQUESTS; i += 1) await issue();
      expect(await issue()).toBeNull();

      now = new Date(now.getTime() + WINDOW_MS + 1);

      expect(await issue()).not.toBeNull();
    });

    it('refuses an empty id and stores nothing', async () => {
      await expect(
        service.issueToken({ projectId: '', userId: USER, authMethodId: METHOD })
      ).rejects.toThrow();
      expect(repo.rows).toHaveLength(0);
    });
  });

  describe('consumeToken', () => {
    it('returns the member and the Email method, once', async () => {
      const issued = await issue();

      expect(await service.consumeToken({ projectId: PROJECT, token: issued!.token })).toEqual({
        userId: USER,
        authMethodId: METHOD,
      });
      expect(await service.consumeToken({ projectId: PROJECT, token: issued!.token })).toBeNull();
      expect(repo.rows[0].tokenHash).toBeNull();
    });

    it('looks the token up by its digest inside the project: a foreign project cannot use it', async () => {
      const issued = await issue();

      expect(
        await service.consumeToken({ projectId: OTHER_PROJECT, token: issued!.token })
      ).toBeNull();
      // And the refusal did not use it up.
      expect(
        await service.consumeToken({ projectId: PROJECT, token: issued!.token })
      ).not.toBeNull();
    });

    it('refuses an unknown token', async () => {
      await issue();

      expect(await service.consumeToken({ projectId: PROJECT, token: 'f'.repeat(64) })).toBeNull();
    });

    it('refuses an expired token, at the expiry instant and after, and does not use it up', async () => {
      const issued = await issue();

      now = new Date(issued!.expiresAt.getTime());
      expect(await service.consumeToken({ projectId: PROJECT, token: issued!.token })).toBeNull();
      now = new Date(issued!.expiresAt.getTime() + 60_000);
      expect(await service.consumeToken({ projectId: PROJECT, token: issued!.token })).toBeNull();
      expect(repo.rows[0].tokenHash).toBe(sha256(issued!.token));
    });

    it('accepts a token up to the last millisecond before it expires', async () => {
      const issued = await issue();

      now = new Date(issued!.expiresAt.getTime() - 1);

      expect(
        await service.consumeToken({ projectId: PROJECT, token: issued!.token })
      ).not.toBeNull();
    });

    it.each([
      ['empty', ''],
      ['over-long', 'a'.repeat(513)],
      ['not a string', undefined as never],
    ])('refuses an %s token without touching storage', async (_label, token) => {
      await issue();

      expect(await service.consumeToken({ projectId: PROJECT, token })).toBeNull();
      expect(repo.rows[0].tokenHash).not.toBeNull();
    });

    it('does not accept the digest itself as a token', async () => {
      const issued = await issue();

      expect(
        await service.consumeToken({ projectId: PROJECT, token: sha256(issued!.token) })
      ).toBeNull();
    });

    it('compares the stored digest in constant time (a different-length digest never matches)', async () => {
      const issued = await issue();
      repo.rows[0].tokenHash = `${sha256(issued!.token)}00`;
      repo.claimByTokenHash = async (_project, hash) => ({
        id: repo.rows[0].id,
        userId: USER,
        authMethodId: METHOD,
        tokenHash: `${hash}00`,
        expiresAt: new Date(now.getTime() + TTL_MS),
      });

      expect(await service.consumeToken({ projectId: PROJECT, token: issued!.token })).toBeNull();
    });
  });

  describe('assertPasswordMeetsPolicy', () => {
    it('accepts a policy-conforming password', () => {
      expect(() => service.assertPasswordMeetsPolicy('Zq7!mKp2#vXw')).not.toThrow();
    });

    it.each(['short', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoDigitsHere!!', 'NoSpecial1234'])(
      'rejects %s without echoing it',
      (password) => {
        let thrown: unknown;
        try {
          service.assertPasswordMeetsPolicy(password);
        } catch (error) {
          thrown = error;
        }
        expect(thrown).toBeInstanceOf(Error);
        expect(JSON.stringify(thrown, Object.getOwnPropertyNames(thrown as object))).not.toContain(
          password
        );
      }
    );
  });
});
