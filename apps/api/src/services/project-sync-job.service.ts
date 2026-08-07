import type {
  IAuditLogger,
  IEventPublisher,
  IProjectSyncJobService,
  ProjectSyncJobExecutionData,
} from '@grantjs/core';
import {
  ProjectSyncJob,
  ProjectSyncJobOperation,
  ProjectSyncJobPage,
  ProjectSyncJobSortInput,
  ProjectSyncJobStatus,
  Scope,
  SyncProjectInput,
  SyncProjectResult,
  Tenant,
} from '@grantjs/schema';

import { config } from '@/config';
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { hasNextPageByCount } from '@/lib/pagination.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { ProjectSyncJobRepository } from '@/repositories/project-sync-job.repository';

const ALLOWED_SCOPES: readonly string[] = [Tenant.AccountProject, Tenant.OrganizationProject];

function compactJobSummary(job: ProjectSyncJob): Record<string, unknown> {
  return {
    status: job.status,
    projectId: job.projectId,
    cdmVersion: job.cdmVersion,
    jobName: job.jobName,
    operation: job.operation,
    modeStrategy: job.modeStrategy,
  };
}

function compactResultSummary(result: SyncProjectResult): Record<string, unknown> {
  return {
    rolesCreated: result.rolesCreated,
    groupsCreated: result.groupsCreated,
    roleGroupsLinked: result.roleGroupsLinked,
    groupPermissionsLinked: result.groupPermissionsLinked,
    projectRolesLinked: result.projectRolesLinked,
    projectGroupsLinked: result.projectGroupsLinked,
    projectPermissionsLinked: result.projectPermissionsLinked,
    projectResourcesLinked: result.projectResourcesLinked,
    projectUsersEnsured: result.projectUsersEnsured,
    usersCreated: result.usersCreated,
    userRolesAssigned: result.userRolesAssigned,
    projectUserApiKeysCreated: result.projectUserApiKeysCreated,
    warningsCount: Array.isArray(result.warnings) ? result.warnings.length : 0,
  };
}

function projectSyncCompletedPayload(params: {
  jobId: string;
  projectId: string;
  operation: ProjectSyncJobOperation;
  warningCount: number;
  result: SyncProjectResult | null;
}): Record<string, unknown> {
  const after: Record<string, unknown> = {
    jobId: params.jobId,
    projectId: params.projectId,
    operation: operationLabel(params.operation),
    warningCount: params.warningCount,
  };
  if (params.result) {
    const { warningsCount: _ignored, ...counters } = compactResultSummary(params.result);
    Object.assign(after, counters);
  }
  return after;
}

function operationLabel(operation: ProjectSyncJobOperation): 'import' | 'export' {
  return operation === ProjectSyncJobOperation.Export ? 'export' : 'import';
}

/**
 * State-machine service for the asynchronous CDM project sync job tracking
 * row. Owns persistence + lifecycle transitions only; the actual import is
 * performed by `IProjectImportService` (called by the worker).
 */
