/**
 * Project-domain service port interfaces.
 * Covers: Project, ProjectUser, ProjectRole, ProjectGroup,
 *         ProjectPermission, ProjectResource, ProjectTag,
 *         ProjectUserApiKey, ProjectSyncJob (CDM import/export jobs).
 */
import type {
  AddProjectGroupInput,
  AddProjectPermissionInput,
  AddProjectResourceInput,
  AddProjectRoleInput,
  AddProjectRolePermissionInput,
  AddProjectTagInput,
  AddProjectUserGroupInput,
  AddProjectUserInput,
  AddProjectUserPermissionInput,
  CdmExportSection,
  CreateProjectInput,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectGroup,
  ProjectPage,
  ProjectPermission,
  ProjectResource,
  ProjectRole,
  ProjectRolePermission,
  ProjectSyncJob,
  ProjectSyncJobPage,
  ProjectSyncJobSortInput,
  ProjectSyncJobStatus,
  ProjectTag,
  ProjectUser,
  ProjectUserApiKey,
  ProjectUserGroup,
  ProjectUserPermission,
  QueryProjectPermissionsInput,
  QueryProjectResourcesInput,
  QueryProjectRolePermissionsInput,
  QueryProjectsArgs,
  QueryProjectUserGroupsInput,
  QueryProjectUserPermissionsInput,
  RemoveProjectGroupInput,
  RemoveProjectPermissionInput,
  RemoveProjectResourceInput,
  RemoveProjectRoleInput,
  RemoveProjectRolePermissionInput,
  RemoveProjectTagInput,
  RemoveProjectUserGroupInput,
  RemoveProjectUserInput,
  RemoveProjectUserPermissionInput,
  Scope,
  SyncProjectInput,
  SyncProjectResult,
  UpdateProjectTagInput,
} from '@grantjs/schema';

import type { SelectedFields } from '../repositories/common';
import type { DeleteParams } from '../repositories/common';

// ---------------------------------------------------------------------------
// IProjectService
// ---------------------------------------------------------------------------

export interface IProjectService {
  getProjects(
    params: Omit<QueryProjectsArgs, 'scope' | 'tagIds'> & SelectedFields<Project>
  ): Promise<ProjectPage>;

  createProject(
    params: Omit<CreateProjectInput, 'scope' | 'tagIds'>,
    transaction?: unknown
  ): Promise<Project>;

  updateProject(params: MutationUpdateProjectArgs, transaction?: unknown): Promise<Project>;

  deleteProject(
    params: Omit<MutationDeleteProjectArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<Project>;
}

// ---------------------------------------------------------------------------
// IProjectUserService
// ---------------------------------------------------------------------------

export interface IProjectUserService {
  getProjectUsers(
    params: { projectId?: string; userId?: string },
    transaction?: unknown
  ): Promise<ProjectUser[]>;

  addProjectUser(params: AddProjectUserInput, transaction?: unknown): Promise<ProjectUser>;

  mergeProjectUserCdmMetadata(
    params: {
      projectId: string;
      userId: string;
      importerMetadata: Record<string, unknown> | null | undefined;
    },
    transaction?: unknown
  ): Promise<ProjectUser>;

  updateProjectUserMetadata(
    params: {
      projectId: string;
      userId: string;
      metadata: Record<string, unknown>;
    },
    transaction?: unknown
  ): Promise<ProjectUser>;

  updateProjectUserProfile(
    params: {
      projectId: string;
      userId: string;
      displayName?: string | null;
      pictureUrl?: string | null;
    },
    transaction?: unknown
  ): Promise<ProjectUser>;

  syncProjectUserSearchDocument(
    params: {
      projectId: string;
      userId: string;
      searchable?: Record<string, unknown> | null;
    },
    transaction?: unknown
  ): Promise<void>;

  filterUserIdsBySearchDocument(
    params: {
      projectId: string;
      userIds: readonly string[];
      search: string;
    },
    transaction?: unknown
  ): Promise<string[]>;

  removeProjectUser(
    params: RemoveProjectUserInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectUser>;

  getUserProjectMemberships(
    userId: string,
    transaction?: unknown
  ): Promise<
    Array<{
      projectId: string;
      projectName: string;
      displayName: string | null;
      pictureUrl: string | null;
      metadata: Record<string, unknown>;
      role: string | null;
      joinedAt: Date;
      organizationId: string | null;
      organizationName: string | null;
      accountId: string | null;
    }>
  >;
}

// ---------------------------------------------------------------------------
// IProjectRoleService
// ---------------------------------------------------------------------------

export interface IProjectRoleService {
  getProjectRoles(params: { projectId: string }, transaction?: unknown): Promise<ProjectRole[]>;

