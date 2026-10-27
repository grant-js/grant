/**
 * Project-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type {
  AddProjectAppTagInput,
  AddProjectGroupInput,
  AddProjectPermissionInput,
  AddProjectResourceInput,
  AddProjectRoleInput,
  AddProjectRolePermissionInput,
  AddProjectTagInput,
  AddProjectUserApiKeyInput,
  AddProjectUserGroupInput,
  AddProjectUserInput,
  AddProjectUserPermissionInput,
  CreateProjectAppInput,
  CreateProjectAppResult,
  CreateProjectInput,
  MutationDeleteProjectAppArgs,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectApp,
  ProjectAppPage,
  ProjectAppTag,
  ProjectGroup,
  ProjectPage,
  ProjectPermission,
  ProjectResource,
  ProjectRole,
  ProjectRolePermission,
  ProjectSyncJob,
  ProjectSyncJobSortInput,
  ProjectSyncJobStatus,
  ProjectTag,
  ProjectUser,
  ProjectUserApiKey,
  ProjectUserGroup,
  ProjectUserPermission,
  QueryProjectAppsArgs,
  QueryProjectAppTagsInput,
  QueryProjectGroupsInput,
  QueryProjectPermissionsInput,
  QueryProjectResourcesInput,
  QueryProjectRolePermissionsInput,
  QueryProjectRolesInput,
  QueryProjectsArgs,
  QueryProjectTagsInput,
  QueryProjectUserApiKeysInput,
  QueryProjectUserGroupsInput,
  QueryProjectUserPermissionsInput,
  QueryProjectUsersInput,
  RemoveProjectAppTagInput,
  RemoveProjectGroupInput,
  RemoveProjectPermissionInput,
  RemoveProjectResourceInput,
  RemoveProjectRoleInput,
  RemoveProjectRolePermissionInput,
  RemoveProjectTagInput,
  RemoveProjectUserApiKeyInput,
  RemoveProjectUserGroupInput,
  RemoveProjectUserInput,
  RemoveProjectUserPermissionInput,
  SyncProjectInput,
  SyncProjectResult,
  UpdateProjectAppInput,
  UpdateProjectAppTagInput,
  UpdateProjectTagInput,
} from '@grantjs/schema';

import type { DeleteParams, IEntityExistence, OptionalListScope, SelectedFields } from './common';

export interface IProjectRepository extends IEntityExistence {
  getProjects(
    params: Omit<QueryProjectsArgs, 'scope'> & OptionalListScope & SelectedFields<Project>,
    transaction?: unknown
  ): Promise<ProjectPage>;

  createProject(
    params: Omit<CreateProjectInput, 'scope' | 'tagIds'>,
    transaction?: unknown
  ): Promise<Project>;

  updateProject(params: MutationUpdateProjectArgs, transaction?: unknown): Promise<Project>;

  setProjectPicture(
    projectId: string,
    input: { picturePath?: string | null; pictureUrl?: string | null },
    transaction?: unknown
  ): Promise<Project>;

  softDeleteProject(
    params: Omit<MutationDeleteProjectArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Project>;

  hardDeleteProject(
    params: Omit<MutationDeleteProjectArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Project>;
}

export interface IProjectUserRepository {
  getProjectUsers(
    params: QueryProjectUsersInput & { userIds?: readonly string[] | null },
    transaction?: unknown
  ): Promise<ProjectUser[]>;

  addProjectUser(params: AddProjectUserInput, transaction?: unknown): Promise<ProjectUser>;

  mergeProjectUserCdmMetadata(
    params: {
      projectId: string;
      userId: string;
      importerMetadata: Record<string, unknown> | null | undefined;
      /**
       * External key of the user in the CDM document. When set, this project's
       * `cdmImport` marker (`kind: 'user'`) is written on the membership row, so the
       * project-scoped read carries it even for a reused identity whose global user
       * metadata is not marked.
       */
      userExternalKey?: string | null;
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
      picturePath?: string | null;
    },
    transaction?: unknown
  ): Promise<ProjectUser>;

  softDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: unknown
  ): Promise<ProjectUser>;

  hardDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: unknown
  ): Promise<ProjectUser>;

  updateProjectUserSearchDocument(
    params: {
      projectId: string;
      userId: string;
      searchDocument: string;
    },
    transaction?: unknown
  ): Promise<ProjectUser>;

  filterUserIdsBySearchDocument(
    params: {
      projectId: string;
      userIds: readonly string[];
      search: string;
    },
    transaction?: unknown
  ): Promise<string[]>;

  /**
   * Which of `userIds` are live members of the project, in **one** query. Read inside the
   * caller's transaction it sees exactly the project's own rows under the restrictive
   * `project_users` policy, and the memberships the same transaction just wrote.
   */
  filterMemberUserIds(
    params: { projectId: string; userIds: readonly string[] },
    transaction?: unknown
  ): Promise<string[]>;

  getProjectUserMemberships(
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

export interface IProjectRoleRepository {
  getProjectRoles(params: QueryProjectRolesInput, transaction?: unknown): Promise<ProjectRole[]>;

  addProjectRole(params: AddProjectRoleInput, transaction?: unknown): Promise<ProjectRole>;

  softDeleteProjectRole(
    params: RemoveProjectRoleInput,
    transaction?: unknown
  ): Promise<ProjectRole>;

  hardDeleteProjectRole(
    params: RemoveProjectRoleInput,
    transaction?: unknown
  ): Promise<ProjectRole>;
}

export interface IProjectGroupRepository {
  getProjectGroups(params: QueryProjectGroupsInput, transaction?: unknown): Promise<ProjectGroup[]>;

  addProjectGroup(params: AddProjectGroupInput, transaction?: unknown): Promise<ProjectGroup>;

  softDeleteProjectGroup(
    params: RemoveProjectGroupInput,
    transaction?: unknown
  ): Promise<ProjectGroup>;

  hardDeleteProjectGroup(
    params: RemoveProjectGroupInput,
    transaction?: unknown
  ): Promise<ProjectGroup>;
}

export interface IProjectRolePermissionRepository {
  getProjectRolePermissions(
    params: QueryProjectRolePermissionsInput,
    transaction?: unknown
  ): Promise<ProjectRolePermission[]>;

  addProjectRolePermission(
    params: AddProjectRolePermissionInput,
    transaction?: unknown
  ): Promise<ProjectRolePermission>;

  softDeleteProjectRolePermission(
    params: RemoveProjectRolePermissionInput,
    transaction?: unknown
  ): Promise<ProjectRolePermission>;

  hardDeleteProjectRolePermission(
    params: RemoveProjectRolePermissionInput,
    transaction?: unknown
  ): Promise<ProjectRolePermission>;
}

export interface IProjectUserPermissionRepository {
  getProjectUserPermissions(
    params: QueryProjectUserPermissionsInput,
    transaction?: unknown
  ): Promise<ProjectUserPermission[]>;

  addProjectUserPermission(
    params: AddProjectUserPermissionInput,
    transaction?: unknown
  ): Promise<ProjectUserPermission>;

  softDeleteProjectUserPermission(
    params: RemoveProjectUserPermissionInput,
    transaction?: unknown
  ): Promise<ProjectUserPermission>;

  hardDeleteProjectUserPermission(
    params: RemoveProjectUserPermissionInput,
    transaction?: unknown
  ): Promise<ProjectUserPermission>;
}

export interface IProjectUserGroupRepository {
  getProjectUserGroups(
    params: QueryProjectUserGroupsInput,
    transaction?: unknown
  ): Promise<ProjectUserGroup[]>;

  addProjectUserGroup(
    params: AddProjectUserGroupInput,
    transaction?: unknown
  ): Promise<ProjectUserGroup>;

  softDeleteProjectUserGroup(
    params: RemoveProjectUserGroupInput,
    transaction?: unknown
  ): Promise<ProjectUserGroup>;

  hardDeleteProjectUserGroup(
    params: RemoveProjectUserGroupInput,
    transaction?: unknown
  ): Promise<ProjectUserGroup>;
}

export interface IProjectPermissionRepository {
  getProjectPermissions(
    params: QueryProjectPermissionsInput,
    transaction?: unknown
  ): Promise<ProjectPermission[]>;

  /** Returns allowed OAuth scope slugs (resource:action) for the project. */
  getScopeSlugsForProject(projectId: string, transaction?: unknown): Promise<string[]>;

  /** Returns permission name and description for each scope slug that exists in the project. */
  getScopeSlugLabelsForProject(
    projectId: string,
    scopeSlugs: string[],
    transaction?: unknown
  ): Promise<{ slug: string; name: string; description: string | null }[]>;

  addProjectPermission(
    params: AddProjectPermissionInput,
    transaction?: unknown
  ): Promise<ProjectPermission>;
  addProjectPermissions(
    params: readonly AddProjectPermissionInput[],
    transaction?: unknown
  ): Promise<ProjectPermission[]>;

  softDeleteProjectPermission(
    params: RemoveProjectPermissionInput,
    transaction?: unknown
  ): Promise<ProjectPermission>;

  hardDeleteProjectPermission(
    params: RemoveProjectPermissionInput,
    transaction?: unknown
  ): Promise<ProjectPermission>;
}

export interface IProjectResourceRepository {
  getProjectResources(
    params: QueryProjectResourcesInput,
    transaction?: unknown
  ): Promise<ProjectResource[]>;

  addProjectResource(
    params: AddProjectResourceInput,
    transaction?: unknown
  ): Promise<ProjectResource>;
  addProjectResources(
    params: readonly AddProjectResourceInput[],
    transaction?: unknown
  ): Promise<ProjectResource[]>;

  softDeleteProjectResource(
    params: RemoveProjectResourceInput,
    transaction?: unknown
  ): Promise<ProjectResource>;

  hardDeleteProjectResource(
    params: RemoveProjectResourceInput,
    transaction?: unknown
  ): Promise<ProjectResource>;
}

export interface IProjectTagRepository {
  getProjectTags(params: QueryProjectTagsInput, transaction?: unknown): Promise<ProjectTag[]>;

  getProjectTag(params: QueryProjectTagsInput, transaction?: unknown): Promise<ProjectTag>;

  getProjectTagIntersection(projectIds: string[], tagIds: string[]): Promise<ProjectTag[]>;

  addProjectTag(params: AddProjectTagInput, transaction?: unknown): Promise<ProjectTag>;

  updateProjectTag(params: UpdateProjectTagInput, transaction?: unknown): Promise<ProjectTag>;

  softDeleteProjectTag(params: RemoveProjectTagInput, transaction?: unknown): Promise<ProjectTag>;

  hardDeleteProjectTag(params: RemoveProjectTagInput, transaction?: unknown): Promise<ProjectTag>;
}

export interface IProjectAppRepository {
  getProjectApps(
    params: Omit<QueryProjectAppsArgs, 'scope'> &
      SelectedFields<ProjectApp> & { projectId: string } & SelectedFields<ProjectApp>,
    transaction?: unknown
  ): Promise<ProjectAppPage>;

  createProjectApp(
    params: Omit<CreateProjectAppInput, 'scope'> & {
      projectId: string;
      clientSecretHash?: string | null;
    },
    transaction?: unknown
  ): Promise<CreateProjectAppResult>;

  getProjectAppById(id: string, transaction?: unknown): Promise<ProjectApp | null>;

  getProjectAppByClientId(clientId: string, transaction?: unknown): Promise<ProjectApp | null>;

  getClientSecretHash(id: string, transaction?: unknown): Promise<string | null>;

  updateProjectApp(
    params: { id: string; projectId: string } & Omit<UpdateProjectAppInput, 'scope'>,
    transaction?: unknown
  ): Promise<ProjectApp>;

  setProjectAppPicture(
    projectAppId: string,
    input: { picturePath?: string | null; pictureUrl?: string | null },
    transaction?: unknown
  ): Promise<ProjectApp>;

  softDeleteProjectApp(
    params: Omit<MutationDeleteProjectAppArgs, 'scope'> & { projectId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectApp>;
}

export interface IProjectAppTagRepository {
  getProjectAppTags(
    params: QueryProjectAppTagsInput,
    transaction?: unknown
  ): Promise<ProjectAppTag[]>;

  getProjectAppTagsByProjectAppIds(
    projectAppIds: string[],
    transaction?: unknown
  ): Promise<ProjectAppTag[]>;

  getProjectAppTagIntersection(
    projectAppIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<ProjectAppTag[]>;

  addProjectAppTag(params: AddProjectAppTagInput, transaction?: unknown): Promise<ProjectAppTag>;

  updateProjectAppTag(
    params: UpdateProjectAppTagInput,
    transaction?: unknown
  ): Promise<ProjectAppTag>;

  softDeleteProjectAppTag(
    params: RemoveProjectAppTagInput,
    transaction?: unknown
  ): Promise<ProjectAppTag>;

  hardDeleteProjectAppTag(
    params: RemoveProjectAppTagInput,
    transaction?: unknown
  ): Promise<ProjectAppTag>;
}

export interface IProjectUserApiKeyRepository {
  getProjectUserApiKeys(
    params: QueryProjectUserApiKeysInput,
    transaction?: unknown
  ): Promise<ProjectUserApiKey[]>;

  addProjectUserApiKey(
    params: AddProjectUserApiKeyInput,
    transaction?: unknown
  ): Promise<ProjectUserApiKey>;

  softDeleteProjectUserApiKey(
    params: RemoveProjectUserApiKeyInput,
    transaction?: unknown
  ): Promise<ProjectUserApiKey>;

  hardDeleteProjectUserApiKey(
    params: RemoveProjectUserApiKeyInput,
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

/**
 * Where a by-reference import's CDM document lives (ADR 0009). Stored instead of the
 * document: the row carries `payload_path`, `payload_size_bytes` and `entity_count_hint`
 * and its `payload` is NULL.
 */
export interface ProjectSyncJobPayloadReference {
  /**
   * Server-derived object key (`imports/projects/<projectId>/<uploadId>.json`). Never
   * client-supplied, and never passed to `getUrl()`: the document is unredacted.
   */
  path: string;
  /** Size the store reported when the job was started; the worker's `maxBytes` is what is enforced. */
  sizeBytes: number;
  /** The client's own, untrusted entity count. Informational; the worker counts for itself. */
  entityCountHint: number | null;
}

/** Worker-internal view of a sync job, including the persisted payload + scope. */
export interface ProjectSyncJobFull {
  job: ProjectSyncJob;
  /**
   * Import: full `SyncProjectInput`, or `null` for a by-reference job (see
   * `payloadRef`). Export: `ProjectSyncJobExportPayload` JSON.
   */
  payload: unknown;
  /** Set for a by-reference import; the document is then in the object store. */
  payloadRef: ProjectSyncJobPayloadReference | null;
  scopeTenant: string;
  scopeId: string;
  /** True when `cancel()` was invoked while the job was already running. */
  cancelRequested: boolean;
}

/** Filters for paginated lookup of sync jobs scoped to a single project. */
export interface ListProjectSyncJobsParams {
  projectId: string;
  scopeTenant: string;
  scopeId: string;
  page?: number | null;
  limit?: number | null;
  search?: string | null;
  sort?: ProjectSyncJobSortInput | null;
  status?: ProjectSyncJobStatus | null;
}

/** Result row for the payload endpoint: stored CDM body + lightweight identifiers. */
export interface ProjectSyncJobPayloadRow {
  /**
   * Import: `SyncProjectInput`. Export: `ProjectSyncJobExportPayload`. `null` for a
   * by-reference import, whose document is not in the row.
   */
  payload: unknown;
  /** Set for a by-reference import. */
  payloadRef: ProjectSyncJobPayloadReference | null;
  jobName: string | null;
  cdmVersion: number;
  projectId: string;
}

/** Result row for the snapshot endpoint: pre-sync rollback artifact + metadata. */
export interface ProjectSyncJobSnapshotRow {
  snapshot: SyncProjectInput;
  takenAt: Date;
  sizeBytes: number;
  projectId: string;
}

export interface IProjectSyncJobRepository {
  insert(
    params: {
      projectId: string;
      scopeTenant: string;
      scopeId: string;
      cdmVersion: number;
      jobName: string | null;
      operation: 'import' | 'export';
      modeStrategy: 'merge' | 'replace' | null;
      /** The document, or `null` when `payloadRef` says where it is. Exactly one is set. */
      payload: unknown;
      payloadRef?: ProjectSyncJobPayloadReference | null;
      enqueuedById: string;
    },
    transaction?: unknown
  ): Promise<ProjectSyncJob>;

  getById(jobId: string, transaction?: unknown): Promise<ProjectSyncJob | null>;

  /** Worker-only: load the full row (payload, scope, cancel flag) for execution. */
  getFullById(jobId: string, transaction?: unknown): Promise<ProjectSyncJobFull | null>;

  /**
   * Read just the persisted CDM payload + lightweight identifiers for the
   * download endpoint. Returns null when the job does not exist.
   */
  getPayloadById(jobId: string, transaction?: unknown): Promise<ProjectSyncJobPayloadRow | null>;

  /** Paginated list of jobs filtered by project + scope, optional status/search/sort. */
  listByProject(
    params: ListProjectSyncJobsParams,
    transaction?: unknown
  ): Promise<{ items: ProjectSyncJob[]; totalCount: number }>;

  findActiveByJobKey(
    params: {
      projectId: string;
      operation: 'import' | 'export';
      jobName: string;
      /** DB status values; defaults to pending, running, and completed (import idempotency). */
      statuses?: readonly string[];
    },
    transaction?: unknown
  ): Promise<ProjectSyncJob | null>;

  updateStatus(
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
    transaction?: unknown
  ): Promise<ProjectSyncJob>;

  /**
   * Replace the stored CDM payload of a job. Used to take imported password hashes out of
   * the document once the job is terminal (ADR 0010). Throws `NotFoundError` when the job
   * does not exist.
   */
  updatePayload(params: { jobId: string; payload: unknown }, transaction?: unknown): Promise<void>;

  /**
   * Persist a pre-sync rollback snapshot for an existing job row. Throws
   * `NotFoundError` when the job does not exist. Intended to be called from
   * inside the sync worker's import transaction.
   */
  updateSnapshot(
    params: {
      jobId: string;
      snapshot: SyncProjectInput;
      takenAt: Date;
      sizeBytes: number;
    },
    transaction?: unknown
  ): Promise<void>;

  /**
   * Read a previously-captured snapshot. Returns `null` when no snapshot was
   * persisted for this job. The job row itself is queried by `jobId` only;
   * callers enforce the `(projectId === row.projectId)` invariant.
   */
  getSnapshotById(jobId: string, transaction?: unknown): Promise<ProjectSyncJobSnapshotRow | null>;
}
