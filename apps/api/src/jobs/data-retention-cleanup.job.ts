import { config } from '@/config';
import { JobResult, ScheduledJob } from '@/lib/jobs';
import { Job } from '@/lib/jobs/base/job';
import { DrizzleTransactionalConnection } from '@/lib/transaction-manager.lib';

export default class DataRetentionCleanupJob extends Job {
  readonly config: ScheduledJob = {
    id: 'data-retention-cleanup',
    schedule: config.jobs.dataRetention.schedule,
    enabled: config.jobs.dataRetention.enabled,
  };

  async execute(): Promise<JobResult> {
    const txConn = new DrizzleTransactionalConnection(this.appContext.db);
    const result = await txConn.withTransaction(async (tx) => {
      const accountRetentionDays = config.privacy.accountDeletionRetentionDays;
      const accountRetentionDate = new Date();
      accountRetentionDate.setDate(accountRetentionDate.getDate() - accountRetentionDays);

      this.logger.info({
        msg: 'Starting cleanup of expired accounts',
        retentionDays: accountRetentionDays,
        retentionDate: accountRetentionDate.toISOString(),
      });

      const expiredAccounts = await this.appContext.services.accounts.getExpiredAccounts(
        accountRetentionDate,
        tx
      );

      if (expiredAccounts.length === 0) {
        this.logger.debug({ msg: 'No expired accounts found for cleanup' });
        return {
          accountsDeleted: 0,
          usersDeleted: 0,
          backupsDeleted: 0,
        };
      }

      this.logger.info({
        msg: 'Found expired accounts to delete',
        count: expiredAccounts.length,
      });

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
          this.logger.debug({ userId, msg: 'Permanently deleted expired user' });
        } catch (error) {
          this.logger.error({
            userId,
            err: error,
            msg: 'Failed to permanently delete expired user',
          });
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
          this.logger.debug({
            accountId: account.id,
            msg: 'Permanently deleted expired account',
          });
        } catch (error) {
          this.logger.error({
            accountId: account.id,
            err: error,
            msg: 'Failed to permanently delete expired account',
          });
        }
      }

      this.logger.info({
        msg: 'Completed cleanup of expired accounts',
        deletedUsers,
        deletedAccounts,
        totalFound: expiredAccounts.length,
      });

      const backupRetentionDays = config.privacy.backupRetentionDays;
      const backupRetentionDate = new Date();
      backupRetentionDate.setDate(backupRetentionDate.getDate() - backupRetentionDays);

      this.logger.info({
        msg: 'Starting cleanup of expired backups',
        retentionDays: backupRetentionDays,
        retentionDate: backupRetentionDate.toISOString(),
      });

      // TODO: Implement backup cleanup when backup system is implemented
      // For now, backups are not stored in the database, so there's nothing to clean up
      this.logger.debug({
        msg: 'Backup cleanup not yet implemented, no backups to clean',
      });

      return {
        accountsDeleted: deletedAccounts,
        usersDeleted: deletedUsers,
        backupsDeleted: 0,
      };
    });

    // Soft-deleted credentials have no retention period (ADR 0011 § 8): they go on the next
    // run, whether or not any account expired. Runs after the account cleanup so that
    // credentials which cascaded with a hard-deleted user are already gone.
    const credentialsPurged = await txConn.withTransaction((tx) =>
      this.appContext.services.credentials.purgeSoftDeleted(tx)
    );
    this.logger.info({
      msg: 'Purged soft-deleted credentials',
      platformCredentialsPurged: credentialsPurged.platform,
      projectCredentialsPurged: credentialsPurged.project,
    });

    return {
      success: true,
      data: {
        accountsDeleted: result.accountsDeleted,
        usersDeleted: result.usersDeleted,
        backupsDeleted: result.backupsDeleted,
        platformCredentialsPurged: credentialsPurged.platform,
        projectCredentialsPurged: credentialsPurged.project,
      },
    };
  }
}