  addProjectRole(params: AddProjectRoleInput, transaction?: unknown): Promise<ProjectRole>;

  removeProjectRole(
    params: RemoveProjectRoleInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectRole>;
}

// ---------------------------------------------------------------------------
// IProjectGroupService
// ---------------------------------------------------------------------------

export interface IProjectGroupService {
  getProjectGroups(params: { projectId: string }, transaction?: unknown): Promise<ProjectGroup[]>;

  addProjectGroup(params: AddProjectGroupInput, transaction?: unknown): Promise<ProjectGroup>;

  removeProjectGroup(
    params: RemoveProjectGroupInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectGroup>;
}

// ---------------------------------------------------------------------------
// IProjectRolePermissionService
// ---------------------------------------------------------------------------

export interface IProjectRolePermissionService {
  getProjectRolePermissions(
    params: QueryProjectRolePermissionsInput,
    transaction?: unknown
  ): Promise<ProjectRolePermission[]>;

  addProjectRolePermission(
    params: AddProjectRolePermissionInput,
    transaction?: unknown
  ): Promise<ProjectRolePermission>;

  removeProjectRolePermission(
    params: RemoveProjectRolePermissionInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectRolePermission>;
}

// ---------------------------------------------------------------------------
// IProjectUserPermissionService
// ---------------------------------------------------------------------------

export interface IProjectUserPermissionService {
  getProjectUserPermissions(
    params: QueryProjectUserPermissionsInput,
    transaction?: unknown
  ): Promise<ProjectUserPermission[]>;

  addProjectUserPermission(
    params: AddProjectUserPermissionInput,
    transaction?: unknown
  ): Promise<ProjectUserPermission>;

  removeProjectUserPermission(
    params: RemoveProjectUserPermissionInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectUserPermission>;
}

// ---------------------------------------------------------------------------
// IProjectUserGroupService
// ---------------------------------------------------------------------------

export interface IProjectUserGroupService {
  getProjectUserGroups(
    params: QueryProjectUserGroupsInput,
    transaction?: unknown
  ): Promise<ProjectUserGroup[]>;

  addProjectUserGroup(
    params: AddProjectUserGroupInput,
    transaction?: unknown
  ): Promise<ProjectUserGroup>;

  removeProjectUserGroup(
    params: RemoveProjectUserGroupInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectUserGroup>;
}

// ---------------------------------------------------------------------------
// IProjectPermissionService
// ---------------------------------------------------------------------------

export interface IProjectPermissionService {
  getProjectPermissions(
    params: QueryProjectPermissionsInput,
    transaction?: unknown
  ): Promise<ProjectPermission[]>;

  /** Returns allowed OAuth scope slugs (resource:action) for the project. */
  getAllowedScopeSlugsForProject(projectId: string, transaction?: unknown): Promise<string[]>;

  /** Returns name and description for each scope slug that exists in the project. */
  getScopeSlugLabelsForProject(
    projectId: string,
    scopeSlugs: string[],
    transaction?: unknown
  ): Promise<{ slug: string; name: string; description: string | null }[]>;

  addProjectPermission(
    params: AddProjectPermissionInput,
    transaction?: unknown
  ): Promise<ProjectPermission>;

  removeProjectPermission(
    params: RemoveProjectPermissionInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectPermission>;
}

// ---------------------------------------------------------------------------
// IProjectResourceService
// ---------------------------------------------------------------------------

export interface IProjectResourceService {
  getProjectResources(
    params: QueryProjectResourcesInput,
    transaction?: unknown
  ): Promise<ProjectResource[]>;

  getProjectResourcesByResourceId(
    resourceId: string,
    transaction?: unknown
  ): Promise<ProjectResource[]>;

  addProjectResource(
    params: AddProjectResourceInput,
    transaction?: unknown
  ): Promise<ProjectResource>;

  removeProjectResource(
    params: RemoveProjectResourceInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectResource>;
}

// ---------------------------------------------------------------------------
// IProjectTagService
// ---------------------------------------------------------------------------

export interface IProjectTagService {
  getProjectTags(params: { projectId: string }, transaction?: unknown): Promise<ProjectTag[]>;

