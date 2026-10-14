import { randomUUID } from 'node:crypto';

import type {
  IAccountProjectService,
  IAccountProjectTagService,
  IFileStorageServicePort,
  IJobAdapter,
  IOrganizationProjectService,
  IOrganizationProjectTagService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectRoleService,
  IProjectService,
  IProjectSyncJobService,
  IProjectTagService,
  IProjectUserService,
  ITransactionalConnection,
  ProjectSyncJobExportPayload,
  ProjectSyncJobPayloadReference,
} from '@grantjs/core';
import {
  CdmModeStrategy,
  CdmOnConflict,
  ClearProjectPictureInput,
  ConfirmProjectPictureUploadInput,
  MutationCancelProjectSyncArgs,
  MutationCreateProjectArgs,
  MutationDeleteProjectArgs,
  MutationRequestProjectSyncUploadUrlArgs,
  MutationStartProjectExportArgs,
  MutationStartProjectSyncArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectPage,
  ProjectSyncJob,
  ProjectSyncJobOperation,
  ProjectSyncJobPage,
  ProjectSyncJobStatus,
  ProjectSyncUploadUrl,
  QueryProjectsArgs,
  QueryProjectSyncJobArgs,
  QueryProjectSyncJobsArgs,
  RequestProjectPictureUploadUrlInput,
  Scope,
  SyncProjectInput,
  Tenant,
  UploadProjectPictureInput,
  UploadUrl,
} from '@grantjs/schema';

import { config } from '@/config';
import { assertValidCdmExportSections } from '@/constants/cdm-export.constants';
import { PROJECT_SYNC_JOB_ID } from '@/constants/project-sync.constants';
import { type ScheduleAfterCommit } from '@/lib/after-commit.lib';
import { trackProductEventAfterCommit } from '@/lib/analytics';
import { IEntityCacheAdapter } from '@/lib/cache';
import {
  MODE_REPLACE_REQUIRES_CONFIRMATION,
  validateSyncInput,
} from '@/lib/cdm/cdm-document.schemas';
import {
  baseMediaType,
  CDM_IMPORT_CONTENT_TYPE,
  cdmImportObjectKey,
  normalizeUploadId,
} from '@/lib/cdm/cdm-import-upload.lib';
import {
  BadRequestError,
  ConfigurationError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
} from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { intersectScopedIds } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

const logger = createLogger('ProjectHandler');

export class ProjectHandler extends CacheHandler {
  constructor(
    private readonly organizationProjectTags: IOrganizationProjectTagService,
    private readonly accountProjectTags: IAccountProjectTagService,
    private readonly projects: IProjectService,
    private readonly accountProjects: IAccountProjectService,
    private readonly organizationProjects: IOrganizationProjectService,
    private readonly projectTags: IProjectTagService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly projectGroups: IProjectGroupService,
    private readonly projectRoles: IProjectRoleService,
    private readonly projectUsers: IProjectUserService,
    private readonly projectSyncJobs: IProjectSyncJobService,
    private readonly jobs: IJobAdapter | null,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>,
    private readonly fileStorage: IFileStorageServicePort,
    private readonly scheduleAfterCommit?: ScheduleAfterCommit
  ) {
    super(cache, scopeServices);
  }

  public async getProjects(
    params: QueryProjectsArgs & SelectedFields<Project>
  ): Promise<ProjectPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let projectIds = await this.getScopedProjectIds(scope);

    if (tagIds && tagIds.length > 0) {
      switch (scope.tenant) {
        case Tenant.Organization:
          {
            const organizationId = scope.id;
            const organizationProjectTags =
              await this.organizationProjectTags.getOrganizationProjectTagIntersection(
                organizationId,
                projectIds,
                tagIds
              );
            projectIds = organizationProjectTags
              .filter(
                ({ projectId, tagId }) => projectIds.includes(projectId) && tagIds.includes(tagId)
              )
              .map(({ projectId }) => projectId);
          }
          break;
        case Tenant.Account:
          {
            const accountId = scope.id;
            const accountProjectTags =
              await this.accountProjectTags.getAccountProjectTagIntersection(
                accountId,
                projectIds,
                tagIds
              );
            projectIds = accountProjectTags
              .filter(
                ({ projectId, tagId }) => projectIds.includes(projectId) && tagIds.includes(tagId)
              )
              .map(({ projectId }) => projectId);
          }
          break;
        default:
          throw new BadRequestError('Invalid scope');
      }
    }

