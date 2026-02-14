/**
 * Project-domain service port interfaces.
 * Covers: Project, ProjectUser, ProjectRole, ProjectGroup,
 *         ProjectPermission, ProjectResource, ProjectTag,
 *         ProjectUserApiKey.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
import type {
  AddProjectGroupInput,
  AddProjectPermissionInput,
  AddProjectResourceInput,
  AddProjectRoleInput,
  AddProjectTagInput,
  AddProjectUserInput,
  CreateProjectInput,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectGroup,
  ProjectPage,
  ProjectPermission,
  ProjectResource,
  ProjectRole,
  ProjectTag,
  ProjectUser,
  ProjectUserApiKey,
  QueryProjectPermissionsInput,
  QueryProjectResourcesInput,
  QueryProjectsArgs,
  RemoveProjectGroupInput,
  RemoveProjectPermissionInput,
  RemoveProjectResourceInput,
  RemoveProjectRoleInput,
  RemoveProjectTagInput,
  RemoveProjectUserInput,
  UpdateProjectTagInput,
} from '@grantjs/schema';

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
      role: string;
      joinedAt: Date;
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
// IProjectPermissionService
// ---------------------------------------------------------------------------

export interface IProjectPermissionService {
  getProjectPermissions(
    params: QueryProjectPermissionsInput,
    transaction?: unknown
  ): Promise<ProjectPermission[]>;

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
    params: { projectId: string; userId: string; apiKeyId: string },
    transaction?: unknown
  ): Promise<ProjectUserApiKey>;

  removeProjectUserApiKey(
    params: { projectId: string; userId: string; apiKeyId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectUserApiKey>;
}
