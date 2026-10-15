import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config', () => ({
  config: {
    jobs: { dataRetention: { schedule: '0 3 * * *', enabled: true } },
    privacy: { accountDeletionRetentionDays: 30, backupRetentionDays: 90 },
  },
}));

vi.mock('@/lib/transaction-manager.lib', () => ({
  DrizzleTransactionalConnection: class {
    async withTransaction<T>(operation: (transaction: unknown) => Promise<T>): Promise<T> {
      return operation({ tx: true });
    }
  },
}));

const { default: DataRetentionCleanupJob } = await import('@/jobs/data-retention-cleanup.job');

function buildJob(options: { expiredAccounts: Array<{ id: string; ownerId: string }> }) {
  const services = {
    accounts: {
      getExpiredAccounts: vi.fn().mockResolvedValue(options.expiredAccounts),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
    },
    users: { deleteUser: vi.fn().mockResolvedValue(undefined) },
    credentials: {
      purgeSoftDeleted: vi.fn().mockResolvedValue({ platform: 2, project: 3 }),
    },
  };
  const job = new DataRetentionCleanupJob({ db: {}, services } as never);
  (job as unknown as { logger: unknown }).logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  return { job, services };
}

describe('DataRetentionCleanupJob soft-deleted credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('purges soft-deleted credentials even when no account has expired', async () => {
    const { job, services } = buildJob({ expiredAccounts: [] });

    const result = await job.execute();

    expect(services.accounts.deleteAccount).not.toHaveBeenCalled();
    expect(services.credentials.purgeSoftDeleted).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      success: true,
      data: { accountsDeleted: 0, platformCredentialsPurged: 2, projectCredentialsPurged: 3 },
    });
  });

  it('purges after the expired accounts and users have been deleted', async () => {
    const { job, services } = buildJob({ expiredAccounts: [{ id: 'acc-1', ownerId: 'user-1' }] });
    const order: string[] = [];
    services.users.deleteUser.mockImplementation(async () => void order.push('user'));
    services.accounts.deleteAccount.mockImplementation(async () => void order.push('account'));
    services.credentials.purgeSoftDeleted.mockImplementation(async () => {
      order.push('purge');
      return { platform: 0, project: 0 };
    });

    const result = await job.execute();

    expect(order).toEqual(['user', 'account', 'purge']);
    expect(result).toMatchObject({ data: { usersDeleted: 1, accountsDeleted: 1 } });
  });

  it('lets a failed purge fail the run instead of reporting success', async () => {
    const { job, services } = buildJob({ expiredAccounts: [] });
    services.credentials.purgeSoftDeleted.mockRejectedValue(new Error('purge failed'));

    await expect(job.execute()).rejects.toThrow('purge failed');
  });
});