    projectIds = intersectScopedIds(projectIds, ids);

    if (projectIds.length === 0) {
      return {
        projects: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const projectsResult = await this.projects.getProjects({
      ids: projectIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return projectsResult;
  }

  public async startProjectSync(
    params: MutationStartProjectSyncArgs & { enqueuedById: string }
  ): Promise<ProjectSyncJob> {
    const jobs = this.jobs;
    if (!jobs || !jobs.enqueue) {
      throw new ConfigurationError(
        'Project sync jobs are unavailable: job adapter is not configured. Set JOBS_ENABLED=true.'
      );
    }
    const enqueueJob = jobs.enqueue.bind(jobs);

    this.assertProjectScope(params.scope);
    const scopeProjectId = this.projectIdFromScope(params.scope);
    if (scopeProjectId !== params.id) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    const { input } = params;
    const { source: sourceInput, ...document } = input;
    const source = sourceInput ?? null;
    if (source) {
      this.assertByReferenceInput(input);
    } else {
      this.assertInlineInput(input);
    }

    const jobName = input.id ?? null;
    if (jobName !== null) {
      const inflight = await this.projectSyncJobs.findActiveByJobKey({
        projectId: params.id,
        operation: 'import',
        jobName,
        statuses: ['pending', 'running'],
      });
      if (inflight) {
        return inflight;
      }
    }

    const modeStrategyDb: 'merge' | 'replace' =
      input.mode.strategy === CdmModeStrategy.Merge ? 'merge' : 'replace';

    const job = source
      ? await this.projectSyncJobs.create({
          projectId: params.id,
          scope: params.scope,
          cdmVersion: input.version ?? 1,
          jobName,
          operation: 'import',
          modeStrategy: modeStrategyDb,
          payload: null,
          payloadRef: await this.resolveImportUpload(params.id, source),
          enqueuedById: params.enqueuedById,
        })
      : await this.projectSyncJobs.create({
          projectId: params.id,
          scope: params.scope,
          cdmVersion: input.version as number,
          jobName,
          operation: 'import',
          modeStrategy: modeStrategyDb,
          payload: document,
          enqueuedById: params.enqueuedById,
        });

    await this.enqueueProjectSyncJobAfterCommit(enqueueJob, params.scope, job.id);
    return job;
  }

  /**
   * Ask for a URL to upload a CDM import document to (ADR 0009).
   *
   * Authorized exactly like `startProjectSync`. The key is derived from the project in the
   * authorized scope and a uuid minted here; nothing the client sends reaches it. The
   * policy is the CDM one, selected by purpose, and the URL commits to the exact length
   * claimed, so a document cannot grow past what was validated here.
   */
  public async requestProjectSyncUploadUrl(
    params: MutationRequestProjectSyncUploadUrlArgs
  ): Promise<ProjectSyncUploadUrl> {
    this.assertProjectScope(params.scope);
    const projectId = this.projectIdFromScope(params.scope);
    if (projectId !== params.id) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }

    const policy = config.storage.cdmImport;
    const { contentLength } = params.input;
    const contentType = params.input.contentType ?? CDM_IMPORT_CONTENT_TYPE;

    if (!(policy.contentTypes as readonly string[]).includes(contentType)) {
      throw new ValidationError(
        `Invalid content type for a CDM import. Allowed types: ${policy.contentTypes.join(', ')}`
      );
    }
    if (!Number.isInteger(contentLength) || contentLength <= 0) {
      throw new ValidationError('contentLength must be a positive whole number of bytes');
    }
    if (contentLength > policy.maxBytes) {
      throw new PayloadTooLargeError(
        `CDM import exceeds the maximum of ${policy.maxBytes} bytes (CDM_UPLOAD_MAX_BYTES)`,
        policy.maxBytes,
        contentLength
      );
    }

    const uploadId = randomUUID();
    const minted = await this.fileStorage.getUploadUrl(cdmImportObjectKey(projectId, uploadId), {
      contentType,
      contentLength,
      expiresInSeconds: policy.expirySeconds,
    });

    return {
      uploadId,
      url: minted.url,
      method: minted.method,
      expiresAt: minted.expiresAt,
      headers: Object.entries(minted.headers).map(([name, value]) => ({ name, value })),
    };
  }

  /**
   * The inline shape: the document is the input, so the pieces GraphQL made optional (to
   * leave room for `source`) are required again, and the rules every document obeys apply.
   */
  private assertInlineInput(input: MutationStartProjectSyncArgs['input']): void {
    for (const field of ['version', 'roles', 'users'] as const) {
      if (input[field] == null) {
        throw new ValidationError(`${field} is required when source is absent`);
      }
    }
    validateSyncInput({
      version: input.version as number,
      mode: input.mode,
      roles: input.roles as NonNullable<typeof input.roles>,
      users: input.users as NonNullable<typeof input.users>,
    });
  }

  /**
   * The by-reference shape: the request carries only what the caller is asking for. The
   * document is not here to validate; the worker validates it, with the same schema and
   * rules, before the import transaction opens.
   */
  private assertByReferenceInput(input: MutationStartProjectSyncArgs['input']): void {
    for (const field of ['roles', 'users', 'resources', 'permissions', 'groups', 'tags'] as const) {
      if (input[field] != null) {
        throw new ValidationError(`${field} must be absent when source is present`);
      }
    }
    if (input.version != null && input.version !== 1) {
      throw new ValidationError('Unsupported version; only 1 is allowed');
    }
    if (input.mode.strategy === CdmModeStrategy.Replace && input.mode.confirmDestructive !== true) {
      throw new ValidationError(MODE_REPLACE_REQUIRES_CONFIRMATION);
    }
  }

  private entityCountHint(value: number | null | undefined): number | null {
    if (value == null) return null;
    if (!Number.isInteger(value) || value < 0 || value > 2_147_483_647) {
      throw new ValidationError('source.entityCount must be a whole number of at least 0');
    }
    return value;
  }

  /**
   * Check the upload a by-reference start names, and describe where it is.
   *
   * The key is re-derived from the project and the id; the client never supplies a path.
   * Asks the store exactly one question, `getMetadata()`: it must exist, be non-empty, be
   * within the policy size, and be JSON where the store records a type (S3 does, the local
   * adapter does not). The document is neither downloaded nor parsed here: that is the
   * worker's job, off the request path.
   *
   * What it reads is not trusted as proof of content or size: a presigned URL can be replayed
   * inside its window, so the worker's own `maxBytes` and full validation are what hold.
   */
  private async resolveImportUpload(
    projectId: string,
    source: NonNullable<MutationStartProjectSyncArgs['input']['source']>
  ): Promise<ProjectSyncJobPayloadReference> {
    const uploadId = normalizeUploadId(source.uploadId);
    const path = cdmImportObjectKey(projectId, uploadId);
    const policy = config.storage.cdmImport;

    const metadata = await this.fileStorage.getMetadata(path);
    if (!metadata) {
      throw new NotFoundError('ProjectSyncUpload', uploadId);
    }
    if (metadata.size <= 0) {
      throw new ValidationError('The uploaded CDM document is empty');
    }
    if (metadata.size > policy.maxBytes) {
      throw new PayloadTooLargeError(
        `The uploaded CDM document exceeds the maximum of ${policy.maxBytes} bytes (CDM_UPLOAD_MAX_BYTES)`,
        policy.maxBytes,
        metadata.size
      );
    }
    if (
      metadata.contentType !== undefined &&
      !(policy.contentTypes as readonly string[]).includes(baseMediaType(metadata.contentType))
    ) {
      throw new ValidationError(
        `The uploaded CDM document is ${metadata.contentType}; only ${policy.contentTypes.join(', ')} is accepted`
      );
    }

    return {
      path,
      sizeBytes: metadata.size,
      // GraphQL `Int` is 32-bit like the column; REST is bounded by its schema. Refuse anything else.
      entityCountHint: this.entityCountHint(source.entityCount),
    };
  }

  public async startProjectExport(
    params: MutationStartProjectExportArgs & { enqueuedById: string }
  ): Promise<ProjectSyncJob> {
    const jobs = this.jobs;
    if (!jobs || !jobs.enqueue) {
      throw new ConfigurationError(
        'Project sync jobs are unavailable: job adapter is not configured. Set JOBS_ENABLED=true.'
      );
    }
    const enqueueJob = jobs.enqueue.bind(jobs);

    this.assertProjectScope(params.scope);
    const scopeProjectId = this.projectIdFromScope(params.scope);
    if (scopeProjectId !== params.id) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }

    if (params.input.version !== 1) {
      throw new ValidationError('Unsupported version; only 1 is allowed');
    }

    const explicitJobName =
      params.input.jobName != null && params.input.jobName.trim() !== ''
        ? params.input.jobName.trim()
        : null;
    const jobName = explicitJobName ?? (await this.resolveProjectDisplayName(params.id));
    if (jobName !== null) {
      const inflight = await this.projectSyncJobs.findActiveByJobKey({
        projectId: params.id,
        operation: 'export',
        jobName,
        statuses: ['pending', 'running'],
      });
      if (inflight) {
        return inflight;
      }
    }

    const sections =
      params.input.sections != null && params.input.sections.length > 0
        ? assertValidCdmExportSections(params.input.sections)
        : undefined;

    const exportMode = this.resolveExportMode(params.input.mode);
    this.validateExportMode(exportMode);

    const modeStrategyDb: 'merge' | 'replace' =
      exportMode.strategy === CdmModeStrategy.Merge ? 'merge' : 'replace';

    const payload: ProjectSyncJobExportPayload = {
      version: params.input.version,
      ...(sections != null && sections.length > 0 ? { sections: [...sections] } : {}),
      mode: {
        strategy: modeStrategyDb,
        onConflict: exportMode.onConflict,
        confirmDestructive: exportMode.confirmDestructive,
      },
    };
    if (params.input.includeUserApiKeys !== undefined && params.input.includeUserApiKeys !== null) {
      payload.includeUserApiKeys = params.input.includeUserApiKeys;
    }

    const job = await this.projectSyncJobs.create({
      projectId: params.id,
      scope: params.scope,
      cdmVersion: params.input.version,
      jobName,
      operation: 'export',
      modeStrategy: modeStrategyDb,
      payload,
      enqueuedById: params.enqueuedById,
    });

    await this.enqueueProjectSyncJobAfterCommit(enqueueJob, params.scope, job.id);
    return job;
  }

  /**
   * Hand the job to the queue once the request transaction has committed.
   *
   * The enqueue is returned to the after-commit runner, which awaits it before the response is
   * flushed (a message sent after the response is lost where the runtime freezes, e.g. Lambda).
   * With no after-commit hook there is no surrounding transaction, so it is awaited here.
   * A failed enqueue is logged with the job id and does not fail the request: the row is
   * committed and the caller still gets the pending job back.
   */
  private async enqueueProjectSyncJobAfterCommit(
    enqueueJob: (
      jobId: string,
      data: { scope: Scope; payload: { jobRecordId: string } }
    ) => void | Promise<unknown>,
    scope: Scope,
    jobRecordId: string
  ): Promise<void> {
    const runEnqueue = async (): Promise<void> => {
      try {
        await enqueueJob(PROJECT_SYNC_JOB_ID, { scope, payload: { jobRecordId } });
      } catch (err: unknown) {
        logger.error({
          msg: 'Failed to enqueue project sync job; the job stays pending',
          jobRecordId,
          err,
        });
      }
    };
    if (this.scheduleAfterCommit) {
      this.scheduleAfterCommit(runEnqueue, `${PROJECT_SYNC_JOB_ID}:${jobRecordId}`);
      return;
    }
    await runEnqueue();
  }

  private async resolveProjectDisplayName(projectId: string): Promise<string | null> {
    const page = await this.projects.getProjects({
      ids: [projectId],
      page: 1,
      limit: 1,
      requestedFields: ['name'],
    });
    const name = page.projects[0]?.name?.trim();
    return name && name.length > 0 ? name : null;
  }

  public async getProjectSyncJob(params: QueryProjectSyncJobArgs): Promise<ProjectSyncJob> {
    this.assertProjectScope(params.scope);
    return this.projectSyncJobs.getById({
      projectId: params.id,
      jobId: params.jobId,
    });
  }

  public async listProjectSyncJobs(params: QueryProjectSyncJobsArgs): Promise<ProjectSyncJobPage> {
    this.assertProjectScope(params.scope);
    const scopeProjectId = this.projectIdFromScope(params.scope);
    if (scopeProjectId !== params.id) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    return this.projectSyncJobs.list({
      projectId: params.id,
      scope: params.scope,
      page: params.page,
      limit: params.limit,
      search: params.search,
      sort: params.sort,
      status: params.status,
    });
  }

  /**
   * The document that started an import, for the REST download.
   *
   * A by-reference job answers `{ byReference: true, sizeBytes }` and nothing else: the
   * document is unredacted (it can carry bring-your-own API key secrets), was never
   * readable through this endpoint before, and must not become readable through it now.
   * Inline jobs are unchanged. See ADR 0009.
   */
  public async getProjectSyncJobPayload(
    params: QueryProjectSyncJobArgs
  ): Promise<
    | { byReference: false; payload: unknown; jobName: string | null; cdmVersion: number }
    | { byReference: true; sizeBytes: number; jobName: string | null; cdmVersion: number }
  > {
    this.assertProjectScope(params.scope);
    const scopeProjectId = this.projectIdFromScope(params.scope);
    if (scopeProjectId !== params.id) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    const { payload, payloadRef, jobName, cdmVersion } = await this.projectSyncJobs.getPayload({
      projectId: params.id,
      jobId: params.jobId,
    });
    if (payloadRef) {
      return { byReference: true, sizeBytes: payloadRef.sizeBytes, jobName, cdmVersion };
    }
    return { byReference: false, payload, jobName, cdmVersion };
  }

  public async cancelProjectSync(params: MutationCancelProjectSyncArgs): Promise<ProjectSyncJob> {
    this.assertProjectScope(params.scope);
    return this.projectSyncJobs.cancel({
      projectId: params.id,
      jobId: params.jobId,
    });
  }

  public async getProjectSyncJobSnapshot(params: QueryProjectSyncJobArgs): Promise<{
    snapshot: SyncProjectInput;
    takenAt: Date;
    sizeBytes: number;
  }> {
    this.assertProjectScope(params.scope);
    const scopeProjectId = this.projectIdFromScope(params.scope);
    if (scopeProjectId !== params.id) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    const job = await this.projectSyncJobs.getById({
      projectId: params.id,
      jobId: params.jobId,
    });
    const result = await this.projectSyncJobs.getSnapshot({
      projectId: params.id,
      jobId: params.jobId,
    });
    if (!result) {
      throw new NotFoundError('ProjectSyncJobSnapshot', params.jobId);
    }
    if (
      job.operation === ProjectSyncJobOperation.Export &&
      job.status !== ProjectSyncJobStatus.Completed
    ) {
      throw new NotFoundError('ProjectSyncJobSnapshot', params.jobId);
    }
    return result;
  }

  private assertProjectScope(scope: { tenant: Tenant; id: string }): void {
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      throw new ValidationError(
        'project sync jobs require accountProject or organizationProject scope'
      );
    }
  }

