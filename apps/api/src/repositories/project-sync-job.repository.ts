import type {
  IProjectSyncJobRepository,
  ListProjectSyncJobsParams,
  ProjectSyncJobFull,
  ProjectSyncJobPayloadRow,
  ProjectSyncJobSnapshotRow,
} from '@grantjs/core';
import {
  type DbSchema,
  type NewProjectSyncJobModel,
  type ProjectSyncJobModel,
  projectSyncJobs,
} from '@grantjs/database';
import {
  CdmModeStrategy,
  ProjectSyncJob,
  ProjectSyncJobOperation,
  ProjectSyncJobSortableField,
  ProjectSyncJobStatus,
  SortOrder,
  SyncProjectInput,
  SyncProjectResult,
} from '@grantjs/schema';
import {
  and,
  asc,
  count as drizzleCount,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { config } from '@/config';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

const STATUS_DB_TO_GQL: Record<string, ProjectSyncJobStatus> = {
  pending: ProjectSyncJobStatus.Pending,
  running: ProjectSyncJobStatus.Running,
  completed: ProjectSyncJobStatus.Completed,
  failed: ProjectSyncJobStatus.Failed,
  cancelled: ProjectSyncJobStatus.Cancelled,
};

const STATUS_GQL_TO_DB: Record<ProjectSyncJobStatus, string> = {
  [ProjectSyncJobStatus.Pending]: 'pending',
  [ProjectSyncJobStatus.Running]: 'running',
  [ProjectSyncJobStatus.Completed]: 'completed',
  [ProjectSyncJobStatus.Failed]: 'failed',
  [ProjectSyncJobStatus.Cancelled]: 'cancelled',
};

/** Default idempotency statuses for import jobs (pending, running, or completed). */
const DEFAULT_IDEMPOTENCY_DB_STATUSES = ['pending', 'running', 'completed'];

const OPERATION_DB_TO_GQL: Record<string, ProjectSyncJobOperation> = {
  import: ProjectSyncJobOperation.Import,
  export: ProjectSyncJobOperation.Export,
};

const MODE_STRATEGY_DB_TO_GQL: Record<string, CdmModeStrategy> = {
  merge: CdmModeStrategy.Merge,
  replace: CdmModeStrategy.Replace,
};

function mapModeStrategyDbToGql(raw: string | null): CdmModeStrategy | null {
  if (raw == null || raw === '') return null;
  return MODE_STRATEGY_DB_TO_GQL[raw] ?? null;
}

function normalizeSyncJobResult(raw: unknown): SyncProjectResult | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  return {
    projectId: String(r.projectId ?? ''),
    importId: (r.importId as string | null | undefined) ?? null,
    rolesCreated: Number(r.rolesCreated ?? 0),
    groupsCreated: Number(r.groupsCreated ?? 0),
    roleGroupsLinked: Number(r.roleGroupsLinked ?? 0),
    groupPermissionsLinked: Number(r.groupPermissionsLinked ?? 0),
    projectRolesLinked: Number(r.projectRolesLinked ?? 0),
    projectGroupsLinked: Number(r.projectGroupsLinked ?? 0),
    projectPermissionsLinked: Number(r.projectPermissionsLinked ?? 0),
    projectResourcesLinked: Number(r.projectResourcesLinked ?? 0),
    projectUsersEnsured: Number(r.projectUsersEnsured ?? 0),
    usersCreated: Number(r.usersCreated ?? 0),
    userRolesAssigned: Number(r.userRolesAssigned ?? 0),
    projectUserApiKeysCreated: Number(r.projectUserApiKeysCreated ?? 0),
    tagsCreated: Number(r.tagsCreated ?? 0),
    projectTagsLinked: Number(r.projectTagsLinked ?? 0),
    roleTagsLinked: Number(r.roleTagsLinked ?? 0),
    groupTagsLinked: Number(r.groupTagsLinked ?? 0),
    userTagsLinked: Number(r.userTagsLinked ?? 0),
    resourcesCreated: Number(r.resourcesCreated ?? 0),
    permissionsCreated: Number(r.permissionsCreated ?? 0),
    warnings: Array.isArray(r.warnings) ? (r.warnings as string[]) : [],
  };
}

