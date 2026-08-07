import type {
  IAccountProjectService,
  IAccountProjectTagService,
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
} from '@grantjs/core';
import {
  CdmFindBy,
  CdmModeStrategy,
  CdmOnConflict,
  MutationCancelProjectSyncArgs,
  MutationCreateProjectArgs,
  MutationDeleteProjectArgs,
  MutationStartProjectExportArgs,
  MutationStartProjectSyncArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectPage,
  ProjectSyncJob,
  ProjectSyncJobOperation,
  ProjectSyncJobPage,
  ProjectSyncJobStatus,
  QueryProjectsArgs,
  QueryProjectSyncJobArgs,
  QueryProjectSyncJobsArgs,
  Scope,
  SyncProjectInput,
  Tenant,
} from '@grantjs/schema';

import { assertValidCdmExportSections } from '@/constants/cdm-export.constants';
import { PROJECT_SYNC_JOB_ID } from '@/constants/project-sync.constants';
import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError, ConfigurationError, NotFoundError, ValidationError } from '@/lib/errors';
import { intersectScopedIds } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

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
    private readonly scheduleAfterCommit?: (fn: () => void | Promise<void>) => void
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
    this.validateSyncInput(params.input);

    const jobName = params.input.id ?? null;
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
      params.input.mode.strategy === CdmModeStrategy.Merge ? 'merge' : 'replace';

    const job = await this.projectSyncJobs.create({
      projectId: params.id,
      scope: params.scope,
      cdmVersion: params.input.version,
      jobName,
      operation: 'import',
      modeStrategy: modeStrategyDb,
      payload: params.input,
      enqueuedById: params.enqueuedById,
    });

    this.enqueueProjectSyncJobAfterCommit(enqueueJob, params.scope, job.id);
    return job;
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

    this.enqueueProjectSyncJobAfterCommit(enqueueJob, params.scope, job.id);
    return job;
  }

  private enqueueProjectSyncJobAfterCommit(
    enqueueJob: (jobId: string, data: { scope: Scope; payload: { jobRecordId: string } }) => void,
    scope: Scope,
    jobRecordId: string
  ): void {
    const runEnqueue = (): void => {
      void enqueueJob(PROJECT_SYNC_JOB_ID, { scope, payload: { jobRecordId } });
    };
    const defer =
      this.scheduleAfterCommit ??
      ((fn: () => void | Promise<void>) => {
        void Promise.resolve(fn());
      });
    defer(runEnqueue);
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

  public async getProjectSyncJobPayload(params: QueryProjectSyncJobArgs): Promise<{
    payload: unknown;
    jobName: string | null;
    cdmVersion: number;
  }> {
    this.assertProjectScope(params.scope);
    const scopeProjectId = this.projectIdFromScope(params.scope);
    if (scopeProjectId !== params.id) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    return this.projectSyncJobs.getPayload({
      projectId: params.id,
      jobId: params.jobId,
    });
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

  private validateSyncInput(input: MutationStartProjectSyncArgs['input']): void {
    if (input.version !== 1) {
      throw new ValidationError('Unsupported version; only 1 is allowed');
    }
    if (input.mode?.strategy === 'replace' && input.mode.confirmDestructive !== true) {
      throw new ValidationError(
        'mode.confirmDestructive must be true when mode.strategy is replace'
      );
    }

    const roleKeys = new Set<string>();
    for (const r of input.roles) {
      if (roleKeys.has(r.key)) {
        throw new ValidationError(`Duplicate role key: ${r.key}`);
      }
      roleKeys.add(r.key);
    }

    const userSeen = new Set<string>();
    for (const u of input.users) {
      const isId = u.key.findBy === CdmFindBy.Id;
      const dedupe = isId ? `id:${u.key.value}` : `key:${u.key.value}`;
      if (userSeen.has(dedupe)) {
        throw new ValidationError(`Duplicate user entry: ${dedupe}`);
      }
      userSeen.add(dedupe);
    }
  }

  public async createProject(params: MutationCreateProjectArgs): Promise<Project> {
    return await this.db.withTransaction(async (tx: Transaction) => {
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
}
