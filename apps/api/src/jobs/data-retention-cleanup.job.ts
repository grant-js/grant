import { config } from '@/config';
import { JobResult, ScheduledJob } from '@/lib/jobs';
import { Job } from '@/lib/jobs/base/job';
import { TransactionManager } from '@/lib/transaction-manager.lib';

export default class DataRetentionCleanupJob extends Job {
  readonly config: ScheduledJob = {
    id: 'data-retention-cleanup',
    schedule: config.jobs.dataRetention.schedule,
    enabled: config.jobs.dataRetention.enabled,
  };

  async execute(): Promise<JobResult> {
    const result = await TransactionManager.withTransaction(this.appContext.db, async (tx) => {
      const accountRetentionDays = config.privacy.accountDeletionRetentionDays;
      const accountRetentionDate = new Date();
      accountRetentionDate.setDate(accountRetentionDate.getDate() - accountRetentionDays);

      this.logger.info(
        {
          retentionDays: accountRetentionDays,
          retentionDate: accountRetentionDate.toISOString(),
        },
        'Starting cleanup of expired accounts'
      );

      const expiredAccounts = await this.appContext.services.accounts.getExpiredAccounts(
        accountRetentionDate,
        tx
      );

      if (expiredAccounts.length === 0) {
        this.logger.debug('No expired accounts found for cleanup');
        return {
          accountsDeleted: 0,
          usersDeleted: 0,
          backupsDeleted: 0,
        };
      }

      this.logger.info({ count: expiredAccounts.length }, 'Found expired accounts to delete');

      const expiredUserIds = [...new Set(expiredAccounts.map((a) => a.ownerId))];

      let deletedUsers = 0;
      for (const userId of expiredUserIds) {
        try {
          await this.appContext.services.users.deleteUser(
            {
              id: userId,
              hardDelete: true,
            },
            tx
          );
          deletedUsers++;
          this.logger.debug({ userId }, 'Permanently deleted expired user');
        } catch (error) {
          this.logger.error({ userId, err: error }, 'Failed to permanently delete expired user');
        }
      }

      let deletedAccounts = 0;
      for (const account of expiredAccounts) {
        try {
          await this.appContext.services.accounts.deleteAccount(
            {
              id: account.id,
              hardDelete: true,
            },
            tx
          );
          deletedAccounts++;
          this.logger.debug({ accountId: account.id }, 'Permanently deleted expired account');
        } catch (error) {
          this.logger.error(
            { accountId: account.id, err: error },
            'Failed to permanently delete expired account'
          );
        }
      }

      this.logger.info(
        { deletedUsers, deletedAccounts, totalFound: expiredAccounts.length },
        'Completed cleanup of expired accounts'
      );

      const backupRetentionDays = config.privacy.backupRetentionDays;
      const backupRetentionDate = new Date();
      backupRetentionDate.setDate(backupRetentionDate.getDate() - backupRetentionDays);

      this.logger.info(
        {
          retentionDays: backupRetentionDays,
          retentionDate: backupRetentionDate.toISOString(),
        },
        'Starting cleanup of expired backups'
      );

      // TODO: Implement backup cleanup when backup system is implemented
      // For now, backups are not stored in the database, so there's nothing to clean up
      this.logger.debug('Backup cleanup not yet implemented, no backups to clean');

      return {
        accountsDeleted: deletedAccounts,
        usersDeleted: deletedUsers,
        backupsDeleted: 0,
      };
    });

    return {
      success: true,
      data: {
        accountsDeleted: result.accountsDeleted,
        usersDeleted: result.usersDeleted,
        backupsDeleted: result.backupsDeleted,
      },
    };
  }
}
