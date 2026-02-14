/**
 * Project-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  AddProjectGroupInput,
  AddProjectPermissionInput,
  AddProjectResourceInput,
  AddProjectRoleInput,
  AddProjectTagInput,
  AddProjectUserApiKeyInput,
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
  QueryProjectGroupsInput,
  QueryProjectPermissionsInput,
  QueryProjectResourcesInput,
  QueryProjectRolesInput,
  QueryProjectTagsInput,
  QueryProjectUserApiKeysInput,
  QueryProjectUsersInput,
  QueryProjectsArgs,
  RemoveProjectGroupInput,
  RemoveProjectPermissionInput,
  RemoveProjectResourceInput,
  RemoveProjectRoleInput,
  RemoveProjectTagInput,
  RemoveProjectUserApiKeyInput,
  RemoveProjectUserInput,
  UpdateProjectTagInput,
} from '@grantjs/schema';

export interface IProjectRepository {
  getProjects(
    params: Omit<QueryProjectsArgs, 'scope' | 'tagIds'> & SelectedFields<Project>,
    transaction?: unknown
  ): Promise<ProjectPage>;

  createProject(
    params: Omit<CreateProjectInput, 'scope' | 'tagIds'>,
    transaction?: unknown
  ): Promise<Project>;

  updateProject(params: MutationUpdateProjectArgs, transaction?: unknown): Promise<Project>;

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
  getProjectUsers(params: QueryProjectUsersInput, transaction?: unknown): Promise<ProjectUser[]>;

  addProjectUser(params: AddProjectUserInput, transaction?: unknown): Promise<ProjectUser>;

  softDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: unknown
  ): Promise<ProjectUser>;

  hardDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: unknown
  ): Promise<ProjectUser>;

  getProjectUserMemberships(
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

export interface IProjectPermissionRepository {
  getProjectPermissions(
    params: QueryProjectPermissionsInput,
    transaction?: unknown
  ): Promise<ProjectPermission[]>;

  addProjectPermission(
    params: AddProjectPermissionInput,
    transaction?: unknown
  ): Promise<ProjectPermission>;

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
}