  getProjectTagIntersection(projectIds: string[], tagIds: string[]): Promise<ProjectTag[]>;

  addProjectTag(params: AddProjectTagInput, transaction?: unknown): Promise<ProjectTag>;

  updateProjectTag(params: UpdateProjectTagInput, transaction?: unknown): Promise<ProjectTag>;

  removeProjectTag(
    params: RemoveProjectTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectTag>;
}

// ---------------------------------------------------------------------------
// IProjectUserApiKeyService
// ---------------------------------------------------------------------------

export interface IProjectUserApiKeyService {
  getProjectUserApiKeys(
    params: { projectId: string; userId: string },
    transaction?: unknown
  ): Promise<ProjectUserApiKey[]>;

  addProjectUserApiKey(
    params: {
      projectId: string;
      userId: string;
      apiKeyId: string;
      metadata?: Record<string, unknown> | null;
    },
    transaction?: unknown
  ): Promise<ProjectUserApiKey>;

  removeProjectUserApiKey(
    params: { projectId: string; userId: string; apiKeyId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectUserApiKey>;

  countProjectUserApiKeys(
    params: { projectId: string; userId: string },
    transaction?: unknown
  ): Promise<number>;

  countProjectUserApiKeysByUserIds(
    params: { projectId: string; userIds: string[] },
    transaction?: unknown
  ): Promise<Map<string, number>>;
}

// ---------------------------------------------------------------------------
// IProjectImportService
// ---------------------------------------------------------------------------

/** Replace-import of project RBAC from the canonical data model (CDM). */
export interface IProjectImportService {
  importProjectCdm(
    params: {
      projectId: string;
      scope: Scope;
      input: SyncProjectInput;
    },
    transaction: unknown
  ): Promise<SyncProjectResult>;

  /**
   * Post-commit cache invalidation after a successful CDM import. Invalidates
   * scope-keyed caches (permissions/roles/groups/users/resources) and the
   * authorization cache for every user touched by the import.
   */
  invalidateCachesForImportResult(params: { scope: Scope; userIds: string[] }): Promise<void>;
}

// ---------------------------------------------------------------------------
// IProjectExportService
// ---------------------------------------------------------------------------

/**
 * CDM export: snapshot the project's current permission/role/group/user-assignment
 * state as a replay-ready `SyncProjectInput`.
 *
 * Used by export jobs and by the import worker for pre-import rollback snapshots.
 *
 * The returned `SyncProjectInput.id` is the project's display **name** (trimmed),
 * matching CDM `id` / sync **jobName** when re-importing. If the name is missing or
 * blank, `id` is `null`.
 */
export interface IProjectExportService {
  exportProjectCdm(
    params: {
      projectId: string;
      scope: Scope;
      version?: number;
      cdmVersion?: number;
      /**
       * When set and non-empty, only these CDM slices are exported; others are
       * empty arrays. Omit or pass empty for a full snapshot (sync worker).
       */
      sections?: readonly CdmExportSection[];
      /**
       * When `users` is exported, whether to run the project user API keys slice.
       * Default true when omitted (full rollback snapshot includes key identities).
       */
      includeUserApiKeys?: boolean;
      /** Embedded in exported CDM `mode` for re-import; defaults to merge when omitted. */
      mode?: {
        strategy: 'merge' | 'replace';
        onConflict?: 'fail' | 'skip' | 'update' | null;
        confirmDestructive?: boolean;
      };
    },
    transaction?: unknown
  ): Promise<SyncProjectInput>;
}

// ---------------------------------------------------------------------------
// IProjectSyncJobService
// ---------------------------------------------------------------------------

/**
 * Persisted JSON for `operation: export` jobs (stored in the job row `payload` column).
 * Not a full `SyncProjectInput`; the worker produces that document and stores it in `snapshot`.
 */
export interface ProjectSyncJobExportPayload {
  version: number;
  sections?: readonly string[];
  /** Default true when omitted (matches export service defaults). */
  includeUserApiKeys?: boolean;
  /** Embedded in exported CDM `mode` for re-import; does not affect snapshot execution. */
  mode?: {
    strategy: 'merge' | 'replace';
    onConflict?: 'fail' | 'skip' | 'update' | null;
    confirmDestructive?: boolean;
  };
}

/**
 * Worker-internal view of a sync job, including the request payload + scope
 * preserved at enqueue time. Returned only by `loadForExecution` so the
 * payload + scope never leak through the public `getById` (GraphQL) path.
 */
export interface ProjectSyncJobExecutionData {
  job: ProjectSyncJob;
  /** Import: `SyncProjectInput`. Export: {@link ProjectSyncJobExportPayload}. */
  payload: unknown;
  scope: Scope;
  /** Whether `cancel()` has been invoked while the job was RUNNING. */
  cancelRequested: boolean;
}

/**
 * State-machine service for the async CDM sync job-tracking row.
 * Owns persistence + transitions only; never performs the import itself.
 * The actual import is delegated to {@link IProjectImportService}.
 */
export interface IProjectSyncJobService {
  create(
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
    transaction?: unknown
  ): Promise<ProjectSyncJob>;

  getById(
    params: { projectId: string; jobId: string },
    transaction?: unknown
  ): Promise<ProjectSyncJob>;

  /**
   * Paginated list of jobs scoped to a single project. Returns the
   * standard `ProjectSyncJobPage` shape: items + totalCount +
   * hasNextPage. Used by the GraphQL list query, the REST list route, and
   * the web job-history viewer.
   */
  list(
    params: {
      projectId: string;
      scope: Scope;
      page?: number | null;
      limit?: number | null;
      search?: string | null;
      sort?: ProjectSyncJobSortInput | null;
      status?: ProjectSyncJobStatus | null;
    },
    transaction?: unknown
  ): Promise<ProjectSyncJobPage>;

  /**
   * Read the persisted CDM payload that triggered this job. Used by the
   * REST download endpoint to stream the original JSON file. Throws
   * `NotFoundError` when the job does not exist or when its `projectId`
   * does not match the supplied one.
   */
  getPayload(
    params: { projectId: string; jobId: string },
    transaction?: unknown
  ): Promise<{
    payload: unknown;
    jobName: string | null;
    cdmVersion: number;
  }>;

  /**
   * Worker-only: load the job together with the request payload and the
   * scope captured at enqueue time. Never expose this through GraphQL/REST
   * — payload may contain large CDM bodies and scope is reconstructed from
   * persisted columns rather than the public response shape.
   */
  loadForExecution(
    params: { jobId: string },
    transaction?: unknown
  ): Promise<ProjectSyncJobExecutionData>;

  /** Idempotency lookup for `(projectId, operation, jobName)`; statuses default to import semantics. */
  findActiveByJobKey(
    params: {
      projectId: string;
      operation: 'import' | 'export';
      jobName: string;
      statuses?: readonly string[];
    },
    transaction?: unknown
  ): Promise<ProjectSyncJob | null>;

  transitionToRunning(params: { jobId: string }, transaction?: unknown): Promise<ProjectSyncJob>;

  markCompleted(
    params: {
      jobId: string;
      /** Null for completed export jobs (artifact is in `snapshot` only). */
      result: SyncProjectResult | null;
      warnings: string[];
    },
    transaction?: unknown
  ): Promise<ProjectSyncJob>;

  markFailed(
    params: { jobId: string; errorMessage: string; errorDetails?: Record<string, unknown> | null },
    transaction?: unknown
  ): Promise<ProjectSyncJob>;

  cancel(
    params: { projectId: string; jobId: string },
    transaction?: unknown
  ): Promise<ProjectSyncJob>;

  /**
   * Persist a rollback snapshot for a job. Captured by the worker inside the
   * import transaction (just before applying the new CDM), so the snapshot
   * commits if and only if the import commits.
   *
   * `sizeBytes` is computed by the service from `JSON.stringify(snapshot)`;
   * callers do not pre-serialise.
   */
  saveSnapshot(
    params: { jobId: string; snapshot: SyncProjectInput; takenAt: Date },
    transaction?: unknown
  ): Promise<void>;

  /**
   * Read a previously-captured rollback snapshot for the given job. Returns
   * `null` when no snapshot was persisted (e.g. the import failed before the
   * worker reached the snapshot step, or this is a legacy row predating the
   * snapshot column).
   */
  getSnapshot(
    params: { projectId: string; jobId: string },
    transaction?: unknown
  ): Promise<{
    snapshot: SyncProjectInput;
    takenAt: Date;
    sizeBytes: number;
  } | null>;
}