  private projectIdFromScope(scope: { id: string }): string {
    return scope.id.split(':')[1] ?? '';
  }

  private resolveExportMode(mode: MutationStartProjectExportArgs['input']['mode']): {
    strategy: CdmModeStrategy;
    onConflict: CdmOnConflict | null;
    confirmDestructive: boolean;
  } {
    return {
      strategy: mode?.strategy ?? CdmModeStrategy.Merge,
      onConflict: mode?.onConflict ?? null,
      confirmDestructive: mode?.confirmDestructive ?? false,
    };
  }

  private validateExportMode(mode: {
    strategy: CdmModeStrategy;
    confirmDestructive: boolean;
  }): void {
    if (mode.strategy === CdmModeStrategy.Replace && mode.confirmDestructive !== true) {
      throw new ValidationError(
        'mode.confirmDestructive must be true when mode.strategy is replace'
      );
    }
  }

  public async createProject(params: MutationCreateProjectArgs): Promise<Project> {
    const scope = params.input.scope;
    const project = await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, description, scope, tagIds, primaryTagId } = input;

      const project = await this.projects.createProject({ name, description }, tx);
      const { id: projectId } = project;

      switch (scope.tenant) {
        case Tenant.Account:
          await this.accountProjects.addAccountProject({ accountId: scope.id, projectId }, tx);
          break;
        case Tenant.Organization:
          await this.organizationProjects.addOrganizationProject(
            { organizationId: scope.id, projectId },
            tx
          );
          break;
        default:
          throw new BadRequestError('Invalid scope');
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) => {
            switch (scope.tenant) {
              case Tenant.Organization:
                return this.organizationProjectTags.addOrganizationProjectTag(
                  { organizationId: scope.id, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                );
              case Tenant.Account:
                return this.accountProjectTags.addAccountProjectTag(
                  { accountId: scope.id, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                );
              default:
                throw new BadRequestError('Invalid scope');
            }
          })
        );
      }

      await this.addProjectIdToScopeCache(scope, projectId);

      return project;
    });

    trackProductEventAfterCommit(this.scheduleAfterCommit, {
      name: 'project.created',
      properties: {
        projectId: project.id,
        scopeTenant: scope.tenant,
        scopeId: scope.id,
      },
    });

    return project;
  }

  public async updateProject(params: MutationUpdateProjectArgs): Promise<Project> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: projectId, input } = params;
      const { scope, tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];

      if (Array.isArray(tagIds)) {
        switch (scope.tenant) {
          case Tenant.Organization:
            {
              const organizationId = scope.id;
              const currentTags = await this.organizationProjectTags.getOrganizationProjectTags(
                { organizationId, projectId },
                tx
              );
              currentTagIds = currentTags.map((pt) => pt.tagId);
            }
            break;
          case Tenant.Account:
            {
              const accountId = scope.id;
              const currentTags = await this.accountProjectTags.getAccountProjectTags(
                { accountId, projectId },
                tx
              );
              currentTagIds = currentTags.map((pt) => pt.tagId);
            }
            break;
          default:
            throw new BadRequestError('Invalid scope');
        }
      }

      const updatedProject = await this.projects.updateProject(params, tx);

      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        switch (scope.tenant) {
          case Tenant.Organization: {
            const organizationId = scope.id;
            await Promise.all(
              updatedTagIds.map((tagId) =>
                this.organizationProjectTags.updateOrganizationProjectTag(
                  { organizationId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              newTagIds.map((tagId) =>
                this.organizationProjectTags.addOrganizationProjectTag(
                  { organizationId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              removedTagIds.map((tagId) =>
                this.organizationProjectTags.removeOrganizationProjectTag(
                  { organizationId, projectId, tagId },
                  tx
                )
              )
            );
            break;
          }
          case Tenant.Account: {
            const accountId = scope.id;
            await Promise.all(
              updatedTagIds.map((tagId) =>
                this.accountProjectTags.updateAccountProjectTag(
                  { accountId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              newTagIds.map((tagId) =>
                this.accountProjectTags.addAccountProjectTag(
                  { accountId, projectId, tagId, isPrimary: tagId === primaryTagId },
                  tx
                )
              )
            );
            await Promise.all(
              removedTagIds.map((tagId) =>
                this.accountProjectTags.removeAccountProjectTag({ accountId, projectId, tagId }, tx)
              )
            );
            break;
          }
          default:
            throw new BadRequestError('Invalid scope');
        }
      }
      return updatedProject;
    });
  }

  public async deleteProject(params: MutationDeleteProjectArgs & DeleteParams): Promise<Project> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: projectId, scope } = params;

      const [projectTags, projectPermissions, projectGroups, projectRoles, projectUsers] =
        await Promise.all([
          this.projectTags.getProjectTags({ projectId }, tx),
          this.projectPermissions.getProjectPermissions({ projectId }, tx),
          this.projectGroups.getProjectGroups({ projectId }, tx),
          this.projectRoles.getProjectRoles({ projectId }, tx),
          this.projectUsers.getProjectUsers({ projectId }, tx),
        ]);

      const tagIds = projectTags.map((pt) => pt.tagId);
      const permissionIds = projectPermissions.map((pp) => pp.permissionId);
      const groupIds = projectGroups.map((pg) => pg.groupId);
      const roleIds = projectRoles.map((pr) => pr.roleId);
      const userIds = projectUsers.map((pu) => pu.userId);

      switch (scope.tenant) {
        case Tenant.Account: {
          const accountId = scope.id;

          const accountProjectTags = await this.accountProjectTags.getAccountProjectTags(
            { accountId, projectId },
            tx
          );
          const accountTagIds = accountProjectTags.map((apt) => apt.tagId);

          await this.accountProjects.removeAccountProject({ accountId, projectId }, tx);

          await Promise.all(
            accountTagIds.map((tagId) =>
              this.accountProjectTags.removeAccountProjectTag({ accountId, projectId, tagId }, tx)
            )
          );
          break;
        }
        case Tenant.Organization: {
          const organizationId = scope.id;

          const organizationProjectTags =
            await this.organizationProjectTags.getOrganizationProjectTags(
              { organizationId, projectId },
              tx
            );
          const organizationTagIds = organizationProjectTags.map((opt) => opt.tagId);

          await this.organizationProjects.removeOrganizationProject(
            { organizationId, projectId },
            tx
          );

          await Promise.all(
            organizationTagIds.map((tagId) =>
              this.organizationProjectTags.removeOrganizationProjectTag(
                { organizationId, projectId, tagId },
                tx
              )
            )
          );
          break;
        }
        default:
          throw new BadRequestError('Invalid scope');
      }

      const userRolesForProjectRoles = await Promise.all(
        roleIds.map((roleId) => this.scopeServices.userRoles.getUserRoles({ roleId }, tx))
      );

      await Promise.all([
        ...tagIds.map((tagId) => this.projectTags.removeProjectTag({ projectId, tagId }, tx)),
        ...permissionIds.map((permissionId) =>
          this.projectPermissions.removeProjectPermission({ projectId, permissionId }, tx)
        ),
        ...groupIds.map((groupId) =>
          this.projectGroups.removeProjectGroup({ projectId, groupId }, tx)
        ),
        ...roleIds.map((roleId) => this.projectRoles.removeProjectRole({ projectId, roleId }, tx)),
        ...userRolesForProjectRoles
          .flat()
          .map((ur) =>
            this.scopeServices.userRoles.removeUserRole(
              { userId: ur.userId, roleId: ur.roleId },
              tx
            )
          ),
      ]);

      const uniqueUserIds = [...new Set(userIds)];
      for (const userId of uniqueUserIds) {
        await this.projectUsers.removeProjectUser({ projectId, userId }, tx);
      }

      await this.removeProjectIdFromScopeCache(scope, projectId);

      return await this.projects.deleteProject(params, tx);
    });
  }

  private assertProjectPictureScope(projectId: string, scope: UploadProjectPictureInput['scope']) {
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      throw new ValidationError(
        'project pictures require accountProject or organizationProject scope'
      );
    }
    if (this.extractProjectIdFromScope(scope) !== projectId) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
  }

  private projectPicturePath(projectId: string, filename: string): string {
    return this.fileStorage.sanitizeExtensionAndGeneratePath(
      filename,
      `projects/${projectId}/picture`
    );
  }

  public async requestProjectPictureUploadUrl(
    params: RequestProjectPictureUploadUrlInput
  ): Promise<UploadUrl> {
    const { projectId, filename, contentType, contentLength, scope } = params;
    this.assertProjectPictureScope(projectId, scope);
    this.fileStorage.validateUploadRequest({ contentType, filename, contentLength });
    const minted = await this.fileStorage.getUploadUrl(
      this.projectPicturePath(projectId, filename),
      {
        contentType,
        contentLength,
        expiresInSeconds: config.storage.upload.urlExpirySeconds,
      }
    );
    return {
      url: minted.url,
      method: minted.method,
      expiresAt: minted.expiresAt,
      headers: Object.entries(minted.headers).map(([name, value]) => ({ name, value })),
    };
  }

  public async confirmProjectPictureUpload(
    params: ConfirmProjectPictureUploadInput
  ): Promise<{ url: string; path: string }> {
    const { projectId, filename, scope } = params;
    this.assertProjectPictureScope(projectId, scope);
    const storagePath = this.projectPicturePath(projectId, filename);
    await this.fileStorage.assertStoredWithinPolicy(storagePath);
    return await this.db.withTransaction(async (tx: Transaction) => {
      const url = await this.fileStorage.getUrl(storagePath);
      await this.projects.setProjectPicture(projectId, { picturePath: storagePath }, tx);
      return { url, path: storagePath };
    });
  }

  public async uploadProjectPicture(
    params: UploadProjectPictureInput
  ): Promise<{ url: string; path: string }> {
    const { projectId, file, contentType, filename, scope } = params;
    this.assertProjectPictureScope(projectId, scope);
    const fileBuffer = this.fileStorage.validateAndDecodeUpload({ file, contentType, filename });
    const storagePath = this.projectPicturePath(projectId, filename);
    return await this.db.withTransaction(async (tx: Transaction) => {
      const result = await this.fileStorage.upload(fileBuffer, storagePath, {
        contentType,
        public: true,
      });
      await this.projects.setProjectPicture(projectId, { picturePath: result.path }, tx);
      return { url: result.url, path: result.path };
    });
  }

  public async clearProjectPicture(params: ClearProjectPictureInput): Promise<Project> {
    this.assertProjectPictureScope(params.projectId, params.scope);
    return await this.db.withTransaction(async (tx: Transaction) => {
      return this.projects.setProjectPicture(
        params.projectId,
        { picturePath: null, pictureUrl: null },
        tx
      );
    });
  }
}
