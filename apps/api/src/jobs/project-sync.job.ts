import type {
  IProjectExportService,
  IProjectSyncJobService,
  ProjectSyncJobExecutionData,
  ProjectSyncJobExportPayload,
} from '@grantjs/core';
import {
  CdmFindBy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  type Scope,
  type SyncProjectInput,
  type SyncProjectResult,
} from '@grantjs/schema';

import { assertValidCdmExportSections } from '@/constants/cdm-export.constants';
import { PROJECT_SYNC_JOB_ID } from '@/constants/project-sync.constants';
import { ConflictError, ValidationError } from '@/lib/errors';
import {
  assertTenantActive,
  type JobExecutionContext,
  type JobResult,
  type ScheduledJob,
  validateTenantJobContext,
} from '@/lib/jobs';
import { Job } from '@/lib/jobs/base/job';
import { scopeToRlsContext, setRlsContext } from '@/lib/rls';
import { DrizzleTransactionalConnection, type Transaction } from '@/lib/transaction-manager.lib';

export default class ProjectSyncJob extends Job {
  readonly config: ScheduledJob = {
    id: PROJECT_SYNC_JOB_ID,
    schedule: '',
    enabled: true,
    enqueueOnly: true,
  };

  async execute(context: JobExecutionContext): Promise<JobResult> {
    validateTenantJobContext(context, true);
    const enqueueScope = context.scope as Scope;
    await assertTenantActive(enqueueScope, this.appContext.db);

    const jobRecordId = this.extractJobRecordId(context.payload);

    const { projectSyncJobs: jobService, projectImport, projectExport } = this.appContext.services;

    const execData = await this.withEnqueueScopeRls(enqueueScope, (tx) =>
      jobService.loadForExecution({ jobId: jobRecordId }, tx)
    );
    this.assertScopesMatch(enqueueScope, execData.scope);

    if (execData.cancelRequested || execData.job.status === ProjectSyncJobStatus.Cancelled) {
      this.logger.info({
        jobRecordId,
        msg: 'Skipping project sync job because it was cancelled before execution',
      });
      return {
        success: true,
        message: 'Cancelled before execution',
      };
    }

    if (execData.job.status !== ProjectSyncJobStatus.Pending) {
      throw new ConflictError(
        `Cannot execute project-sync job ${jobRecordId} from status ${execData.job.status}`
      );
    }

    await this.withEnqueueScopeRls(enqueueScope, (tx) =>
      jobService.transitionToRunning({ jobId: jobRecordId }, tx)
    );

    if (execData.job.operation === ProjectSyncJobOperation.Export) {
      return this.executeExportJob({
        enqueueScope,
        jobRecordId,
        execData,
        jobService,
        projectExport,
      });
    }

    const importPayload = execData.payload as SyncProjectInput;
    let result: SyncProjectResult;
    try {
      const txConn = new DrizzleTransactionalConnection(this.appContext.db);
      result = await txConn.withTransaction(async (tx: Transaction) => {
        await setRlsContext(tx, scopeToRlsContext(execData.scope));

        /**
         * Capture a pre-sync rollback snapshot inside the same transaction
         * as the import, BEFORE we call into the sync service (which begins
         * with `teardownCdmEntities` and immediately mutates project state).
         *
         * Why inside the transaction: the snapshot must commit if and only
         * if the import commits. If `importProjectCdm` throws, the whole
         * transaction rolls back — including the snapshot write.
         */
        const takenAt = new Date();
        const snapshot = await projectExport.exportProjectCdm(
          {
            projectId: execData.job.projectId,
            scope: execData.scope,
            version: importPayload.version,
          },
          tx
        );
        await jobService.saveSnapshot({ jobId: jobRecordId, snapshot, takenAt }, tx);
        return projectImport.importProjectCdm(
          {
            projectId: execData.job.projectId,
            scope: execData.scope,
            input: importPayload,
          },
          tx
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const details = this.serializeErrorDetails(error);
      try {
        await this.withEnqueueScopeRls(enqueueScope, (tx) =>
          jobService.markFailed(
            {
              jobId: jobRecordId,
              errorMessage: message,
              errorDetails: details,
            },
            tx
          )
        );
      } catch (markErr) {
        this.logger.error({
          jobRecordId,
          err: markErr,
          msg: 'Failed to mark project-sync job as failed; original error will still be rethrown',
        });
      }
      throw error;
    }

    const warnings = Array.isArray(result.warnings) ? result.warnings.filter(Boolean) : [];
    await this.withEnqueueScopeRls(enqueueScope, (tx) =>
      jobService.markCompleted(
        {
          jobId: jobRecordId,
          result,
          warnings,
        },
        tx
      )
    );

    const userIds = this.collectUserIds(execData);
    try {
      await projectImport.invalidateCachesForImportResult({
        scope: execData.scope,
        userIds,
      });
    } catch (cacheErr) {
      this.logger.warn({
        jobRecordId,
        err: cacheErr,
        msg: 'CDM import committed but cache invalidation failed; clients may serve stale data until TTL',
      });
    }

    return {
      success: true,
      data: {
        jobRecordId,
        projectId: execData.job.projectId,
        rolesCreated: result.rolesCreated,
        groupsCreated: result.groupsCreated,
        userRolesAssigned: result.userRolesAssigned,
        warnings: warnings.length,
      },
    };
  }

  private async executeExportJob(params: {
    enqueueScope: Scope;
    jobRecordId: string;
    execData: ProjectSyncJobExecutionData;
    jobService: IProjectSyncJobService;
    projectExport: IProjectExportService;
  }): Promise<JobResult> {
    const { enqueueScope, jobRecordId, execData, jobService, projectExport } = params;
    const raw = execData.payload as ProjectSyncJobExportPayload;
    if (raw == null || typeof raw !== 'object' || typeof raw.version !== 'number') {
      const err = new Error('Invalid export job payload: expected { version: number, ... }');
      await this.markJobFailedSafe(enqueueScope, jobRecordId, jobService, err);
      throw err;
    }
    const sections =
      Array.isArray(raw.sections) && raw.sections.length > 0
        ? assertValidCdmExportSections(raw.sections)
        : undefined;

    try {
      const txConn = new DrizzleTransactionalConnection(this.appContext.db);
      await txConn.withTransaction(async (tx: Transaction) => {
        await setRlsContext(tx, scopeToRlsContext(execData.scope));
        const takenAt = new Date();
        const snapshot = await projectExport.exportProjectCdm(
          {
            projectId: execData.job.projectId,
            scope: execData.scope,
            version: raw.version,
            sections,
            includeUserApiKeys: raw.includeUserApiKeys,
            mode: raw.mode,
          },
          tx
        );
        await jobService.saveSnapshot({ jobId: jobRecordId, snapshot, takenAt }, tx);
        await jobService.markCompleted(
          {
            jobId: jobRecordId,
            result: null,
            warnings: [],
          },
          tx
        );
      });
    } catch (error) {
      await this.markJobFailedSafe(enqueueScope, jobRecordId, jobService, error);
      throw error;
    }

    return {
      success: true,
      data: {
        jobRecordId,
        projectId: execData.job.projectId,
        operation: 'export',
      },
    };
  }

  private async markJobFailedSafe(
    enqueueScope: Scope,
    jobRecordId: string,
    jobService: IProjectSyncJobService,
    error: unknown
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const details = this.serializeErrorDetails(error);
    try {
      await this.withEnqueueScopeRls(enqueueScope, (tx) =>
        jobService.markFailed(
          {
            jobId: jobRecordId,
            errorMessage: message,
            errorDetails: details,
          },
          tx
        )
      );
    } catch (markErr) {
      this.logger.error({
        jobRecordId,
        err: markErr,
        msg: 'Failed to mark project-sync job as failed; original error will still be rethrown',
      });
    }
  }

  /**
   * Apply the same RLS session variables as a scoped HTTP request for this job's tenant,
   * so worker queries see project-scoped rows under `project_sync_jobs` RLS.
   */
  private async withEnqueueScopeRls<T>(
    scope: Scope,
    fn: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    return this.appContext.db.transaction(async (tx) => {
      await setRlsContext(tx, scopeToRlsContext(scope));
      return fn(tx);
    });
  }

  private extractJobRecordId(payload: unknown): string {
    if (
      payload == null ||
      typeof payload !== 'object' ||
      !('jobRecordId' in payload) ||
      typeof (payload as { jobRecordId: unknown }).jobRecordId !== 'string' ||
      (payload as { jobRecordId: string }).jobRecordId.trim() === ''
    ) {
      throw new ValidationError(
        'project-sync job payload must include a non-empty jobRecordId string'
      );
    }
    return (payload as { jobRecordId: string }).jobRecordId;
  }

  private assertScopesMatch(enqueueScope: Scope, persistedScope: Scope): void {
    if (enqueueScope.tenant !== persistedScope.tenant || enqueueScope.id !== persistedScope.id) {
      throw new ConflictError(
        `project-sync scope mismatch: enqueue=${enqueueScope.tenant}:${enqueueScope.id} persisted=${persistedScope.tenant}:${persistedScope.id}`
      );
    }
  }

  private collectUserIds(execData: ProjectSyncJobExecutionData): string[] {
    if (execData.job.operation !== ProjectSyncJobOperation.Import) {
      return [];
    }
    const ids = new Set<string>();
    const payload = execData.payload as SyncProjectInput;
    for (const u of payload.users ?? []) {
      if (u.key.findBy === CdmFindBy.Id) {
        ids.add(u.key.value);
      }
    }
    return Array.from(ids);
  }

  private serializeErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return { value: String(error) };
  }
}