/** Columns loaded for paginated list queries — excludes payload, snapshot, and result blobs. */
const listJobColumns = {
  id: projectSyncJobs.id,
  projectId: projectSyncJobs.projectId,
  status: projectSyncJobs.status,
  cdmVersion: projectSyncJobs.cdmVersion,
  jobName: projectSyncJobs.jobName,
  operation: projectSyncJobs.operation,
  modeStrategy: projectSyncJobs.modeStrategy,
  warnings: projectSyncJobs.warnings,
  errorMessage: projectSyncJobs.errorMessage,
  createdAt: projectSyncJobs.createdAt,
  startedAt: projectSyncJobs.startedAt,
  completedAt: projectSyncJobs.completedAt,
  cancelledAt: projectSyncJobs.cancelledAt,
  hasSnapshot: sql<boolean>`(${projectSyncJobs.snapshot} IS NOT NULL)`.as('has_snapshot'),
  snapshotTakenAt: projectSyncJobs.snapshotTakenAt,
  snapshotSizeBytes: projectSyncJobs.snapshotSizeBytes,
};

type ProjectSyncJobListRow = {
  id: string;
  projectId: string;
  status: string;
  cdmVersion: number;
  jobName: string | null;
  operation: string;
  modeStrategy: string | null;
  warnings: unknown;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  hasSnapshot: boolean;
  snapshotTakenAt: Date | null;
  snapshotSizeBytes: number | null;
};

function toEntity(row: ProjectSyncJobModel): ProjectSyncJob {
  const status = STATUS_DB_TO_GQL[row.status] ?? ProjectSyncJobStatus.Pending;
  const operation = OPERATION_DB_TO_GQL[row.operation] ?? ProjectSyncJobOperation.Import;
  return {
    id: row.id,
    projectId: row.projectId,
    status,
    cdmVersion: row.cdmVersion,
    jobName: row.jobName ?? null,
    operation,
    modeStrategy: mapModeStrategyDbToGql(row.modeStrategy ?? null),
    result: row.result == null ? null : normalizeSyncJobResult(row.result),
    warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
    errorMessage: row.errorMessage ?? null,
    enqueuedAt: row.createdAt,
    startedAt: row.startedAt ?? null,
    completedAt: row.completedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    hasSnapshot: row.snapshot != null,
    snapshotTakenAt: row.snapshotTakenAt ?? null,
    snapshotSizeBytes: row.snapshotSizeBytes ?? null,
  };
}

function toListEntity(row: ProjectSyncJobListRow): ProjectSyncJob {
  const status = STATUS_DB_TO_GQL[row.status] ?? ProjectSyncJobStatus.Pending;
  const operation = OPERATION_DB_TO_GQL[row.operation] ?? ProjectSyncJobOperation.Import;
  return {
    id: row.id,
    projectId: row.projectId,
    status,
    cdmVersion: row.cdmVersion,
    jobName: row.jobName ?? null,
    operation,
    modeStrategy: mapModeStrategyDbToGql(row.modeStrategy ?? null),
    result: null,
    warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
    errorMessage: row.errorMessage ?? null,
    enqueuedAt: row.createdAt,
    startedAt: row.startedAt ?? null,
    completedAt: row.completedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    hasSnapshot: row.hasSnapshot,
    snapshotTakenAt: row.snapshotTakenAt ?? null,
    snapshotSizeBytes: row.snapshotSizeBytes ?? null,
  };
}

export class ProjectSyncJobRepository implements IProjectSyncJobRepository {
  constructor(private readonly db: DbSchema) {}

  public async insert(
    params: {
      projectId: string;
      scopeTenant: string;
      scopeId: string;
      cdmVersion: number;
      jobName: string | null;
      operation: 'import' | 'export';
      modeStrategy: 'merge' | 'replace' | null;
      payload: unknown;
      enqueuedById: string;
    },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    const dbInstance = transaction ?? this.db;
    const values: NewProjectSyncJobModel = {
      projectId: params.projectId,
      scopeTenant: params.scopeTenant,
      scopeId: params.scopeId,
      cdmVersion: params.cdmVersion,
      jobName: params.jobName,
      operation: params.operation,
      modeStrategy: params.modeStrategy,
      status: 'pending',
      payload: params.payload as unknown as NewProjectSyncJobModel['payload'],
      warnings: [] as unknown as NewProjectSyncJobModel['warnings'],
      enqueuedById: params.enqueuedById,
    };
    const [row] = await dbInstance.insert(projectSyncJobs).values(values).returning();
    if (!row) {
      throw new ValidationError('Failed to persist project sync job');
    }
    return toEntity(row);
  }

