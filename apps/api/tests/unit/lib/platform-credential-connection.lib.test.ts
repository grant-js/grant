import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config', () => ({
  config: { security: { rlsRestrictedRole: 'grant_app_restricted' } },
}));

import { BasePoolPlatformCredentialConnection } from '@/lib/platform-credential-connection.lib';

/** A transaction whose `SELECT current_user` answers `role`. */
function fakeTransaction(role: string) {
  return { role, execute: vi.fn().mockResolvedValue([{ role }]) };
}

function fakeBaseDb() {
  const own = fakeTransaction('app_owner');
  const db = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(own)),
  };
  return { db, own };
}

describe('BasePoolPlatformCredentialConnection', () => {
  it('joins an unrestricted caller transaction, so the work commits with the caller', async () => {
    const { db } = fakeBaseDb();
    const caller = fakeTransaction('app_owner');
    const connection = new BasePoolPlatformCredentialConnection(db as never);

    const seen = await connection.transaction(caller as never, async (tx) => tx);

    expect(seen).toBe(caller);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('opens its own short transaction on the base pool when the caller runs as the restricted role', async () => {
    const { db, own } = fakeBaseDb();
    const caller = fakeTransaction('grant_app_restricted');
    const connection = new BasePoolPlatformCredentialConnection(db as never);

    const seen = await connection.transaction(caller as never, async (tx) => tx);

    expect(seen).toBe(own);
    expect(seen).not.toBe(caller);
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it('opens its own transaction when there is no caller transaction', async () => {
    const { db, own } = fakeBaseDb();
    const connection = new BasePoolPlatformCredentialConnection(db as never);

    expect(await connection.transaction(undefined, async (tx) => tx)).toBe(own);
  });

  it('probes a caller transaction once, whichever way it answers', async () => {
    const { db } = fakeBaseDb();
    const connection = new BasePoolPlatformCredentialConnection(db as never);
    const open = fakeTransaction('app_owner');
    const scoped = fakeTransaction('grant_app_restricted');

    await connection.transaction(open as never, async () => undefined);
    await connection.transaction(open as never, async () => undefined);
    await connection.transaction(scoped as never, async () => undefined);
    await connection.transaction(scoped as never, async () => undefined);

    expect(open.execute).toHaveBeenCalledTimes(1);
    expect(scoped.execute).toHaveBeenCalledTimes(1);
  });

  it('does not probe its own transaction when nested work asks to join it', async () => {
    const { db, own } = fakeBaseDb();
    const connection = new BasePoolPlatformCredentialConnection(db as never);

    await connection.transaction(undefined, async (outer) => {
      // The lockout reset inside a credential write hands the write's transaction back.
      const inner = await connection.transaction(outer, async (tx) => tx);
      expect(inner).toBe(outer);
    });

    expect(own.execute).not.toHaveBeenCalled();
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it('follows the role the connection really runs as, not an assumption about the request', async () => {
    // Role names are matched exactly: a role merely containing the name is not restricted.
    const { db } = fakeBaseDb();
    const connection = new BasePoolPlatformCredentialConnection(db as never);
    const lookalike = fakeTransaction('grant_app_restricted_admin');

    expect(await connection.transaction(lookalike as never, async (tx) => tx)).toBe(lookalike);
  });
});
