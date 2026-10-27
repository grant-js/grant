import type {
  IFileStorageServicePort,
  IProjectExportService,
  IProjectSyncJobService,
  ProjectSyncJobExecutionData,
  ProjectSyncJobExportPayload,
  ProjectSyncJobPayloadReference,
} from '@grantjs/core';
import {
  CdmFindBy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  type Scope,
  type SyncProjectResult,
} from '@grantjs/schema';

import { config } from '@/config';
import { assertValidCdmExportSections } from '@/constants/cdm-export.constants';
import { PROJECT_SYNC_JOB_ID } from '@/constants/project-sync.constants';
import {
  type CdmDocumentInput,
  countCdmEntities,
  parseCdmDocument,
  validateSyncInput,
} from '@/lib/cdm/cdm-document.schemas';
import { CdmImportRefusal, CdmImportRefusedError } from '@/lib/cdm/cdm-import-upload.lib';
import { withHashedCdmApiKeySecrets } from '@/lib/cdm/hash-cdm-api-key-secrets.lib';
import {
  ConfigurationError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
} from '@/lib/errors';
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

  /**
   * Entry point for the queue consumer.
   *
   * Two runtimes, chosen by configuration (ADR 0002). `inprocess` runs the import here
   * and is bounded by whatever timeout this process has; `container` hands the row to a
   * runtime with no 15-minute ceiling and returns as soon as it is accepted.
   *
   * **`apply()` is what does the work, and the container calls it directly.** That is the
   * reason for the split rather than a flag: a container that re-entered `execute()` would
   * read the same configuration, dispatch again, and fan out one task per attempt
   * forever. Structuring it this way makes that unreachable instead of guarded against.
   */
  async execute(context: JobExecutionContext): Promise<JobResult> {
    validateTenantJobContext(context, true);
    const enqueueScope = context.scope as Scope;
    await assertTenantActive(enqueueScope, this.appContext.db);

    const jobRecordId = this.extractJobRecordId(context.payload);

    if (config.jobs.sync.runtime === 'container') {
      return this.dispatchToContainer(enqueueScope, jobRecordId);
    }

    return this.apply(enqueueScope, jobRecordId);
  }

  /**
   * Hand the execution to another runtime and report that, not its result.
   *
   * The job row stays `PENDING`/`RUNNING` and the started execution owns every later
   * transition, exactly as it would if this process had run it — the envelope is
   * unchanged, which is ADR 0002's requirement. A dispatch failure is *not* swallowed:
   * if no task started, something must mark the row failed, or a caller polls a job that
   * will never move.
   */
  private async dispatchToContainer(scope: Scope, jobRecordId: string): Promise<JobResult> {
    const runtime = this.appContext.syncRuntime;
    if (!runtime) {
      throw new ConfigurationError(
        'JOBS_SYNC_RUNTIME=container but no sync runtime adapter is wired. ' +
          'Refusing rather than silently running a 62-minute import under a 15-minute ceiling.'
      );
    }

    try {
      const { reference } = await runtime.start({ jobRecordId, scope });
      return {
        success: true,
        message: `Dispatched to container runtime (${reference})`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.withEnqueueScopeRls(scope, (tx) =>
        this.appContext.services.projectSyncJobs.markFailed(
          {
            jobId: jobRecordId,
            errorMessage: `Could not start the sync runtime: ${message}`,
            errorDetails: this.serializeErrorDetails(error),
          },
          tx
        )
      );
      throw error;
    }
  }

  /**
   * The import itself. Called by `execute()` on the in-process runtime, and directly by
   * `run-sync-job.ts` inside the container.
   */
  public async apply(enqueueScope: Scope, jobRecordId: string): Promise<JobResult> {
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
      // Only a job that is itself terminal gives its document up: `cancelRequested` is also
      // set on a RUNNING job, whose own run deletes the object when it reaches a terminal state.
      if (execData.job.status === ProjectSyncJobStatus.Cancelled) {
        await this.deleteImportObject(execData.payloadRef, jobRecordId);
      }
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

    /**
     * A by-reference document is fetched, validated and counted after the job has claimed
     * RUNNING and **before the import transaction opens** (ADR 0009): everything the document
     * can be refused for is decided while nothing has been touched, and a refusal marks the
     * job FAILED with a specific code.
     *
     * After the claim, not before it, on purpose. `transitionToRunning` is what refuses a
     * redelivered message, so a second consumer never gets as far as the download, and
     * cannot fail a job the first is still importing. Inline imports have no such step; their
     * document was validated when it was accepted.
     */
    let importPayload: CdmDocumentInput;
    if (execData.payloadRef) {
      try {
        importPayload = await this.loadReferencedDocument(execData);
      } catch (error) {
        // Delete first, while the row is still RUNNING. `markFailed` releases the upload from
        // the unique index on `payload_path`; deleting after it leaves a window in which a new
        // start can attach a job to this uploadId and then lose its object.
        //
        // A store that failed to answer is not a verdict on the document: it may be there and
        // intact. Leave it for a retry (marking it FAILED is what releases the index for one);
        // the lifecycle rule is the backstop. Every other refusal is about the document itself,
        // which no retry changes, so it goes.
        if (!this.isStorageFailure(error)) {
          await this.deleteImportObject(execData.payloadRef, jobRecordId);
        }
        await this.markJobFailedSafe(enqueueScope, jobRecordId, jobService, error);
        throw error;
      }
    } else {
      importPayload = execData.payload as CdmDocumentInput;
    }

    let result: SyncProjectResult;
    try {
      const txConn = new DrizzleTransactionalConnection(this.appContext.db);
      result = await withHashedCdmApiKeySecrets(importPayload, () =>
        txConn.withTransaction(async (tx: Transaction) => {
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
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const details = this.serializeErrorDetails(error);
      // Before `markFailed`, for the reason given at the refusal path above: FAILED releases the
      // upload, so the object must already be gone when it does.
      await this.deleteImportObject(execData.payloadRef, jobRecordId);
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

    await this.deleteImportObject(execData.payloadRef, jobRecordId);

    const userIds = this.collectUserIds(execData, importPayload);
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
      const err = new ValidationError(
        'Invalid export job payload: expected { version: number, ... }'
      );
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

  private collectUserIds(
    execData: ProjectSyncJobExecutionData,
    importPayload: CdmDocumentInput
  ): string[] {
    if (execData.job.operation !== ProjectSyncJobOperation.Import) {
      return [];
    }
    const ids = new Set<string>();
    for (const u of importPayload.users) {
      if (u.key.findBy === CdmFindBy.Id) {
        ids.add(u.key.value);
      }
    }
    return Array.from(ids);
  }

  /**
   * Read a by-reference import's document out of the store and decide whether it may be
   * applied. Throws {@link CdmImportRefusedError} for every way it may not; nothing here
   * touches the database, so a refusal changes nothing.
   *
   * The object is treated as untrusted input. The mint and start checks bound its size and
   * type, but a presigned URL is replayable inside its window, so the bytes are capped again
   * by `download()` itself, parsed, and held to the same schema and `validateSyncInput` rules
   * as an inline body, with the same document the REST layer describes.
   */
  private async loadReferencedDocument(
    execData: ProjectSyncJobExecutionData
  ): Promise<CdmDocumentInput> {
    const reference = execData.payloadRef!;
    const { maxBytes } = config.storage.cdmImport;
    const fileStorage = this.appContext.services.fileStorage as IFileStorageServicePort;

    let bytes: Buffer;
    try {
      bytes = await fileStorage.download(reference.path, { maxBytes });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new CdmImportRefusedError(
          CdmImportRefusal.UploadMissing,
          'The uploaded CDM document no longer exists (it may have expired). Upload it again and start a new import.',
          {},
          error
        );
      }
      if (error instanceof PayloadTooLargeError) {
        throw new CdmImportRefusedError(
          CdmImportRefusal.DocumentTooLarge,
          `The uploaded CDM document is larger than the ${maxBytes}-byte maximum (CDM_UPLOAD_MAX_BYTES).`,
          { maxBytes },
          error
        );
      }
      throw new CdmImportRefusedError(
        CdmImportRefusal.StorageFailure,
        'The uploaded CDM document could not be read from storage.',
        {},
        error instanceof Error ? error : undefined
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(bytes.toString('utf8'));
    } catch (error) {
      throw new CdmImportRefusedError(
        CdmImportRefusal.DocumentNotJson,
        `The uploaded CDM document is not valid JSON (${error instanceof Error ? error.message : 'parse error'}).`,
        {},
        error instanceof Error ? error : undefined
      );
    }

    let document: CdmDocumentInput;
    try {
      const parsed = parseCdmDocument(raw);
      validateSyncInput(parsed, { redactUserKeys: true });
      document = parsed as unknown as CdmDocumentInput;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new CdmImportRefusedError(
          CdmImportRefusal.DocumentInvalid,
          error.message,
          { violations: error.violations },
          error
        );
      }
      throw error;
    }

    this.assertDocumentMatchesRequest(document, execData.job);
    this.assertWithinEntityLimit(document);

    return document;
  }

  /**
   * The request carried `mode` (and optionally `version`); the document carries its own.
   * They must agree: the synchronous `replace` confirmation was checked against the
   * request, and an upload must not be able to widen what was confirmed. Only the strategy
   * and version are persisted on the job row, so those are what can be compared here.
   */
  private assertDocumentMatchesRequest(
    document: CdmDocumentInput,
    job: ProjectSyncJobExecutionData['job']
  ): void {
    const requestStrategy = job.modeStrategy;
    if (requestStrategy != null && document.mode.strategy !== requestStrategy) {
      throw new CdmImportRefusedError(
        CdmImportRefusal.RequestMismatch,
        `The document's mode.strategy is '${document.mode.strategy}' but the import was requested as '${requestStrategy}'.`,
        { requestStrategy, documentStrategy: document.mode.strategy }
      );
    }
    if (document.version !== job.cdmVersion) {
      throw new CdmImportRefusedError(
        CdmImportRefusal.RequestMismatch,
        `The document's version is ${document.version} but the import was requested as version ${job.cdmVersion}.`,
        { requestVersion: job.cdmVersion, documentVersion: document.version }
      );
    }
  }

  /**
   * The in-process runtime cannot finish an import of unbounded size inside its ceiling,
   * and by-reference removes the body limit that used to refuse such documents by accident.
   * Refuse here, before the import transaction, rather than after a 15-minute run that
   * rolls back. `0` is unlimited, for container-runtime deployments.
   */
  private assertWithinEntityLimit(document: CdmDocumentInput): void {
    const limit = config.cdm.maxImportEntities;
    if (limit === 0) {
      return;
    }
    const entityCount = countCdmEntities(document);
    if (entityCount > limit) {
      throw new CdmImportRefusedError(
        CdmImportRefusal.TooManyEntities,
        `The document holds ${entityCount} entities but this deployment accepts at most ${limit} per import (CDM_IMPORT_MAX_ENTITIES). Split it, or raise the limit where the import runs in a container.`,
        { entityCount, limit }
      );
    }
  }

  private isStorageFailure(error: unknown): boolean {
    return (
      error instanceof CdmImportRefusedError && error.refusal === CdmImportRefusal.StorageFailure
    );
  }

  /**
   * Delete a by-reference import's object once its job is terminal. Best effort and never
   * thrown: a failed delete must not turn a finished import into a failed job, and the
   * lifecycle rule on `imports/` is the backstop for the object that survives.
   */
  private async deleteImportObject(
    reference: ProjectSyncJobPayloadReference | null,
    jobRecordId: string
  ): Promise<void> {
    if (!reference) {
      return;
    }
    try {
      await this.appContext.services.fileStorage.delete(reference.path);
      this.logger.info({
        jobRecordId,
        msg: 'Deleted the CDM import object after the job reached a terminal state',
      });
    } catch (error) {
      this.logger.warn({
        jobRecordId,
        err: error,
        msg: 'Could not delete the CDM import object; the storage lifecycle rule will expire it',
      });
    }
  }

  private serializeErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof CdmImportRefusedError) {
      return {
        name: error.name,
        code: error.refusal,
        message: error.message,
        details: error.details,
      };
    }
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