export class ProjectSyncJobService implements IProjectSyncJobService {
  constructor(
    private readonly repo: ProjectSyncJobRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  public async create(
    params: {
      projectId: string;
      scope: Scope;
      cdmVersion: number;
      jobName: string | null;
      operation: 'import' | 'export';
      modeStrategy: 'merge' | 'replace' | null;
      payload: unknown;
      enqueuedById: string;
    },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    if (!ALLOWED_SCOPES.includes(params.scope.tenant)) {
      throw new BadRequestError(
        `Project sync jobs require accountProject or organizationProject scope, got: ${params.scope.tenant}`
      );
    }
    if (params.cdmVersion !== 1) {
      throw new ValidationError('Unsupported cdmVersion; only 1 is allowed');
    }

    const job = await this.repo.insert(
      {
        projectId: params.projectId,
        scopeTenant: params.scope.tenant,
        scopeId: params.scope.id,
        cdmVersion: params.cdmVersion,
        jobName: params.jobName,
        operation: params.operation,
        modeStrategy: params.modeStrategy,
        payload: params.payload,
        enqueuedById: params.enqueuedById,
      },
      transaction
    );
    await this.audit.logCreate(
      job.id,
      compactJobSummary(job),
      { projectId: params.projectId },
      transaction
    );
    return job;
  }

  public async getById(
    params: { projectId: string; jobId: string },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    const row = await this.repo.getById(params.jobId, transaction);
    if (!row || row.projectId !== params.projectId) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    return row;
  }

  public async list(
    params: {
      projectId: string;
      scope: Scope;
      page?: number | null;
      limit?: number | null;
      search?: string | null;
      sort?: ProjectSyncJobSortInput | null;
      status?: ProjectSyncJobStatus | null;
    },
    transaction?: Transaction
  ): Promise<ProjectSyncJobPage> {
    if (!ALLOWED_SCOPES.includes(params.scope.tenant)) {
      throw new BadRequestError(
        `Project sync jobs require accountProject or organizationProject scope, got: ${params.scope.tenant}`
      );
    }

    const page = Math.max(1, params.page ?? 1);
    const requestedLimit = params.limit ?? config.system.defaultPageSize;
    const limit = requestedLimit < 0 ? 0 : Math.min(requestedLimit, 200);

    const { items, totalCount } = await this.repo.listByProject(
      {
        projectId: params.projectId,
        scopeTenant: params.scope.tenant,
        scopeId: params.scope.id,
        page,
        limit,
        search: params.search ?? null,
        sort: params.sort ?? null,
        status: params.status ?? null,
      },
      transaction
    );

    const hasNextPage = hasNextPageByCount({ page, limit, totalCount });

    return {
      jobs: items,
      totalCount,
      hasNextPage,
    };
  }

  public async getPayload(
    params: { projectId: string; jobId: string },
    transaction?: Transaction
  ): Promise<{
    payload: unknown;
    jobName: string | null;
    cdmVersion: number;
  }> {
    const row = await this.repo.getPayloadById(params.jobId, transaction);
    if (!row || row.projectId !== params.projectId) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    return {
      payload: row.payload,
      jobName: row.jobName,
      cdmVersion: row.cdmVersion,
    };
  }

  public async loadForExecution(
    params: { jobId: string },
    transaction?: Transaction
  ): Promise<ProjectSyncJobExecutionData> {
    const full = await this.repo.getFullById(params.jobId, transaction);
    if (!full) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    return {
      job: full.job,
      payload: full.payload,
      scope: { tenant: full.scopeTenant as Tenant, id: full.scopeId },
      cancelRequested: full.cancelRequested,
    };
  }

  public async findActiveByJobKey(
    params: {
      projectId: string;
      operation: 'import' | 'export';
      jobName: string;
      statuses?: readonly string[];
    },
    transaction?: Transaction
  ): Promise<ProjectSyncJob | null> {
    return this.repo.findActiveByJobKey(params, transaction);
  }

  public async transitionToRunning(
    params: { jobId: string },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    const current = await this.repo.getById(params.jobId, transaction);
    if (!current) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    if (current.status !== ProjectSyncJobStatus.Pending) {
      throw new ConflictError(
        `Cannot transition job ${params.jobId} to RUNNING from status ${current.status}`
      );
    }
    const updated = await this.repo.updateStatus(
      {
        jobId: params.jobId,
        status: ProjectSyncJobStatus.Running,
        startedAt: new Date(),
      },
      transaction
    );
    await this.audit.logUpdate(
      params.jobId,
      compactJobSummary(current),
      compactJobSummary(updated),
      { transition: 'PENDING_TO_RUNNING' },
      transaction
    );
    return updated;
  }

  public async markCompleted(
    params: {
      jobId: string;
      result: SyncProjectResult | null;
      warnings: string[];
    },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    const full = await this.repo.getFullById(params.jobId, transaction);
    if (!full) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    const current = full.job;
    if (current.status !== ProjectSyncJobStatus.Running) {
      throw new ConflictError(
        `Cannot mark job ${params.jobId} COMPLETED from status ${current.status}`
      );
    }
    const updated = await this.repo.updateStatus(
      {
        jobId: params.jobId,
        status: ProjectSyncJobStatus.Completed,
        completedAt: new Date(),
        result: params.result,
        warnings: params.warnings,
      },
      transaction
    );
    await this.audit.logUpdate(
      params.jobId,
      compactJobSummary(current),
      {
        ...compactJobSummary(updated),
        ...(params.result ? compactResultSummary(params.result) : { exportCompleted: true }),
      },
      { transition: 'RUNNING_TO_COMPLETED' },
      transaction
    );

    const scope: Scope = { tenant: full.scopeTenant as Tenant, id: full.scopeId };
    await this.events.publish(
      {
        type: 'project_sync.completed',
        scope,
        aggregate: { kind: 'project', id: current.projectId },
        data: {
          after: projectSyncCompletedPayload({
            jobId: params.jobId,
            projectId: current.projectId,
            operation: current.operation,
            warningCount: params.warnings.length,
            result: params.result,
          }),
        },
      },
      transaction
    );

    return updated;
  }

  public async markFailed(
    params: { jobId: string; errorMessage: string; errorDetails?: Record<string, unknown> | null },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    const full = await this.repo.getFullById(params.jobId, transaction);
    if (!full) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    const current = full.job;
    if (
      current.status !== ProjectSyncJobStatus.Running &&
      current.status !== ProjectSyncJobStatus.Pending
    ) {
      throw new ConflictError(
        `Cannot mark job ${params.jobId} FAILED from status ${current.status}`
      );
    }
    const updated = await this.repo.updateStatus(
      {
        jobId: params.jobId,
        status: ProjectSyncJobStatus.Failed,
        completedAt: new Date(),
        errorMessage: params.errorMessage,
        errorDetails: params.errorDetails ?? null,
      },
      transaction
    );
    const truncatedError =
      params.errorMessage.length > 400
        ? `${params.errorMessage.slice(0, 397)}...`
        : params.errorMessage;
    await this.audit.logUpdate(
      params.jobId,
      compactJobSummary(current),
      {
        ...compactJobSummary(updated),
        errorMessage: truncatedError,
      },
      { transition: 'TO_FAILED' },
      transaction
    );

    const scope: Scope = { tenant: full.scopeTenant as Tenant, id: full.scopeId };
    await this.events.publish(
      {
        type: 'project_sync.failed',
        scope,
        aggregate: { kind: 'project', id: current.projectId },
        data: {
          after: {
            jobId: params.jobId,
            projectId: current.projectId,
            operation: operationLabel(current.operation),
            errorMessage: truncatedError,
          },
        },
      },
      transaction
    );

    return updated;
  }

  public async saveSnapshot(
    params: { jobId: string; snapshot: SyncProjectInput; takenAt: Date },
    transaction?: Transaction
  ): Promise<void> {
    const sizeBytes = Buffer.byteLength(JSON.stringify(params.snapshot), 'utf8');
    await this.repo.updateSnapshot(
      {
        jobId: params.jobId,
        snapshot: params.snapshot,
        takenAt: params.takenAt,
        sizeBytes,
      },
      transaction
    );
    await this.audit.logAction(
      {
        entityId: params.jobId,
        action: 'SNAPSHOT_CAPTURED',
        oldValues: null,
        newValues: { snapshotSizeBytes: sizeBytes },
        metadata: { snapshotTakenAt: params.takenAt.toISOString() },
      },
      transaction
    );
  }

  public async getSnapshot(
    params: { projectId: string; jobId: string },
    transaction?: Transaction
  ): Promise<{
    snapshot: SyncProjectInput;
    takenAt: Date;
    sizeBytes: number;
  } | null> {
    const row = await this.repo.getSnapshotById(params.jobId, transaction);
    if (!row) return null;
    if (row.projectId !== params.projectId) {
      return null;
    }
    return {
      snapshot: row.snapshot,
      takenAt: row.takenAt,
      sizeBytes: row.sizeBytes,
    };
  }

  public async cancel(
    params: { projectId: string; jobId: string },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    const current = await this.repo.getById(params.jobId, transaction);
    if (!current || current.projectId !== params.projectId) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    if (current.status === ProjectSyncJobStatus.Pending) {
      const updated = await this.repo.updateStatus(
        {
          jobId: params.jobId,
          status: ProjectSyncJobStatus.Cancelled,
          cancelledAt: new Date(),
          cancelRequested: new Date(),
        },
        transaction
      );
      await this.audit.logUpdate(
        params.jobId,
        compactJobSummary(current),
        compactJobSummary(updated),
        { transition: 'PENDING_TO_CANCELLED' },
        transaction
      );
      return updated;
    }
    if (current.status === ProjectSyncJobStatus.Running) {
      const requestedAt = new Date();
      const updated = await this.repo.updateStatus(
        {
          jobId: params.jobId,
          status: ProjectSyncJobStatus.Running,
          cancelRequested: requestedAt,
        },
        transaction
      );
      await this.audit.logAction(
        {
          entityId: params.jobId,
          action: 'CANCEL_REQUESTED',
          oldValues: compactJobSummary(current),
          newValues: { cancelRequestedAt: requestedAt.toISOString() },
          metadata: { note: 'running_job_soft_cancel' },
        },
        transaction
      );
      return updated;
    }
    throw new ConflictError(
      `Cannot cancel job ${params.jobId} in terminal status ${current.status}`
    );
  }
}
