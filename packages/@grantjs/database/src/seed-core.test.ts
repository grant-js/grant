/**
 * Characterization tests for the core seed — the system user and its signing key.
 *
 * `bootstrapDatabase` runs this on every API start, so its idempotency is
 * production-facing. DB-free: `FakeDb` stands in for the query builder, in
 * replay mode for the second-run cases.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signingKeys, users } from './schemas';
import { FakeDb } from './test-support/fake-db';

const { ensureSystemUser, ensureSystemSigningKey, ensureSystemUserAndSigningKey } =
  await import('./seed-core');

type Db = Parameters<typeof ensureSystemUser>[0];

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

let db: FakeDb;

beforeEach(() => {
  vi.clearAllMocks();
  db = new FakeDb();
});

describe('ensureSystemUser', () => {
  it('inserts the system user with the caller-supplied id on a cold database', async () => {
    await ensureSystemUser(db as unknown as Db, SYSTEM_USER_ID);

    const inserts = db.insertsFor(users);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].values).toMatchObject({
      id: SYSTEM_USER_ID,
      name: 'System',
      pictureUrl: null,
      deletedAt: null,
    });
  });

  it('is idempotent — a second run inserts nothing', async () => {
    await ensureSystemUser(db as unknown as Db, SYSTEM_USER_ID);
    db.beginReplay();
    db.resetRecordings();

    await ensureSystemUser(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.insertsFor(users)).toHaveLength(0);
  });

  it('restores a soft-deleted system user instead of treating it as present', async () => {
    await ensureSystemUser(db as unknown as Db, SYSTEM_USER_ID);
    db.rows(users)[0].deletedAt = new Date();
    db.beginReplay();
    db.resetRecordings();

    await ensureSystemUser(db as unknown as Db, SYSTEM_USER_ID);

    // Fixed system id cannot be re-inserted; clear deletedAt instead.
    expect(db.insertsFor(users)).toHaveLength(0);
    expect(db.updatesFor(users)).toHaveLength(1);
    expect(db.updatesFor(users)[0].set).toMatchObject({ deletedAt: null });
  });
});

describe('ensureSystemSigningKey', () => {
  it('generates an active RS256 keypair scoped to the system tenant', async () => {
    await ensureSystemSigningKey(db as unknown as Db, SYSTEM_USER_ID);

    const inserts = db.insertsFor(signingKeys);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].values).toMatchObject({
      scopeTenant: 'system',
      scopeId: SYSTEM_USER_ID,
      algorithm: 'RS256',
      active: true,
    });
    expect(String(inserts[0].values.publicKeyPem)).toContain('BEGIN PUBLIC KEY');
    expect(String(inserts[0].values.privateKeyPem)).toContain('BEGIN PRIVATE KEY');
    expect(String(inserts[0].values.kid)).toMatch(/^system-[0-9a-f-]{36}$/);
  });

  it('is idempotent — a second run mints no new key', async () => {
    await ensureSystemSigningKey(db as unknown as Db, SYSTEM_USER_ID);
    db.beginReplay();
    db.resetRecordings();

    await ensureSystemSigningKey(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.insertsFor(signingKeys)).toHaveLength(0);
  });

  it('CHARACTERIZATION: the existence check requires active=true, so deactivating the only key causes a brand-new one to be minted on the next start rather than an error', async () => {
    await ensureSystemSigningKey(db as unknown as Db, SYSTEM_USER_ID);
    const original = db.rows(signingKeys)[0];
    // Simulate rotation/revocation making the row invisible to the lookup.
    db.rows(signingKeys).length = 0;
    db.beginReplay();
    db.resetRecordings();

    await ensureSystemSigningKey(db as unknown as Db, SYSTEM_USER_ID);

    const minted = db.insertsFor(signingKeys);
    expect(minted).toHaveLength(1);
    expect(minted[0].values.kid).not.toBe(original.kid);
  });

  it('CHARACTERIZATION: nothing here is guarded against a concurrent second caller — two replicas that both miss the check both insert', async () => {
    const a = new FakeDb();
    const b = new FakeDb();

    // Both see an empty table, as two replicas would between the SELECT and
    // the INSERT. bootstrapDatabase's session-pinned advisory lock serializes
    // this on the production path.
    await Promise.all([
      ensureSystemSigningKey(a as unknown as Db, SYSTEM_USER_ID),
      ensureSystemSigningKey(b as unknown as Db, SYSTEM_USER_ID),
    ]);

    expect(a.insertsFor(signingKeys)).toHaveLength(1);
    expect(b.insertsFor(signingKeys)).toHaveLength(1);
    expect(a.rows(signingKeys)[0].kid).not.toBe(b.rows(signingKeys)[0].kid);
  });
});

describe('ensureSystemUserAndSigningKey', () => {
  it('creates the user before the key, so the key never references a missing user', async () => {
    await ensureSystemUserAndSigningKey(db as unknown as Db, SYSTEM_USER_ID);

    const order = db.inserts.map((i) => i.table);
    expect(order.indexOf('users')).toBeLessThan(order.indexOf('signing_keys'));
  });

  it('is idempotent end to end', async () => {
    await ensureSystemUserAndSigningKey(db as unknown as Db, SYSTEM_USER_ID);
    db.beginReplay();
    db.resetRecordings();

    await ensureSystemUserAndSigningKey(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.inserts).toHaveLength(0);
    expect(db.updates).toHaveLength(0);
  });
});