  public async getById(jobId: string, transaction?: Transaction): Promise<ProjectSyncJob | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select()
      .from(projectSyncJobs)
      .where(and(eq(projectSyncJobs.id, jobId), isNull(projectSyncJobs.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  public async getFullById(
    jobId: string,
    transaction?: Transaction
  ): Promise<ProjectSyncJobFull | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select()
      .from(projectSyncJobs)
      .where(and(eq(projectSyncJobs.id, jobId), isNull(projectSyncJobs.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      job: toEntity(row),
      payload: row.payload as unknown,
      scopeTenant: row.scopeTenant,
      scopeId: row.scopeId,
      cancelRequested: row.cancelRequested != null,
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
    const dbInstance = transaction ?? this.db;
    const statuses = params.statuses ?? DEFAULT_IDEMPOTENCY_DB_STATUSES;
    const rows = await dbInstance
      .select()
      .from(projectSyncJobs)
      .where(
        and(
          eq(projectSyncJobs.projectId, params.projectId),
          eq(projectSyncJobs.operation, params.operation),
          eq(projectSyncJobs.jobName, params.jobName),
          isNull(projectSyncJobs.deletedAt),
          inArray(projectSyncJobs.status, [...statuses])
        )
      )
      .orderBy(desc(projectSyncJobs.createdAt))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  public async getPayloadById(
    jobId: string,
    transaction?: Transaction
  ): Promise<ProjectSyncJobPayloadRow | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        payload: projectSyncJobs.payload,
        jobName: projectSyncJobs.jobName,
        cdmVersion: projectSyncJobs.cdmVersion,
        projectId: projectSyncJobs.projectId,
      })
      .from(projectSyncJobs)
      .where(and(eq(projectSyncJobs.id, jobId), isNull(projectSyncJobs.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      payload: row.payload as unknown,
      jobName: row.jobName ?? null,
      cdmVersion: row.cdmVersion,
      projectId: row.projectId,
    };
  }

  public async listByProject(
    params: ListProjectSyncJobsParams,
    transaction?: Transaction
  ): Promise<{ items: ProjectSyncJob[]; totalCount: number }> {
    const dbInstance = transaction ?? this.db;

    const page = Math.max(1, params.page ?? 1);
    const requestedLimit = params.limit ?? config.system.defaultPageSize;
    const limit = requestedLimit < 0 ? 0 : Math.min(requestedLimit, 200);
    const offset = limit > 0 ? (page - 1) * limit : 0;

    const filters = [
      eq(projectSyncJobs.projectId, params.projectId),
      eq(projectSyncJobs.scopeTenant, params.scopeTenant),
      eq(projectSyncJobs.scopeId, params.scopeId),
      isNull(projectSyncJobs.deletedAt),
    ];

    if (params.status) {
      const dbStatus = STATUS_GQL_TO_DB[params.status];
      if (dbStatus) {
        filters.push(eq(projectSyncJobs.status, dbStatus));
      }
    }

    if (params.search && params.search.trim().length > 0) {
      const term = `%${params.search.trim()}%`;
      filters.push(ilike(projectSyncJobs.jobName, term));
    }

    const whereClause = and(...filters);

    const sortField = params.sort?.field ?? ProjectSyncJobSortableField.EnqueuedAt;
    const sortOrder = params.sort?.order ?? SortOrder.Desc;
    const sortColumnMap: Record<ProjectSyncJobSortableField, PgColumn> = {
      [ProjectSyncJobSortableField.EnqueuedAt]: projectSyncJobs.createdAt,
      [ProjectSyncJobSortableField.StartedAt]: projectSyncJobs.startedAt,
      [ProjectSyncJobSortableField.CompletedAt]: projectSyncJobs.completedAt,
      [ProjectSyncJobSortableField.Status]: projectSyncJobs.status,
      [ProjectSyncJobSortableField.JobName]: projectSyncJobs.jobName,
    };
    const sortColumn = sortColumnMap[sortField] ?? projectSyncJobs.createdAt;
    const orderBy = sortOrder === SortOrder.Asc ? asc(sortColumn) : desc(sortColumn);

    const countQuery = dbInstance
      .select({ value: drizzleCount() })
      .from(projectSyncJobs)
      .where(whereClause);

    if (limit === 0) {
      const [countRow] = await countQuery;
      return { items: [], totalCount: countRow?.value ?? 0 };
    }

    const baseSelect = dbInstance
      .select(listJobColumns)
      .from(projectSyncJobs)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const [rows, countResult] = await Promise.all([baseSelect, countQuery]);

    return {
      items: rows.map(toListEntity),
      totalCount: countResult[0]?.value ?? 0,
    };
  }

  public async updateStatus(
    params: {
      jobId: string;
      status: ProjectSyncJobStatus;
      startedAt?: Date | null;
      completedAt?: Date | null;
      cancelledAt?: Date | null;
      cancelRequested?: Date | null;
      result?: SyncProjectResult | null;
      warnings?: string[] | null;
      errorMessage?: string | null;
      errorDetails?: Record<string, unknown> | null;
    },
    transaction?: Transaction
  ): Promise<ProjectSyncJob> {
    const dbInstance = transaction ?? this.db;
    const update: Partial<NewProjectSyncJobModel> = {
      status: STATUS_GQL_TO_DB[params.status],
      updatedAt: new Date(),
    };
    if (params.startedAt !== undefined) update.startedAt = params.startedAt;
    if (params.completedAt !== undefined) update.completedAt = params.completedAt;
    if (params.cancelledAt !== undefined) update.cancelledAt = params.cancelledAt;
    if (params.cancelRequested !== undefined) update.cancelRequested = params.cancelRequested;
    if (params.result !== undefined) {
      update.result = params.result as unknown as NewProjectSyncJobModel['result'];
    }
    if (params.warnings !== undefined && params.warnings !== null) {
      update.warnings = params.warnings as unknown as NewProjectSyncJobModel['warnings'];
    }
    if (params.errorMessage !== undefined) update.errorMessage = params.errorMessage;
    if (params.errorDetails !== undefined) {
      update.errorDetails =
        params.errorDetails as unknown as NewProjectSyncJobModel['errorDetails'];
    }

    const [row] = await dbInstance
      .update(projectSyncJobs)
      .set(update)
      .where(and(eq(projectSyncJobs.id, params.jobId), isNull(projectSyncJobs.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
    return toEntity(row);
  }

  public async updateSnapshot(
    params: {
      jobId: string;
      snapshot: SyncProjectInput;
      takenAt: Date;
      sizeBytes: number;
    },
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    const update: Partial<NewProjectSyncJobModel> = {
      snapshot: params.snapshot as unknown as NewProjectSyncJobModel['snapshot'],
      snapshotTakenAt: params.takenAt,
      snapshotSizeBytes: params.sizeBytes,
      updatedAt: new Date(),
    };
    const [row] = await dbInstance
      .update(projectSyncJobs)
      .set(update)
      .where(and(eq(projectSyncJobs.id, params.jobId), isNull(projectSyncJobs.deletedAt)))
      .returning({ id: projectSyncJobs.id });

    if (!row) {
      throw new NotFoundError('ProjectSyncJob', params.jobId);
    }
  }

  public async getSnapshotById(
    jobId: string,
    transaction?: Transaction
  ): Promise<ProjectSyncJobSnapshotRow | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        snapshot: projectSyncJobs.snapshot,
        snapshotTakenAt: projectSyncJobs.snapshotTakenAt,
        snapshotSizeBytes: projectSyncJobs.snapshotSizeBytes,
        projectId: projectSyncJobs.projectId,
      })
      .from(projectSyncJobs)
      .where(and(eq(projectSyncJobs.id, jobId), isNull(projectSyncJobs.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (row.snapshot == null) return null;
    return {
      snapshot: row.snapshot as unknown as SyncProjectInput,
      takenAt: row.snapshotTakenAt ?? new Date(0),
      sizeBytes: row.snapshotSizeBytes ?? 0,
      projectId: row.projectId,
    };
  }
}
