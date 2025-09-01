import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Context } from '@/graphql/types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: Date; output: Date; }
};

export type AddGroupPermissionInput = {
  groupId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type AddGroupTagInput = {
  groupId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddOrganizationGroupInput = {
  groupId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
};

export type AddOrganizationPermissionInput = {
  organizationId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type AddOrganizationProjectInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddOrganizationRoleInput = {
  organizationId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddOrganizationTagInput = {
  organizationId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddOrganizationUserInput = {
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddPermissionTagInput = {
  permissionId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddProjectGroupInput = {
  groupId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddProjectPermissionInput = {
  permissionId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddProjectRoleInput = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddProjectTagInput = {
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddProjectUserInput = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddRoleGroupInput = {
  groupId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddRoleTagInput = {
  roleId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddUserRoleInput = {
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddUserTagInput = {
  tagId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type Auditable = {
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type Creatable = {
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type CreateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateOrganizationInput = {
  name: Scalars['String']['input'];
};

export type CreatePermissionInput = {
  action: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  organizationId: Scalars['ID']['input'];
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateTagInput = {
  color: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateUserInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type Group = Auditable & {
  __typename?: 'Group';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Permission>>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};


export type GroupPermissionsArgs = {
  scope: Scope;
};


export type GroupTagsArgs = {
  scope: Scope;
};

export type GroupPage = PaginatedResults & {
  __typename?: 'GroupPage';
  groups: Array<Group>;
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type GroupPermission = Auditable & {
  __typename?: 'GroupPermission';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type GroupPermissionGroupArgs = {
  scope: Scope;
};


export type GroupPermissionPermissionArgs = {
  scope: Scope;
};

export type GroupSortInput = {
  field: GroupSortableField;
  order: SortOrder;
};

export enum GroupSortableField {
  Name = 'name'
}

export type GroupTag = Auditable & {
  __typename?: 'GroupTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type GroupTagGroupArgs = {
  scope: Scope;
};


export type GroupTagTagArgs = {
  scope: Scope;
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type LoginResponse = {
  __typename?: 'LoginResponse';
  token: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  addGroupPermission: GroupPermission;
  addGroupTag: GroupTag;
  addOrganizationGroup: OrganizationGroup;
  addOrganizationPermission: OrganizationPermission;
  addOrganizationProject: OrganizationProject;
  addOrganizationRole: OrganizationRole;
  addOrganizationTag: OrganizationTag;
  addOrganizationUser: OrganizationUser;
  addPermissionTag: PermissionTag;
  addProjectGroup: ProjectGroup;
  addProjectPermission: ProjectPermission;
  addProjectRole: ProjectRole;
  addProjectTag: ProjectTag;
  addProjectUser: ProjectUser;
  addRoleGroup: RoleGroup;
  addRoleTag: RoleTag;
  addUserRole: UserRole;
  addUserTag: UserTag;
  createGroup: Group;
  createOrganization: Organization;
  createPermission: Permission;
  createProject: Project;
  createRole: Role;
  createTag: Tag;
  createUser: User;
  deleteGroup: Group;
  deleteOrganization: Organization;
  deletePermission: Permission;
  deleteProject: Project;
  deleteRole: Role;
  deleteTag: Tag;
  deleteUser: User;
  login: LoginResponse;
  removeGroupPermission: GroupPermission;
  removeGroupTag: GroupTag;
  removeOrganizationGroup: OrganizationGroup;
  removeOrganizationPermission: OrganizationPermission;
  removeOrganizationProject: OrganizationProject;
  removeOrganizationRole: OrganizationRole;
  removeOrganizationTag: OrganizationTag;
  removeOrganizationUser: OrganizationUser;
  removePermissionTag: PermissionTag;
  removeProjectGroup: ProjectGroup;
  removeProjectPermission: ProjectPermission;
  removeProjectRole: ProjectRole;
  removeProjectTag: ProjectTag;
  removeProjectUser: ProjectUser;
  removeRoleGroup: RoleGroup;
  removeRoleTag: RoleTag;
  removeUserRole: UserRole;
  removeUserTag: UserTag;
  updateGroup: Group;
  updateOrganization: Organization;
  updatePermission: Permission;
  updateProject: Project;
  updateRole: Role;
  updateTag: Tag;
  updateUser: User;
};


export type MutationAddGroupPermissionArgs = {
  input: AddGroupPermissionInput;
};


export type MutationAddGroupTagArgs = {
  input: AddGroupTagInput;
};


export type MutationAddOrganizationGroupArgs = {
  input: AddOrganizationGroupInput;
};


export type MutationAddOrganizationPermissionArgs = {
  input: AddOrganizationPermissionInput;
};


export type MutationAddOrganizationProjectArgs = {
  input: AddOrganizationProjectInput;
};


export type MutationAddOrganizationRoleArgs = {
  input: AddOrganizationRoleInput;
};


export type MutationAddOrganizationTagArgs = {
  input: AddOrganizationTagInput;
};


export type MutationAddOrganizationUserArgs = {
  input: AddOrganizationUserInput;
};


export type MutationAddPermissionTagArgs = {
  input: AddPermissionTagInput;
};


export type MutationAddProjectGroupArgs = {
  input: AddProjectGroupInput;
};


export type MutationAddProjectPermissionArgs = {
  input: AddProjectPermissionInput;
};


export type MutationAddProjectRoleArgs = {
  input: AddProjectRoleInput;
};


export type MutationAddProjectTagArgs = {
  input: AddProjectTagInput;
};


export type MutationAddProjectUserArgs = {
  input: AddProjectUserInput;
};


export type MutationAddRoleGroupArgs = {
  input: AddRoleGroupInput;
};


export type MutationAddRoleTagArgs = {
  input: AddRoleTagInput;
};


export type MutationAddUserRoleArgs = {
  input: AddUserRoleInput;
};


export type MutationAddUserTagArgs = {
  input: AddUserTagInput;
};


export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};


export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type MutationCreatePermissionArgs = {
  input: CreatePermissionInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};


export type MutationCreateTagArgs = {
  input: CreateTagInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeleteGroupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteOrganizationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePermissionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
};


export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTagArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationRemoveGroupPermissionArgs = {
  input: RemoveGroupPermissionInput;
};


export type MutationRemoveGroupTagArgs = {
  input: RemoveGroupTagInput;
};


export type MutationRemoveOrganizationGroupArgs = {
  input: RemoveOrganizationGroupInput;
};


export type MutationRemoveOrganizationPermissionArgs = {
  input: RemoveOrganizationPermissionInput;
};


export type MutationRemoveOrganizationProjectArgs = {
  input: RemoveOrganizationProjectInput;
};


export type MutationRemoveOrganizationRoleArgs = {
  input: RemoveOrganizationRoleInput;
};


export type MutationRemoveOrganizationTagArgs = {
  input: RemoveOrganizationTagInput;
};


export type MutationRemoveOrganizationUserArgs = {
  input: RemoveOrganizationUserInput;
};


export type MutationRemovePermissionTagArgs = {
  input: RemovePermissionTagInput;
};


export type MutationRemoveProjectGroupArgs = {
  input: RemoveProjectGroupInput;
};


export type MutationRemoveProjectPermissionArgs = {
  input: RemoveProjectPermissionInput;
};


export type MutationRemoveProjectRoleArgs = {
  input: RemoveProjectRoleInput;
};


export type MutationRemoveProjectTagArgs = {
  input: RemoveProjectTagInput;
};


export type MutationRemoveProjectUserArgs = {
  input: RemoveProjectUserInput;
};


export type MutationRemoveRoleGroupArgs = {
  input: RemoveRoleGroupInput;
};


export type MutationRemoveRoleTagArgs = {
  input: RemoveRoleTagInput;
};


export type MutationRemoveUserRoleArgs = {
  input: RemoveUserRoleInput;
};


export type MutationRemoveUserTagArgs = {
  input: RemoveUserTagInput;
};


export type MutationUpdateGroupArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGroupInput;
};


export type MutationUpdateOrganizationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOrganizationInput;
};


export type MutationUpdatePermissionArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePermissionInput;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateRoleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
};


export type MutationUpdateTagArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTagInput;
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type Organization = Auditable & {
  __typename?: 'Organization';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  groups?: Maybe<Array<Group>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Permission>>;
  projects?: Maybe<Array<Project>>;
  roles?: Maybe<Array<Role>>;
  slug: Scalars['String']['output'];
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
  users?: Maybe<Array<User>>;
};

export type OrganizationGroup = Auditable & {
  __typename?: 'OrganizationGroup';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationPage = PaginatedResults & {
  __typename?: 'OrganizationPage';
  hasNextPage: Scalars['Boolean']['output'];
  organizations: Array<Organization>;
  totalCount: Scalars['Int']['output'];
};

export type OrganizationPermission = Auditable & {
  __typename?: 'OrganizationPermission';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationProject = Auditable & {
  __typename?: 'OrganizationProject';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationRole = Auditable & {
  __typename?: 'OrganizationRole';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationSortInput = {
  field: OrganizationSortableField;
  order: SortOrder;
};

export enum OrganizationSortableField {
  CreatedAt = 'createdAt',
  Name = 'name',
  UpdatedAt = 'updatedAt'
}

export type OrganizationTag = Auditable & {
  __typename?: 'OrganizationTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationUser = Auditable & {
  __typename?: 'OrganizationUser';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type PaginatedResults = {
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type Permission = Auditable & {
  __typename?: 'Permission';
  action: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};


export type PermissionTagsArgs = {
  scope: Scope;
};

export type PermissionPage = PaginatedResults & {
  __typename?: 'PermissionPage';
  hasNextPage: Scalars['Boolean']['output'];
  permissions: Array<Permission>;
  totalCount: Scalars['Int']['output'];
};

export type PermissionSortInput = {
  field: PermissionSortableField;
  order: SortOrder;
};

export enum PermissionSortableField {
  Action = 'action',
  Name = 'name'
}

export type PermissionTag = Auditable & {
  __typename?: 'PermissionTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type PermissionTagPermissionArgs = {
  scope: Scope;
};


export type PermissionTagTagArgs = {
  scope: Scope;
};

export type Project = Auditable & {
  __typename?: 'Project';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  groups?: Maybe<Array<Group>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Permission>>;
  roles?: Maybe<Array<Role>>;
  slug: Scalars['String']['output'];
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
  users?: Maybe<Array<User>>;
};

export type ProjectGroup = Auditable & {
  __typename?: 'ProjectGroup';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type ProjectGroupProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectPage = PaginatedResults & {
  __typename?: 'ProjectPage';
  hasNextPage: Scalars['Boolean']['output'];
  projects: Array<Project>;
  totalCount: Scalars['Int']['output'];
};

export type ProjectPermission = Auditable & {
  __typename?: 'ProjectPermission';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type ProjectPermissionProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectRole = Auditable & {
  __typename?: 'ProjectRole';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type ProjectRoleProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectSortInput = {
  field: ProjectSortableField;
  order: SortOrder;
};

export enum ProjectSortableField {
  CreatedAt = 'createdAt',
  Name = 'name',
  UpdatedAt = 'updatedAt'
}

export type ProjectTag = Auditable & {
  __typename?: 'ProjectTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type ProjectTagProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectUser = Auditable & {
  __typename?: 'ProjectUser';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};


export type ProjectUserProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  groupPermissions: Array<GroupPermission>;
  groupTags: Array<GroupTag>;
  groups: GroupPage;
  organizationGroups: Array<OrganizationGroup>;
  organizationPermissions: Array<OrganizationPermission>;
  organizationProjects: Array<OrganizationProject>;
  organizationRoles: Array<OrganizationRole>;
  organizationTags: Array<OrganizationTag>;
  organizationUsers: Array<OrganizationUser>;
  organizations: OrganizationPage;
  permissionTags: Array<PermissionTag>;
  permissions: PermissionPage;
  projectGroups: Array<ProjectGroup>;
  projectPermissions: Array<ProjectPermission>;
  projectRoles: Array<ProjectRole>;
  projectTags: Array<ProjectTag>;
  projectUsers: Array<ProjectUser>;
  projects: ProjectPage;
  roleGroups: Array<RoleGroup>;
  roleTags: Array<RoleTag>;
  roles: RolePage;
  tags: TagPage;
  userRoles: Array<UserRole>;
  userTags: Array<UserTag>;
  users: UserPage;
};


export type QueryGroupPermissionsArgs = {
  groupId: Scalars['ID']['input'];
  scope: Scope;
};


export type QueryGroupTagsArgs = {
  groupId: Scalars['ID']['input'];
  scope: Scope;
};


export type QueryGroupsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<GroupSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryOrganizationGroupsArgs = {
  organizationId: Scalars['ID']['input'];
};


export type QueryOrganizationPermissionsArgs = {
  organizationId: Scalars['ID']['input'];
};


export type QueryOrganizationProjectsArgs = {
  organizationId: Scalars['ID']['input'];
};


export type QueryOrganizationRolesArgs = {
  organizationId: Scalars['ID']['input'];
};


export type QueryOrganizationTagsArgs = {
  organizationId: Scalars['ID']['input'];
};


export type QueryOrganizationUsersArgs = {
  organizationId: Scalars['ID']['input'];
};


export type QueryOrganizationsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryPermissionTagsArgs = {
  permissionId: Scalars['ID']['input'];
  scope: Scope;
};


export type QueryPermissionsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<PermissionSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryProjectGroupsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectPermissionsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectRolesArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectTagsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectUsersArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  organizationId: Scalars['ID']['input'];
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ProjectSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryRoleGroupsArgs = {
  roleId: Scalars['ID']['input'];
  scope: Scope;
};


export type QueryRoleTagsArgs = {
  roleId: Scalars['ID']['input'];
  scope: Scope;
};


export type QueryRolesArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<RoleSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryTagsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<TagSortInput>;
};


export type QueryUserRolesArgs = {
  scope: Scope;
  userId: Scalars['ID']['input'];
};


export type QueryUserTagsArgs = {
  scope: Scope;
  userId: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<UserSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type RemoveGroupPermissionInput = {
  groupId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type RemoveGroupTagInput = {
  groupId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveOrganizationGroupInput = {
  groupId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
};

export type RemoveOrganizationPermissionInput = {
  organizationId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type RemoveOrganizationProjectInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveOrganizationRoleInput = {
  organizationId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveOrganizationTagInput = {
  organizationId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveOrganizationUserInput = {
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemovePermissionTagInput = {
  permissionId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveProjectGroupInput = {
  groupId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveProjectPermissionInput = {
  permissionId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveProjectRoleInput = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveProjectTagInput = {
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveProjectUserInput = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemoveRoleGroupInput = {
  groupId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveRoleTagInput = {
  roleId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveUserRoleInput = {
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemoveUserTagInput = {
  tagId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type Role = Auditable & {
  __typename?: 'Role';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  groups?: Maybe<Array<Group>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};


export type RoleGroupsArgs = {
  scope: Scope;
};


export type RoleTagsArgs = {
  scope: Scope;
};

export type RoleGroup = Auditable & {
  __typename?: 'RoleGroup';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type RoleGroupGroupArgs = {
  scope: Scope;
};


export type RoleGroupRoleArgs = {
  scope: Scope;
};

export type RolePage = PaginatedResults & {
  __typename?: 'RolePage';
  hasNextPage: Scalars['Boolean']['output'];
  roles: Array<Role>;
  totalCount: Scalars['Int']['output'];
};

export type RoleSortInput = {
  field: RoleSortableField;
  order: SortOrder;
};

export enum RoleSortableField {
  Name = 'name'
}

export type RoleTag = Auditable & {
  __typename?: 'RoleTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};


export type RoleTagRoleArgs = {
  scope: Scope;
};


export type RoleTagTagArgs = {
  scope: Scope;
};

export type Scope = {
  id: Scalars['ID']['input'];
  tenant: Tenant;
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type Tag = Auditable & {
  __typename?: 'Tag';
  color: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type TagPage = PaginatedResults & {
  __typename?: 'TagPage';
  hasNextPage: Scalars['Boolean']['output'];
  tags: Array<Tag>;
  totalCount: Scalars['Int']['output'];
};

export enum TagSortField {
  Color = 'color',
  CreatedAt = 'createdAt',
  Name = 'name',
  UpdatedAt = 'updatedAt'
}

export type TagSortInput = {
  field: TagSortField;
  order: SortOrder;
};

export enum Tenant {
  Organization = 'ORGANIZATION',
  Project = 'PROJECT'
}

export type UpdateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePermissionInput = {
  action?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTagInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type User = Auditable & {
  __typename?: 'User';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  roles?: Maybe<Array<Role>>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};


export type UserRolesArgs = {
  scope: Scope;
};


export type UserTagsArgs = {
  scope: Scope;
};

export type UserPage = PaginatedResults & {
  __typename?: 'UserPage';
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
  users: Array<User>;
};

export type UserRole = Auditable & {
  __typename?: 'UserRole';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};


export type UserRoleRoleArgs = {
  scope: Scope;
};


export type UserRoleUserArgs = {
  scope: Scope;
};

export type UserSortInput = {
  field: UserSortableField;
  order: SortOrder;
};

export enum UserSortableField {
  Email = 'email',
  Name = 'name'
}

export type UserTag = Auditable & {
  __typename?: 'UserTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};


export type UserTagTagArgs = {
  scope: Scope;
};


export type UserTagUserArgs = {
  scope: Scope;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Auditable: ( Group ) | ( GroupPermission ) | ( GroupTag ) | ( Organization ) | ( OrganizationGroup ) | ( OrganizationPermission ) | ( OrganizationProject ) | ( OrganizationRole ) | ( OrganizationTag ) | ( OrganizationUser ) | ( Permission ) | ( PermissionTag ) | ( Project ) | ( ProjectGroup ) | ( ProjectPermission ) | ( ProjectRole ) | ( ProjectTag ) | ( ProjectUser ) | ( Role ) | ( RoleGroup ) | ( RoleTag ) | ( Tag ) | ( User ) | ( UserRole ) | ( UserTag );
  Creatable: never;
  PaginatedResults: ( GroupPage ) | ( OrganizationPage ) | ( PermissionPage ) | ( ProjectPage ) | ( RolePage ) | ( TagPage ) | ( UserPage );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AddGroupPermissionInput: AddGroupPermissionInput;
  AddGroupTagInput: AddGroupTagInput;
  AddOrganizationGroupInput: AddOrganizationGroupInput;
  AddOrganizationPermissionInput: AddOrganizationPermissionInput;
  AddOrganizationProjectInput: AddOrganizationProjectInput;
  AddOrganizationRoleInput: AddOrganizationRoleInput;
  AddOrganizationTagInput: AddOrganizationTagInput;
  AddOrganizationUserInput: AddOrganizationUserInput;
  AddPermissionTagInput: AddPermissionTagInput;
  AddProjectGroupInput: AddProjectGroupInput;
  AddProjectPermissionInput: AddProjectPermissionInput;
  AddProjectRoleInput: AddProjectRoleInput;
  AddProjectTagInput: AddProjectTagInput;
  AddProjectUserInput: AddProjectUserInput;
  AddRoleGroupInput: AddRoleGroupInput;
  AddRoleTagInput: AddRoleTagInput;
  AddUserRoleInput: AddUserRoleInput;
  AddUserTagInput: AddUserTagInput;
  Auditable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Auditable']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Creatable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Creatable']>;
  CreateGroupInput: CreateGroupInput;
  CreateOrganizationInput: CreateOrganizationInput;
  CreatePermissionInput: CreatePermissionInput;
  CreateProjectInput: CreateProjectInput;
  CreateRoleInput: CreateRoleInput;
  CreateTagInput: CreateTagInput;
  CreateUserInput: CreateUserInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  Group: ResolverTypeWrapper<Group>;
  GroupPage: ResolverTypeWrapper<GroupPage>;
  GroupPermission: ResolverTypeWrapper<GroupPermission>;
  GroupSortInput: GroupSortInput;
  GroupSortableField: GroupSortableField;
  GroupTag: ResolverTypeWrapper<GroupTag>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  LoginInput: LoginInput;
  LoginResponse: ResolverTypeWrapper<LoginResponse>;
  Mutation: ResolverTypeWrapper<{}>;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationGroup: ResolverTypeWrapper<OrganizationGroup>;
  OrganizationPage: ResolverTypeWrapper<OrganizationPage>;
  OrganizationPermission: ResolverTypeWrapper<OrganizationPermission>;
  OrganizationProject: ResolverTypeWrapper<OrganizationProject>;
  OrganizationRole: ResolverTypeWrapper<OrganizationRole>;
  OrganizationSortInput: OrganizationSortInput;
  OrganizationSortableField: OrganizationSortableField;
  OrganizationTag: ResolverTypeWrapper<OrganizationTag>;
  OrganizationUser: ResolverTypeWrapper<OrganizationUser>;
  PaginatedResults: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['PaginatedResults']>;
  Permission: ResolverTypeWrapper<Permission>;
  PermissionPage: ResolverTypeWrapper<PermissionPage>;
  PermissionSortInput: PermissionSortInput;
  PermissionSortableField: PermissionSortableField;
  PermissionTag: ResolverTypeWrapper<PermissionTag>;
  Project: ResolverTypeWrapper<Project>;
  ProjectGroup: ResolverTypeWrapper<ProjectGroup>;
  ProjectPage: ResolverTypeWrapper<ProjectPage>;
  ProjectPermission: ResolverTypeWrapper<ProjectPermission>;
  ProjectRole: ResolverTypeWrapper<ProjectRole>;
  ProjectSortInput: ProjectSortInput;
  ProjectSortableField: ProjectSortableField;
  ProjectTag: ResolverTypeWrapper<ProjectTag>;
  ProjectUser: ResolverTypeWrapper<ProjectUser>;
  Query: ResolverTypeWrapper<{}>;
  RemoveGroupPermissionInput: RemoveGroupPermissionInput;
  RemoveGroupTagInput: RemoveGroupTagInput;
  RemoveOrganizationGroupInput: RemoveOrganizationGroupInput;
  RemoveOrganizationPermissionInput: RemoveOrganizationPermissionInput;
  RemoveOrganizationProjectInput: RemoveOrganizationProjectInput;
  RemoveOrganizationRoleInput: RemoveOrganizationRoleInput;
  RemoveOrganizationTagInput: RemoveOrganizationTagInput;
  RemoveOrganizationUserInput: RemoveOrganizationUserInput;
  RemovePermissionTagInput: RemovePermissionTagInput;
  RemoveProjectGroupInput: RemoveProjectGroupInput;
  RemoveProjectPermissionInput: RemoveProjectPermissionInput;
  RemoveProjectRoleInput: RemoveProjectRoleInput;
  RemoveProjectTagInput: RemoveProjectTagInput;
  RemoveProjectUserInput: RemoveProjectUserInput;
  RemoveRoleGroupInput: RemoveRoleGroupInput;
  RemoveRoleTagInput: RemoveRoleTagInput;
  RemoveUserRoleInput: RemoveUserRoleInput;
  RemoveUserTagInput: RemoveUserTagInput;
  Role: ResolverTypeWrapper<Role>;
  RoleGroup: ResolverTypeWrapper<RoleGroup>;
  RolePage: ResolverTypeWrapper<RolePage>;
  RoleSortInput: RoleSortInput;
  RoleSortableField: RoleSortableField;
  RoleTag: ResolverTypeWrapper<RoleTag>;
  Scope: Scope;
  SortOrder: SortOrder;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Tag: ResolverTypeWrapper<Tag>;
  TagPage: ResolverTypeWrapper<TagPage>;
  TagSortField: TagSortField;
  TagSortInput: TagSortInput;
  Tenant: Tenant;
  UpdateGroupInput: UpdateGroupInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdatePermissionInput: UpdatePermissionInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateRoleInput: UpdateRoleInput;
  UpdateTagInput: UpdateTagInput;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<User>;
  UserPage: ResolverTypeWrapper<UserPage>;
  UserRole: ResolverTypeWrapper<UserRole>;
  UserSortInput: UserSortInput;
  UserSortableField: UserSortableField;
  UserTag: ResolverTypeWrapper<UserTag>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AddGroupPermissionInput: AddGroupPermissionInput;
  AddGroupTagInput: AddGroupTagInput;
  AddOrganizationGroupInput: AddOrganizationGroupInput;
  AddOrganizationPermissionInput: AddOrganizationPermissionInput;
  AddOrganizationProjectInput: AddOrganizationProjectInput;
  AddOrganizationRoleInput: AddOrganizationRoleInput;
  AddOrganizationTagInput: AddOrganizationTagInput;
  AddOrganizationUserInput: AddOrganizationUserInput;
  AddPermissionTagInput: AddPermissionTagInput;
  AddProjectGroupInput: AddProjectGroupInput;
  AddProjectPermissionInput: AddProjectPermissionInput;
  AddProjectRoleInput: AddProjectRoleInput;
  AddProjectTagInput: AddProjectTagInput;
  AddProjectUserInput: AddProjectUserInput;
  AddRoleGroupInput: AddRoleGroupInput;
  AddRoleTagInput: AddRoleTagInput;
  AddUserRoleInput: AddUserRoleInput;
  AddUserTagInput: AddUserTagInput;
  Auditable: ResolversInterfaceTypes<ResolversParentTypes>['Auditable'];
  Boolean: Scalars['Boolean']['output'];
  Creatable: ResolversInterfaceTypes<ResolversParentTypes>['Creatable'];
  CreateGroupInput: CreateGroupInput;
  CreateOrganizationInput: CreateOrganizationInput;
  CreatePermissionInput: CreatePermissionInput;
  CreateProjectInput: CreateProjectInput;
  CreateRoleInput: CreateRoleInput;
  CreateTagInput: CreateTagInput;
  CreateUserInput: CreateUserInput;
  Date: Scalars['Date']['output'];
  Group: Group;
  GroupPage: GroupPage;
  GroupPermission: GroupPermission;
  GroupSortInput: GroupSortInput;
  GroupTag: GroupTag;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  LoginInput: LoginInput;
  LoginResponse: LoginResponse;
  Mutation: {};
  Organization: Organization;
  OrganizationGroup: OrganizationGroup;
  OrganizationPage: OrganizationPage;
  OrganizationPermission: OrganizationPermission;
  OrganizationProject: OrganizationProject;
  OrganizationRole: OrganizationRole;
  OrganizationSortInput: OrganizationSortInput;
  OrganizationTag: OrganizationTag;
  OrganizationUser: OrganizationUser;
  PaginatedResults: ResolversInterfaceTypes<ResolversParentTypes>['PaginatedResults'];
  Permission: Permission;
  PermissionPage: PermissionPage;
  PermissionSortInput: PermissionSortInput;
  PermissionTag: PermissionTag;
  Project: Project;
  ProjectGroup: ProjectGroup;
  ProjectPage: ProjectPage;
  ProjectPermission: ProjectPermission;
  ProjectRole: ProjectRole;
  ProjectSortInput: ProjectSortInput;
  ProjectTag: ProjectTag;
  ProjectUser: ProjectUser;
  Query: {};
  RemoveGroupPermissionInput: RemoveGroupPermissionInput;
  RemoveGroupTagInput: RemoveGroupTagInput;
  RemoveOrganizationGroupInput: RemoveOrganizationGroupInput;
  RemoveOrganizationPermissionInput: RemoveOrganizationPermissionInput;
  RemoveOrganizationProjectInput: RemoveOrganizationProjectInput;
  RemoveOrganizationRoleInput: RemoveOrganizationRoleInput;
  RemoveOrganizationTagInput: RemoveOrganizationTagInput;
  RemoveOrganizationUserInput: RemoveOrganizationUserInput;
  RemovePermissionTagInput: RemovePermissionTagInput;
  RemoveProjectGroupInput: RemoveProjectGroupInput;
  RemoveProjectPermissionInput: RemoveProjectPermissionInput;
  RemoveProjectRoleInput: RemoveProjectRoleInput;
  RemoveProjectTagInput: RemoveProjectTagInput;
  RemoveProjectUserInput: RemoveProjectUserInput;
  RemoveRoleGroupInput: RemoveRoleGroupInput;
  RemoveRoleTagInput: RemoveRoleTagInput;
  RemoveUserRoleInput: RemoveUserRoleInput;
  RemoveUserTagInput: RemoveUserTagInput;
  Role: Role;
  RoleGroup: RoleGroup;
  RolePage: RolePage;
  RoleSortInput: RoleSortInput;
  RoleTag: RoleTag;
  Scope: Scope;
  String: Scalars['String']['output'];
  Tag: Tag;
  TagPage: TagPage;
  TagSortInput: TagSortInput;
  UpdateGroupInput: UpdateGroupInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdatePermissionInput: UpdatePermissionInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateRoleInput: UpdateRoleInput;
  UpdateTagInput: UpdateTagInput;
  UpdateUserInput: UpdateUserInput;
  User: User;
  UserPage: UserPage;
  UserRole: UserRole;
  UserSortInput: UserSortInput;
  UserTag: UserTag;
}>;

export type AuditableResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Auditable'] = ResolversParentTypes['Auditable']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Group' | 'GroupPermission' | 'GroupTag' | 'Organization' | 'OrganizationGroup' | 'OrganizationPermission' | 'OrganizationProject' | 'OrganizationRole' | 'OrganizationTag' | 'OrganizationUser' | 'Permission' | 'PermissionTag' | 'Project' | 'ProjectGroup' | 'ProjectPermission' | 'ProjectRole' | 'ProjectTag' | 'ProjectUser' | 'Role' | 'RoleGroup' | 'RoleTag' | 'Tag' | 'User' | 'UserRole' | 'UserTag', ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
}>;

export type CreatableResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Creatable'] = ResolversParentTypes['Creatable']> = ResolversObject<{
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type GroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Group'] = ResolversParentTypes['Group']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType, RequireFields<GroupPermissionsArgs, 'scope'>>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<GroupTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GroupPage'] = ResolversParentTypes['GroupPage']> = ResolversObject<{
  groups?: Resolver<Array<ResolversTypes['Group']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupPermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GroupPermission'] = ResolversParentTypes['GroupPermission']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType, RequireFields<GroupPermissionGroupArgs, 'scope'>>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType, RequireFields<GroupPermissionPermissionArgs, 'scope'>>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GroupTag'] = ResolversParentTypes['GroupTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType, RequireFields<GroupTagGroupArgs, 'scope'>>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType, RequireFields<GroupTagTagArgs, 'scope'>>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoginResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LoginResponse'] = ResolversParentTypes['LoginResponse']> = ResolversObject<{
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  addGroupPermission?: Resolver<ResolversTypes['GroupPermission'], ParentType, ContextType, RequireFields<MutationAddGroupPermissionArgs, 'input'>>;
  addGroupTag?: Resolver<ResolversTypes['GroupTag'], ParentType, ContextType, RequireFields<MutationAddGroupTagArgs, 'input'>>;
  addOrganizationGroup?: Resolver<ResolversTypes['OrganizationGroup'], ParentType, ContextType, RequireFields<MutationAddOrganizationGroupArgs, 'input'>>;
  addOrganizationPermission?: Resolver<ResolversTypes['OrganizationPermission'], ParentType, ContextType, RequireFields<MutationAddOrganizationPermissionArgs, 'input'>>;
  addOrganizationProject?: Resolver<ResolversTypes['OrganizationProject'], ParentType, ContextType, RequireFields<MutationAddOrganizationProjectArgs, 'input'>>;
  addOrganizationRole?: Resolver<ResolversTypes['OrganizationRole'], ParentType, ContextType, RequireFields<MutationAddOrganizationRoleArgs, 'input'>>;
  addOrganizationTag?: Resolver<ResolversTypes['OrganizationTag'], ParentType, ContextType, RequireFields<MutationAddOrganizationTagArgs, 'input'>>;
  addOrganizationUser?: Resolver<ResolversTypes['OrganizationUser'], ParentType, ContextType, RequireFields<MutationAddOrganizationUserArgs, 'input'>>;
  addPermissionTag?: Resolver<ResolversTypes['PermissionTag'], ParentType, ContextType, RequireFields<MutationAddPermissionTagArgs, 'input'>>;
  addProjectGroup?: Resolver<ResolversTypes['ProjectGroup'], ParentType, ContextType, RequireFields<MutationAddProjectGroupArgs, 'input'>>;
  addProjectPermission?: Resolver<ResolversTypes['ProjectPermission'], ParentType, ContextType, RequireFields<MutationAddProjectPermissionArgs, 'input'>>;
  addProjectRole?: Resolver<ResolversTypes['ProjectRole'], ParentType, ContextType, RequireFields<MutationAddProjectRoleArgs, 'input'>>;
  addProjectTag?: Resolver<ResolversTypes['ProjectTag'], ParentType, ContextType, RequireFields<MutationAddProjectTagArgs, 'input'>>;
  addProjectUser?: Resolver<ResolversTypes['ProjectUser'], ParentType, ContextType, RequireFields<MutationAddProjectUserArgs, 'input'>>;
  addRoleGroup?: Resolver<ResolversTypes['RoleGroup'], ParentType, ContextType, RequireFields<MutationAddRoleGroupArgs, 'input'>>;
  addRoleTag?: Resolver<ResolversTypes['RoleTag'], ParentType, ContextType, RequireFields<MutationAddRoleTagArgs, 'input'>>;
  addUserRole?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType, RequireFields<MutationAddUserRoleArgs, 'input'>>;
  addUserTag?: Resolver<ResolversTypes['UserTag'], ParentType, ContextType, RequireFields<MutationAddUserTagArgs, 'input'>>;
  createGroup?: Resolver<ResolversTypes['Group'], ParentType, ContextType, RequireFields<MutationCreateGroupArgs, 'input'>>;
  createOrganization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType, RequireFields<MutationCreateOrganizationArgs, 'input'>>;
  createPermission?: Resolver<ResolversTypes['Permission'], ParentType, ContextType, RequireFields<MutationCreatePermissionArgs, 'input'>>;
  createProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationCreateProjectArgs, 'input'>>;
  createRole?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationCreateRoleArgs, 'input'>>;
  createTag?: Resolver<ResolversTypes['Tag'], ParentType, ContextType, RequireFields<MutationCreateTagArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationCreateUserArgs, 'input'>>;
  deleteGroup?: Resolver<ResolversTypes['Group'], ParentType, ContextType, RequireFields<MutationDeleteGroupArgs, 'id'>>;
  deleteOrganization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType, RequireFields<MutationDeleteOrganizationArgs, 'id'>>;
  deletePermission?: Resolver<ResolversTypes['Permission'], ParentType, ContextType, RequireFields<MutationDeletePermissionArgs, 'id'>>;
  deleteProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationDeleteProjectArgs, 'id' | 'organizationId'>>;
  deleteRole?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationDeleteRoleArgs, 'id'>>;
  deleteTag?: Resolver<ResolversTypes['Tag'], ParentType, ContextType, RequireFields<MutationDeleteTagArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'id'>>;
  login?: Resolver<ResolversTypes['LoginResponse'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'input'>>;
  removeGroupPermission?: Resolver<ResolversTypes['GroupPermission'], ParentType, ContextType, RequireFields<MutationRemoveGroupPermissionArgs, 'input'>>;
  removeGroupTag?: Resolver<ResolversTypes['GroupTag'], ParentType, ContextType, RequireFields<MutationRemoveGroupTagArgs, 'input'>>;
  removeOrganizationGroup?: Resolver<ResolversTypes['OrganizationGroup'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationGroupArgs, 'input'>>;
  removeOrganizationPermission?: Resolver<ResolversTypes['OrganizationPermission'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationPermissionArgs, 'input'>>;
  removeOrganizationProject?: Resolver<ResolversTypes['OrganizationProject'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationProjectArgs, 'input'>>;
  removeOrganizationRole?: Resolver<ResolversTypes['OrganizationRole'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationRoleArgs, 'input'>>;
  removeOrganizationTag?: Resolver<ResolversTypes['OrganizationTag'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationTagArgs, 'input'>>;
  removeOrganizationUser?: Resolver<ResolversTypes['OrganizationUser'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationUserArgs, 'input'>>;
  removePermissionTag?: Resolver<ResolversTypes['PermissionTag'], ParentType, ContextType, RequireFields<MutationRemovePermissionTagArgs, 'input'>>;
  removeProjectGroup?: Resolver<ResolversTypes['ProjectGroup'], ParentType, ContextType, RequireFields<MutationRemoveProjectGroupArgs, 'input'>>;
  removeProjectPermission?: Resolver<ResolversTypes['ProjectPermission'], ParentType, ContextType, RequireFields<MutationRemoveProjectPermissionArgs, 'input'>>;
  removeProjectRole?: Resolver<ResolversTypes['ProjectRole'], ParentType, ContextType, RequireFields<MutationRemoveProjectRoleArgs, 'input'>>;
  removeProjectTag?: Resolver<ResolversTypes['ProjectTag'], ParentType, ContextType, RequireFields<MutationRemoveProjectTagArgs, 'input'>>;
  removeProjectUser?: Resolver<ResolversTypes['ProjectUser'], ParentType, ContextType, RequireFields<MutationRemoveProjectUserArgs, 'input'>>;
  removeRoleGroup?: Resolver<ResolversTypes['RoleGroup'], ParentType, ContextType, RequireFields<MutationRemoveRoleGroupArgs, 'input'>>;
  removeRoleTag?: Resolver<ResolversTypes['RoleTag'], ParentType, ContextType, RequireFields<MutationRemoveRoleTagArgs, 'input'>>;
  removeUserRole?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType, RequireFields<MutationRemoveUserRoleArgs, 'input'>>;
  removeUserTag?: Resolver<ResolversTypes['UserTag'], ParentType, ContextType, RequireFields<MutationRemoveUserTagArgs, 'input'>>;
  updateGroup?: Resolver<ResolversTypes['Group'], ParentType, ContextType, RequireFields<MutationUpdateGroupArgs, 'id' | 'input'>>;
  updateOrganization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType, RequireFields<MutationUpdateOrganizationArgs, 'id' | 'input'>>;
  updatePermission?: Resolver<ResolversTypes['Permission'], ParentType, ContextType, RequireFields<MutationUpdatePermissionArgs, 'id' | 'input'>>;
  updateProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationUpdateProjectArgs, 'id' | 'input'>>;
  updateRole?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationUpdateRoleArgs, 'id' | 'input'>>;
  updateTag?: Resolver<ResolversTypes['Tag'], ParentType, ContextType, RequireFields<MutationUpdateTagArgs, 'id' | 'input'>>;
  updateUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateUserArgs, 'id' | 'input'>>;
}>;

export type OrganizationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  projects?: Resolver<Maybe<Array<ResolversTypes['Project']>>, ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  users?: Resolver<Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationGroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationGroup'] = ResolversParentTypes['OrganizationGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationPage'] = ResolversParentTypes['OrganizationPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationPermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationPermission'] = ResolversParentTypes['OrganizationPermission']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationProjectResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationProject'] = ResolversParentTypes['OrganizationProject']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationRoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationRole'] = ResolversParentTypes['OrganizationRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationTag'] = ResolversParentTypes['OrganizationTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationUserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationUser'] = ResolversParentTypes['OrganizationUser']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PaginatedResultsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PaginatedResults'] = ResolversParentTypes['PaginatedResults']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GroupPage' | 'OrganizationPage' | 'PermissionPage' | 'ProjectPage' | 'RolePage' | 'TagPage' | 'UserPage', ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type PermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Permission'] = ResolversParentTypes['Permission']> = ResolversObject<{
  action?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<PermissionTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermissionPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PermissionPage'] = ResolversParentTypes['PermissionPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['Permission']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermissionTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PermissionTag'] = ResolversParentTypes['PermissionTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType, RequireFields<PermissionTagPermissionArgs, 'scope'>>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType, RequireFields<PermissionTagTagArgs, 'scope'>>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  users?: Resolver<Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectGroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectGroup'] = ResolversParentTypes['ProjectGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectGroupProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectPage'] = ResolversParentTypes['ProjectPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectPermission'] = ResolversParentTypes['ProjectPermission']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectPermissionProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectRoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectRole'] = ResolversParentTypes['ProjectRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectRoleProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectTag'] = ResolversParentTypes['ProjectTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectTagProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectUser'] = ResolversParentTypes['ProjectUser']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectUserProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groupPermissions?: Resolver<Array<ResolversTypes['GroupPermission']>, ParentType, ContextType, RequireFields<QueryGroupPermissionsArgs, 'groupId' | 'scope'>>;
  groupTags?: Resolver<Array<ResolversTypes['GroupTag']>, ParentType, ContextType, RequireFields<QueryGroupTagsArgs, 'groupId' | 'scope'>>;
  groups?: Resolver<ResolversTypes['GroupPage'], ParentType, ContextType, RequireFields<QueryGroupsArgs, 'scope'>>;
  organizationGroups?: Resolver<Array<ResolversTypes['OrganizationGroup']>, ParentType, ContextType, RequireFields<QueryOrganizationGroupsArgs, 'organizationId'>>;
  organizationPermissions?: Resolver<Array<ResolversTypes['OrganizationPermission']>, ParentType, ContextType, RequireFields<QueryOrganizationPermissionsArgs, 'organizationId'>>;
  organizationProjects?: Resolver<Array<ResolversTypes['OrganizationProject']>, ParentType, ContextType, RequireFields<QueryOrganizationProjectsArgs, 'organizationId'>>;
  organizationRoles?: Resolver<Array<ResolversTypes['OrganizationRole']>, ParentType, ContextType, RequireFields<QueryOrganizationRolesArgs, 'organizationId'>>;
  organizationTags?: Resolver<Array<ResolversTypes['OrganizationTag']>, ParentType, ContextType, RequireFields<QueryOrganizationTagsArgs, 'organizationId'>>;
  organizationUsers?: Resolver<Array<ResolversTypes['OrganizationUser']>, ParentType, ContextType, RequireFields<QueryOrganizationUsersArgs, 'organizationId'>>;
  organizations?: Resolver<ResolversTypes['OrganizationPage'], ParentType, ContextType, Partial<QueryOrganizationsArgs>>;
  permissionTags?: Resolver<Array<ResolversTypes['PermissionTag']>, ParentType, ContextType, RequireFields<QueryPermissionTagsArgs, 'permissionId' | 'scope'>>;
  permissions?: Resolver<ResolversTypes['PermissionPage'], ParentType, ContextType, RequireFields<QueryPermissionsArgs, 'scope'>>;
  projectGroups?: Resolver<Array<ResolversTypes['ProjectGroup']>, ParentType, ContextType, RequireFields<QueryProjectGroupsArgs, 'projectId'>>;
  projectPermissions?: Resolver<Array<ResolversTypes['ProjectPermission']>, ParentType, ContextType, RequireFields<QueryProjectPermissionsArgs, 'projectId'>>;
  projectRoles?: Resolver<Array<ResolversTypes['ProjectRole']>, ParentType, ContextType, RequireFields<QueryProjectRolesArgs, 'projectId'>>;
  projectTags?: Resolver<Array<ResolversTypes['ProjectTag']>, ParentType, ContextType, RequireFields<QueryProjectTagsArgs, 'projectId'>>;
  projectUsers?: Resolver<Array<ResolversTypes['ProjectUser']>, ParentType, ContextType, RequireFields<QueryProjectUsersArgs, 'projectId'>>;
  projects?: Resolver<ResolversTypes['ProjectPage'], ParentType, ContextType, RequireFields<QueryProjectsArgs, 'organizationId'>>;
  roleGroups?: Resolver<Array<ResolversTypes['RoleGroup']>, ParentType, ContextType, RequireFields<QueryRoleGroupsArgs, 'roleId' | 'scope'>>;
  roleTags?: Resolver<Array<ResolversTypes['RoleTag']>, ParentType, ContextType, RequireFields<QueryRoleTagsArgs, 'roleId' | 'scope'>>;
  roles?: Resolver<ResolversTypes['RolePage'], ParentType, ContextType, RequireFields<QueryRolesArgs, 'scope'>>;
  tags?: Resolver<ResolversTypes['TagPage'], ParentType, ContextType, RequireFields<QueryTagsArgs, 'scope'>>;
  userRoles?: Resolver<Array<ResolversTypes['UserRole']>, ParentType, ContextType, RequireFields<QueryUserRolesArgs, 'scope' | 'userId'>>;
  userTags?: Resolver<Array<ResolversTypes['UserTag']>, ParentType, ContextType, RequireFields<QueryUserTagsArgs, 'scope' | 'userId'>>;
  users?: Resolver<ResolversTypes['UserPage'], ParentType, ContextType, RequireFields<QueryUsersArgs, 'scope'>>;
}>;

export type RoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType, RequireFields<RoleGroupsArgs, 'scope'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<RoleTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleGroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RoleGroup'] = ResolversParentTypes['RoleGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType, RequireFields<RoleGroupGroupArgs, 'scope'>>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, RequireFields<RoleGroupRoleArgs, 'scope'>>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RolePage'] = ResolversParentTypes['RolePage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RoleTag'] = ResolversParentTypes['RoleTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, RequireFields<RoleTagRoleArgs, 'scope'>>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType, RequireFields<RoleTagTagArgs, 'scope'>>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag']> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TagPage'] = ResolversParentTypes['TagPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType, RequireFields<UserRolesArgs, 'scope'>>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<UserTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserPage'] = ResolversParentTypes['UserPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserRoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserRole'] = ResolversParentTypes['UserRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, RequireFields<UserRoleRoleArgs, 'scope'>>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<UserRoleUserArgs, 'scope'>>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserTag'] = ResolversParentTypes['UserTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType, RequireFields<UserTagTagArgs, 'scope'>>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<UserTagUserArgs, 'scope'>>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  Auditable?: AuditableResolvers<ContextType>;
  Creatable?: CreatableResolvers<ContextType>;
  Date?: GraphQLScalarType;
  Group?: GroupResolvers<ContextType>;
  GroupPage?: GroupPageResolvers<ContextType>;
  GroupPermission?: GroupPermissionResolvers<ContextType>;
  GroupTag?: GroupTagResolvers<ContextType>;
  LoginResponse?: LoginResponseResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationGroup?: OrganizationGroupResolvers<ContextType>;
  OrganizationPage?: OrganizationPageResolvers<ContextType>;
  OrganizationPermission?: OrganizationPermissionResolvers<ContextType>;
  OrganizationProject?: OrganizationProjectResolvers<ContextType>;
  OrganizationRole?: OrganizationRoleResolvers<ContextType>;
  OrganizationTag?: OrganizationTagResolvers<ContextType>;
  OrganizationUser?: OrganizationUserResolvers<ContextType>;
  PaginatedResults?: PaginatedResultsResolvers<ContextType>;
  Permission?: PermissionResolvers<ContextType>;
  PermissionPage?: PermissionPageResolvers<ContextType>;
  PermissionTag?: PermissionTagResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectGroup?: ProjectGroupResolvers<ContextType>;
  ProjectPage?: ProjectPageResolvers<ContextType>;
  ProjectPermission?: ProjectPermissionResolvers<ContextType>;
  ProjectRole?: ProjectRoleResolvers<ContextType>;
  ProjectTag?: ProjectTagResolvers<ContextType>;
  ProjectUser?: ProjectUserResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleGroup?: RoleGroupResolvers<ContextType>;
  RolePage?: RolePageResolvers<ContextType>;
  RoleTag?: RoleTagResolvers<ContextType>;
  Tag?: TagResolvers<ContextType>;
  TagPage?: TagPageResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserPage?: UserPageResolvers<ContextType>;
  UserRole?: UserRoleResolvers<ContextType>;
  UserTag?: UserTagResolvers<ContextType>;
}>;

