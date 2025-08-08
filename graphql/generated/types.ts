import { GraphQLResolveInfo } from 'graphql';
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
};

/** Input type for adding a group-permission relationship. */
export type AddGroupPermissionInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
};

/** Input type for adding a group-tag relationship. */
export type AddGroupTagInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for adding an organization-group relationship. */
export type AddOrganizationGroupInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
};

/** Input type for adding an organization-permission relationship. */
export type AddOrganizationPermissionInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
};

/** Input type for adding an organization-project relationship. */
export type AddOrganizationProjectInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
};

/** Input type for adding an organization-role relationship. */
export type AddOrganizationRoleInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
};

/** Input type for adding an organization-tag relationship. */
export type AddOrganizationTagInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for adding an organization-user relationship. */
export type AddOrganizationUserInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

export type AddPermissionTagInput = {
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for adding a project-group relationship. */
export type AddProjectGroupInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
};

/** Input type for adding a project-permission relationship. */
export type AddProjectPermissionInput = {
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
};

/** Input type for adding a project-role relationship. */
export type AddProjectRoleInput = {
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
};

/** Input type for adding a project-tag relationship. */
export type AddProjectTagInput = {
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for adding a project-user relationship. */
export type AddProjectUserInput = {
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

/** Input type for adding a role-group relationship. */
export type AddRoleGroupInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
};

/** Input type for adding a role-tag relationship. */
export type AddRoleTagInput = {
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for adding a user-role relationship. */
export type AddUserRoleInput = {
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

/** Input type for adding a user-tag relationship. */
export type AddUserTagInput = {
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

/** Base interface for entities with audit fields. */
export type Auditable = {
  /** Timestamp when the entity was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the entity. */
  id: Scalars['ID']['output'];
  /** Timestamp when the entity was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Base interface for entities that can be created and updated. */
export type Creatable = {
  /** Timestamp when the entity was created. */
  createdAt: Scalars['String']['output'];
  /** Timestamp when the entity was last updated. */
  updatedAt: Scalars['String']['output'];
};

export type CreateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** Input for creating a new organization. */
export type CreateOrganizationInput = {
  /** Name of the organization. */
  name: Scalars['String']['input'];
};

export type CreatePermissionInput = {
  action: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** Input for creating a new project. */
export type CreateProjectInput = {
  /** Description of the project. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Name of the project. */
  name: Scalars['String']['input'];
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  name: Scalars['String']['input'];
};

/** Input for creating a new tag. */
export type CreateTagInput = {
  /** Color identifier for the tag (e.g., 'purple', 'indigo', 'blue'). */
  color: Scalars['String']['input'];
  /** Name of the tag. */
  name: Scalars['String']['input'];
};

/** Input type for creating a new user. */
export type CreateUserInput = {
  /** Email address of the user. */
  email: Scalars['String']['input'];
  /** Full name of the user. */
  name: Scalars['String']['input'];
};

/** Represents a group in the system. */
export type Group = Auditable & {
  __typename?: 'Group';
  /** Timestamp when the group was created. */
  createdAt: Scalars['String']['output'];
  /** Description of the group. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the group. */
  id: Scalars['ID']['output'];
  /** Name of the group. */
  name: Scalars['String']['output'];
  /** List of permissions associated with this group. */
  permissions?: Maybe<Array<Permission>>;
  /** List of tags assigned to the group. */
  tags?: Maybe<Array<Tag>>;
  /** Timestamp when the group was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a group in the system. */
export type GroupPermissionsArgs = {
  scope: Scope;
};


/** Represents a group in the system. */
export type GroupTagsArgs = {
  scope: Scope;
};

/** Represents a paginated list of groups. */
export type GroupPage = PaginatedResults & {
  __typename?: 'GroupPage';
  /** List of groups for the current page. */
  groups: Array<Group>;
  /** Whether there are more groups available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Total number of groups across all pages. */
  totalCount: Scalars['Int']['output'];
};

/** Represents a group-permission relationship in the system. */
export type GroupPermission = Auditable & {
  __typename?: 'GroupPermission';
  /** Timestamp when the group-permission relationship was created. */
  createdAt: Scalars['String']['output'];
  /** The group associated with this relationship. */
  group?: Maybe<Group>;
  /** ID of the group. */
  groupId: Scalars['ID']['output'];
  /** Unique identifier for the group-permission relationship. */
  id: Scalars['ID']['output'];
  /** The permission associated with this relationship. */
  permission?: Maybe<Permission>;
  /** ID of the permission. */
  permissionId: Scalars['ID']['output'];
  /** Timestamp when the group-permission relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a group-permission relationship in the system. */
export type GroupPermissionGroupArgs = {
  scope: Scope;
};


/** Represents a group-permission relationship in the system. */
export type GroupPermissionPermissionArgs = {
  scope: Scope;
};

/** Input for sorting groups. */
export type GroupSortInput = {
  field: GroupSortableField;
  order: GroupSortOrder;
};

/** Sort order for groups. */
export enum GroupSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields by which groups can be sorted. */
export enum GroupSortableField {
  Name = 'name'
}

/** Represents a group-tag relationship in the system. */
export type GroupTag = Auditable & {
  __typename?: 'GroupTag';
  /** Timestamp when the group-tag relationship was created. */
  createdAt: Scalars['String']['output'];
  /** The group associated with this relationship. */
  group?: Maybe<Group>;
  /** ID of the group. */
  groupId: Scalars['ID']['output'];
  /** Unique identifier for the group-tag relationship. */
  id: Scalars['ID']['output'];
  /** The tag associated with this relationship. */
  tag?: Maybe<Tag>;
  /** ID of the tag. */
  tagId: Scalars['ID']['output'];
  /** Timestamp when the group-tag relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Input type for user authentication. */
export type LoginInput = {
  /** Email address of the user. */
  email: Scalars['String']['input'];
  /** Password of the user. */
  password: Scalars['String']['input'];
};

/** Response type for successful authentication. */
export type LoginResponse = {
  __typename?: 'LoginResponse';
  /** JWT token for authenticated requests. */
  token: Scalars['String']['output'];
};

/** Update an existing tag. */
export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  /** Adds a group-permission relationship. */
  addGroupPermission: GroupPermission;
  /** Adds a group-tag relationship. */
  addGroupTag: GroupTag;
  /** Adds an organization-group relationship. */
  addOrganizationGroup: OrganizationGroup;
  /** Adds an organization-permission relationship. */
  addOrganizationPermission: OrganizationPermission;
  /** Adds an organization-project relationship. */
  addOrganizationProject: OrganizationProject;
  /** Adds an organization-role relationship. */
  addOrganizationRole: OrganizationRole;
  /** Adds an organization-tag relationship. */
  addOrganizationTag: OrganizationTag;
  /** Adds an organization-user relationship. */
  addOrganizationUser: OrganizationUser;
  /** Adds a permission-tag relationship. */
  addPermissionTag: PermissionTag;
  /** Adds a project-group relationship. */
  addProjectGroup: ProjectGroup;
  /** Adds a project-permission relationship. */
  addProjectPermission: ProjectPermission;
  /** Adds a project-role relationship. */
  addProjectRole: ProjectRole;
  /** Adds a project-tag relationship. */
  addProjectTag: ProjectTag;
  /** Adds a project-user relationship. */
  addProjectUser: ProjectUser;
  /** Adds a role-group relationship. */
  addRoleGroup: RoleGroup;
  /** Adds a role-tag relationship. */
  addRoleTag: RoleTag;
  /** Adds a user-role relationship. */
  addUserRole: UserRole;
  /** Adds a user-tag relationship. */
  addUserTag: UserTag;
  /** Creates a new group. */
  createGroup: Group;
  /** Create a new organization. */
  createOrganization: Organization;
  /** Creates a new permission. */
  createPermission: Permission;
  /** Create a new project. */
  createProject: Project;
  /** Creates a new role. */
  createRole: Role;
  /** Create a new tag. */
  createTag: Tag;
  /** Creates a new user. */
  createUser: User;
  /** Deletes a group by ID. */
  deleteGroup: Scalars['Boolean']['output'];
  /** Delete an organization. */
  deleteOrganization: Scalars['Boolean']['output'];
  /** Deletes a permission by ID. */
  deletePermission: Scalars['Boolean']['output'];
  /** Delete a project. */
  deleteProject: Scalars['Boolean']['output'];
  /** Deletes a role by ID. */
  deleteRole: Scalars['Boolean']['output'];
  /** Delete a tag. */
  deleteTag: Scalars['Boolean']['output'];
  /** Deletes a user. */
  deleteUser: User;
  /** Authenticates a user and returns a JWT token. */
  login: LoginResponse;
  /** Removes a group-permission relationship. */
  removeGroupPermission: Scalars['Boolean']['output'];
  /** Removes a group-tag relationship. */
  removeGroupTag: Scalars['Boolean']['output'];
  /** Removes an organization-group relationship. */
  removeOrganizationGroup: Scalars['Boolean']['output'];
  /** Removes an organization-permission relationship. */
  removeOrganizationPermission: Scalars['Boolean']['output'];
  /** Removes an organization-project relationship. */
  removeOrganizationProject: OrganizationProject;
  /** Removes an organization-role relationship. */
  removeOrganizationRole: Scalars['Boolean']['output'];
  /** Removes an organization-tag relationship. */
  removeOrganizationTag: Scalars['Boolean']['output'];
  /** Removes an organization-user relationship. */
  removeOrganizationUser: Scalars['Boolean']['output'];
  /** Removes a permission-tag relationship. */
  removePermissionTag: Scalars['Boolean']['output'];
  /** Removes a project-group relationship. */
  removeProjectGroup: Scalars['Boolean']['output'];
  /** Removes a project-permission relationship. */
  removeProjectPermission: Scalars['Boolean']['output'];
  /** Removes a project-role relationship. */
  removeProjectRole: Scalars['Boolean']['output'];
  /** Removes a project-tag relationship. */
  removeProjectTag: Scalars['Boolean']['output'];
  /** Removes a project-user relationship. */
  removeProjectUser: Scalars['Boolean']['output'];
  /** Removes a role-group relationship. */
  removeRoleGroup: RoleGroup;
  /** Removes a role-tag relationship. */
  removeRoleTag: Scalars['Boolean']['output'];
  /** Removes a user-role relationship. */
  removeUserRole: UserRole;
  /** Removes a user-tag relationship. */
  removeUserTag: Scalars['Boolean']['output'];
  /** Updates an existing group. */
  updateGroup: Group;
  /** Update an existing organization. */
  updateOrganization: Organization;
  /** Updates an existing permission. */
  updatePermission: Permission;
  /** Update an existing project. */
  updateProject: Project;
  /** Updates an existing role. */
  updateRole: Role;
  /** Update an existing tag. */
  updateTag: Tag;
  /** Updates an existing user. */
  updateUser: User;
};


/** Update an existing tag. */
export type MutationAddGroupPermissionArgs = {
  input: AddGroupPermissionInput;
};


/** Update an existing tag. */
export type MutationAddGroupTagArgs = {
  input: AddGroupTagInput;
};


/** Update an existing tag. */
export type MutationAddOrganizationGroupArgs = {
  input: AddOrganizationGroupInput;
};


/** Update an existing tag. */
export type MutationAddOrganizationPermissionArgs = {
  input: AddOrganizationPermissionInput;
};


/** Update an existing tag. */
export type MutationAddOrganizationProjectArgs = {
  input: AddOrganizationProjectInput;
};


/** Update an existing tag. */
export type MutationAddOrganizationRoleArgs = {
  input: AddOrganizationRoleInput;
};


/** Update an existing tag. */
export type MutationAddOrganizationTagArgs = {
  input: AddOrganizationTagInput;
};


/** Update an existing tag. */
export type MutationAddOrganizationUserArgs = {
  input: AddOrganizationUserInput;
};


/** Update an existing tag. */
export type MutationAddPermissionTagArgs = {
  input: AddPermissionTagInput;
};


/** Update an existing tag. */
export type MutationAddProjectGroupArgs = {
  input: AddProjectGroupInput;
};


/** Update an existing tag. */
export type MutationAddProjectPermissionArgs = {
  input: AddProjectPermissionInput;
};


/** Update an existing tag. */
export type MutationAddProjectRoleArgs = {
  input: AddProjectRoleInput;
};


/** Update an existing tag. */
export type MutationAddProjectTagArgs = {
  input: AddProjectTagInput;
};


/** Update an existing tag. */
export type MutationAddProjectUserArgs = {
  input: AddProjectUserInput;
};


/** Update an existing tag. */
export type MutationAddRoleGroupArgs = {
  input: AddRoleGroupInput;
};


/** Update an existing tag. */
export type MutationAddRoleTagArgs = {
  input: AddRoleTagInput;
};


/** Update an existing tag. */
export type MutationAddUserRoleArgs = {
  input: AddUserRoleInput;
};


/** Update an existing tag. */
export type MutationAddUserTagArgs = {
  input: AddUserTagInput;
};


/** Update an existing tag. */
export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};


/** Update an existing tag. */
export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


/** Update an existing tag. */
export type MutationCreatePermissionArgs = {
  input: CreatePermissionInput;
};


/** Update an existing tag. */
export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


/** Update an existing tag. */
export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};


/** Update an existing tag. */
export type MutationCreateTagArgs = {
  input: CreateTagInput;
};


/** Update an existing tag. */
export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


/** Update an existing tag. */
export type MutationDeleteGroupArgs = {
  id: Scalars['ID']['input'];
};


/** Update an existing tag. */
export type MutationDeleteOrganizationArgs = {
  id: Scalars['ID']['input'];
};


/** Update an existing tag. */
export type MutationDeletePermissionArgs = {
  id: Scalars['ID']['input'];
};


/** Update an existing tag. */
export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


/** Update an existing tag. */
export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


/** Update an existing tag. */
export type MutationDeleteTagArgs = {
  id: Scalars['ID']['input'];
};


/** Update an existing tag. */
export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


/** Update an existing tag. */
export type MutationLoginArgs = {
  input: LoginInput;
};


/** Update an existing tag. */
export type MutationRemoveGroupPermissionArgs = {
  input: RemoveGroupPermissionInput;
};


/** Update an existing tag. */
export type MutationRemoveGroupTagArgs = {
  input: RemoveGroupTagInput;
};


/** Update an existing tag. */
export type MutationRemoveOrganizationGroupArgs = {
  input: RemoveOrganizationGroupInput;
};


/** Update an existing tag. */
export type MutationRemoveOrganizationPermissionArgs = {
  input: RemoveOrganizationPermissionInput;
};


/** Update an existing tag. */
export type MutationRemoveOrganizationProjectArgs = {
  input: RemoveOrganizationProjectInput;
};


/** Update an existing tag. */
export type MutationRemoveOrganizationRoleArgs = {
  input: RemoveOrganizationRoleInput;
};


/** Update an existing tag. */
export type MutationRemoveOrganizationTagArgs = {
  input: RemoveOrganizationTagInput;
};


/** Update an existing tag. */
export type MutationRemoveOrganizationUserArgs = {
  input: RemoveOrganizationUserInput;
};


/** Update an existing tag. */
export type MutationRemovePermissionTagArgs = {
  input: RemovePermissionTagInput;
};


/** Update an existing tag. */
export type MutationRemoveProjectGroupArgs = {
  input: RemoveProjectGroupInput;
};


/** Update an existing tag. */
export type MutationRemoveProjectPermissionArgs = {
  input: RemoveProjectPermissionInput;
};


/** Update an existing tag. */
export type MutationRemoveProjectRoleArgs = {
  input: RemoveProjectRoleInput;
};


/** Update an existing tag. */
export type MutationRemoveProjectTagArgs = {
  input: RemoveProjectTagInput;
};


/** Update an existing tag. */
export type MutationRemoveProjectUserArgs = {
  input: RemoveProjectUserInput;
};


/** Update an existing tag. */
export type MutationRemoveRoleGroupArgs = {
  input: RemoveRoleGroupInput;
};


/** Update an existing tag. */
export type MutationRemoveRoleTagArgs = {
  input: RemoveRoleTagInput;
};


/** Update an existing tag. */
export type MutationRemoveUserRoleArgs = {
  input: RemoveUserRoleInput;
};


/** Update an existing tag. */
export type MutationRemoveUserTagArgs = {
  input: RemoveUserTagInput;
};


/** Update an existing tag. */
export type MutationUpdateGroupArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGroupInput;
};


/** Update an existing tag. */
export type MutationUpdateOrganizationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOrganizationInput;
};


/** Update an existing tag. */
export type MutationUpdatePermissionArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePermissionInput;
};


/** Update an existing tag. */
export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};


/** Update an existing tag. */
export type MutationUpdateRoleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
};


/** Update an existing tag. */
export type MutationUpdateTagArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTagInput;
};


/** Update an existing tag. */
export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

/** Represents an organization in the system. */
export type Organization = Auditable & {
  __typename?: 'Organization';
  /** Timestamp when the organization was created. */
  createdAt: Scalars['String']['output'];
  /** Organization groups. */
  groups?: Maybe<Array<Group>>;
  /** Unique identifier for the organization. */
  id: Scalars['ID']['output'];
  /** Name of the organization. */
  name: Scalars['String']['output'];
  /** Organization permissions. */
  permissions?: Maybe<Array<Permission>>;
  /** Organization projects. */
  projects?: Maybe<Array<Project>>;
  /** Organization roles. */
  roles?: Maybe<Array<Role>>;
  /** URL-friendly slug for the organization. */
  slug: Scalars['String']['output'];
  /** Organization tags. */
  tags?: Maybe<Array<Tag>>;
  /** Timestamp when the organization was last updated. */
  updatedAt: Scalars['String']['output'];
  /** Organization users. */
  users?: Maybe<Array<User>>;
};

/** Represents an organization-group relationship in the system. */
export type OrganizationGroup = Auditable & {
  __typename?: 'OrganizationGroup';
  /** Timestamp when the organization-group relationship was created. */
  createdAt: Scalars['String']['output'];
  /** The group associated with this relationship. */
  group?: Maybe<Group>;
  /** ID of the group. */
  groupId: Scalars['ID']['output'];
  /** Unique identifier for the organization-group relationship. */
  id: Scalars['ID']['output'];
  /** The organization associated with this relationship. */
  organization?: Maybe<Organization>;
  /** ID of the organization. */
  organizationId: Scalars['ID']['output'];
  /** Timestamp when the organization-group relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Represents a paginated list of organizations. */
export type OrganizationPage = PaginatedResults & {
  __typename?: 'OrganizationPage';
  /** Whether there are more organizations to load. */
  hasNextPage: Scalars['Boolean']['output'];
  /** List of organizations in the current page. */
  organizations: Array<Organization>;
  /** Total number of organizations. */
  totalCount: Scalars['Int']['output'];
};

/** Represents an organization-permission relationship in the system. */
export type OrganizationPermission = Auditable & {
  __typename?: 'OrganizationPermission';
  /** Timestamp when the organization-permission relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the organization-permission relationship. */
  id: Scalars['ID']['output'];
  /** The organization associated with this relationship. */
  organization?: Maybe<Organization>;
  /** ID of the organization. */
  organizationId: Scalars['ID']['output'];
  /** The permission associated with this relationship. */
  permission?: Maybe<Permission>;
  /** ID of the permission. */
  permissionId: Scalars['ID']['output'];
  /** Timestamp when the organization-permission relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Represents an organization-project relationship in the system. */
export type OrganizationProject = Auditable & {
  __typename?: 'OrganizationProject';
  /** Timestamp when the organization-project relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the organization-project relationship. */
  id: Scalars['ID']['output'];
  /** The organization associated with this relationship. */
  organization?: Maybe<Organization>;
  /** ID of the organization. */
  organizationId: Scalars['ID']['output'];
  /** The project associated with this relationship. */
  project?: Maybe<Project>;
  /** ID of the project. */
  projectId: Scalars['ID']['output'];
  /** Timestamp when the organization-project relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Represents an organization-role relationship in the system. */
export type OrganizationRole = Auditable & {
  __typename?: 'OrganizationRole';
  /** Timestamp when the organization-role relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the organization-role relationship. */
  id: Scalars['ID']['output'];
  /** The organization associated with this relationship. */
  organization?: Maybe<Organization>;
  /** ID of the organization. */
  organizationId: Scalars['ID']['output'];
  /** The role associated with this relationship. */
  role?: Maybe<Role>;
  /** ID of the role. */
  roleId: Scalars['ID']['output'];
  /** Timestamp when the organization-role relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Input for sorting organizations. */
export type OrganizationSortInput = {
  /** Field to sort by. */
  field: OrganizationSortableField;
  /** Sort order. */
  order: OrganizationSortOrder;
};

/** Sort order for organizations. */
export enum OrganizationSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields that can be used to sort organizations. */
export enum OrganizationSortableField {
  /** Sort by creation date. */
  CreatedAt = 'createdAt',
  /** Sort by organization name. */
  Name = 'name',
  /** Sort by last update date. */
  UpdatedAt = 'updatedAt'
}

/** Represents an organization-tag relationship in the system. */
export type OrganizationTag = Auditable & {
  __typename?: 'OrganizationTag';
  /** Timestamp when the organization-tag relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the organization-tag relationship. */
  id: Scalars['ID']['output'];
  /** The organization associated with this relationship. */
  organization?: Maybe<Organization>;
  /** ID of the organization. */
  organizationId: Scalars['ID']['output'];
  /** The tag associated with this relationship. */
  tag?: Maybe<Tag>;
  /** ID of the tag. */
  tagId: Scalars['ID']['output'];
  /** Timestamp when the organization-tag relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Represents an organization-user relationship in the system. */
export type OrganizationUser = Auditable & {
  __typename?: 'OrganizationUser';
  /** Timestamp when the organization-user relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the organization-user relationship. */
  id: Scalars['ID']['output'];
  /** The organization associated with this relationship. */
  organization?: Maybe<Organization>;
  /** ID of the organization. */
  organizationId: Scalars['ID']['output'];
  /** Timestamp when the organization-user relationship was last updated. */
  updatedAt: Scalars['String']['output'];
  /** The user associated with this relationship. */
  user?: Maybe<User>;
  /** ID of the user. */
  userId: Scalars['ID']['output'];
};

/** Base interface for paginated results. */
export type PaginatedResults = {
  /** Whether there are more items available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Total number of items across all pages. */
  totalCount: Scalars['Int']['output'];
};

/** Represents a permission in the system. */
export type Permission = Auditable & {
  __typename?: 'Permission';
  /** Action associated with the permission. */
  action: Scalars['String']['output'];
  /** Timestamp when the permission was created. */
  createdAt: Scalars['String']['output'];
  /** Description of the permission. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the permission. */
  id: Scalars['ID']['output'];
  /** Name of the permission. */
  name: Scalars['String']['output'];
  /** Tags associated with the permission. */
  tags?: Maybe<Array<Tag>>;
  /** Timestamp when the permission was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a permission in the system. */
export type PermissionTagsArgs = {
  scope: Scope;
};

/** Represents a paginated list of permissions. */
export type PermissionPage = PaginatedResults & {
  __typename?: 'PermissionPage';
  /** Whether there are more permissions available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** List of permissions for the current page. */
  permissions: Array<Permission>;
  /** Total number of permissions across all pages. */
  totalCount: Scalars['Int']['output'];
};

/** Input for sorting permissions. */
export type PermissionSortInput = {
  field: PermissionSortableField;
  order: PermissionSortOrder;
};

/** Sort order for permissions. */
export enum PermissionSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields by which permissions can be sorted. */
export enum PermissionSortableField {
  Action = 'action',
  Name = 'name'
}

export type PermissionTag = Auditable & {
  __typename?: 'PermissionTag';
  /** Timestamp when the permission-tag relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the permission-tag relationship. */
  id: Scalars['ID']['output'];
  /** The permission associated with this relationship. */
  permission?: Maybe<Permission>;
  /** ID of the permission. */
  permissionId: Scalars['ID']['output'];
  /** The tag associated with this relationship. */
  tag?: Maybe<Tag>;
  /** ID of the tag. */
  tagId: Scalars['ID']['output'];
  /** Timestamp when the permission-tag relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Represents a project in the system. */
export type Project = Auditable & {
  __typename?: 'Project';
  /** Timestamp when the project was created. */
  createdAt: Scalars['String']['output'];
  /** Description of the project. */
  description?: Maybe<Scalars['String']['output']>;
  /** Project groups. */
  groups?: Maybe<Array<Group>>;
  /** Unique identifier for the project. */
  id: Scalars['ID']['output'];
  /** Name of the project. */
  name: Scalars['String']['output'];
  /** Project permissions. */
  permissions?: Maybe<Array<Permission>>;
  /** Project roles. */
  roles?: Maybe<Array<Role>>;
  /** URL-friendly slug for the project. */
  slug: Scalars['String']['output'];
  /** Project tags. */
  tags?: Maybe<Array<Tag>>;
  /** Timestamp when the project was last updated. */
  updatedAt: Scalars['String']['output'];
  /** Project users. */
  users?: Maybe<Array<User>>;
};

/** Represents a project-group relationship in the system. */
export type ProjectGroup = Auditable & {
  __typename?: 'ProjectGroup';
  /** Timestamp when the project-group relationship was created. */
  createdAt: Scalars['String']['output'];
  /** The group associated with this relationship. */
  group?: Maybe<Group>;
  /** ID of the group. */
  groupId: Scalars['ID']['output'];
  /** Unique identifier for the project-group relationship. */
  id: Scalars['ID']['output'];
  /** The project associated with this relationship. */
  project?: Maybe<Project>;
  /** ID of the project. */
  projectId: Scalars['ID']['output'];
  /** Timestamp when the project-group relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a project-group relationship in the system. */
export type ProjectGroupProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

/** Represents a paginated list of projects. */
export type ProjectPage = PaginatedResults & {
  __typename?: 'ProjectPage';
  /** Whether there are more projects to load. */
  hasNextPage: Scalars['Boolean']['output'];
  /** List of projects in the current page. */
  projects: Array<Project>;
  /** Total number of projects. */
  totalCount: Scalars['Int']['output'];
};

/** Represents a project-permission relationship in the system. */
export type ProjectPermission = Auditable & {
  __typename?: 'ProjectPermission';
  /** Timestamp when the project-permission relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the project-permission relationship. */
  id: Scalars['ID']['output'];
  /** The permission associated with this relationship. */
  permission?: Maybe<Permission>;
  /** ID of the permission. */
  permissionId: Scalars['ID']['output'];
  /** The project associated with this relationship. */
  project?: Maybe<Project>;
  /** ID of the project. */
  projectId: Scalars['ID']['output'];
  /** Timestamp when the project-permission relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a project-permission relationship in the system. */
export type ProjectPermissionProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

/** Represents a project-role relationship in the system. */
export type ProjectRole = Auditable & {
  __typename?: 'ProjectRole';
  /** Timestamp when the project-role relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the project-role relationship. */
  id: Scalars['ID']['output'];
  /** The project associated with this relationship. */
  project?: Maybe<Project>;
  /** ID of the project. */
  projectId: Scalars['ID']['output'];
  /** The role associated with this relationship. */
  role?: Maybe<Role>;
  /** ID of the role. */
  roleId: Scalars['ID']['output'];
  /** Timestamp when the project-role relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a project-role relationship in the system. */
export type ProjectRoleProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

/** Input for sorting projects. */
export type ProjectSortInput = {
  /** Field to sort by. */
  field: ProjectSortableField;
  /** Sort order. */
  order: ProjectSortOrder;
};

/** Sort order for projects. */
export enum ProjectSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields that can be used to sort projects. */
export enum ProjectSortableField {
  /** Sort by creation date. */
  CreatedAt = 'createdAt',
  /** Sort by project name. */
  Name = 'name',
  /** Sort by last update date. */
  UpdatedAt = 'updatedAt'
}

/** Represents a project-tag relationship in the system. */
export type ProjectTag = Auditable & {
  __typename?: 'ProjectTag';
  /** Timestamp when the project-tag relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the project-tag relationship. */
  id: Scalars['ID']['output'];
  /** The project associated with this relationship. */
  project?: Maybe<Project>;
  /** ID of the project. */
  projectId: Scalars['ID']['output'];
  /** The tag associated with this relationship. */
  tag?: Maybe<Tag>;
  /** ID of the tag. */
  tagId: Scalars['ID']['output'];
  /** Timestamp when the project-tag relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a project-tag relationship in the system. */
export type ProjectTagProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

/** Represents a project-user relationship in the system. */
export type ProjectUser = Auditable & {
  __typename?: 'ProjectUser';
  /** Timestamp when the project-user relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the project-user relationship. */
  id: Scalars['ID']['output'];
  /** The project associated with this relationship. */
  project?: Maybe<Project>;
  /** ID of the project. */
  projectId: Scalars['ID']['output'];
  /** Timestamp when the project-user relationship was last updated. */
  updatedAt: Scalars['String']['output'];
  /** The user associated with this relationship. */
  user?: Maybe<User>;
  /** ID of the user. */
  userId: Scalars['ID']['output'];
};


/** Represents a project-user relationship in the system. */
export type ProjectUserProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  /** Retrieves group-permission relationships. */
  groupPermissions: Array<GroupPermission>;
  /** Retrieves group-tag relationships for a specific group. */
  groupTags: Array<GroupTag>;
  /** Retrieves a paginated list of groups within the specified scope. */
  groups: GroupPage;
  /** Retrieves organization-group relationships for a specific organization. */
  organizationGroups: Array<OrganizationGroup>;
  /** Retrieves organization-permission relationships for a specific organization. */
  organizationPermissions: Array<OrganizationPermission>;
  /** Retrieves organization-project relationships for a specific organization. */
  organizationProjects: Array<OrganizationProject>;
  /** Retrieves organization-role relationships for a specific organization. */
  organizationRoles: Array<OrganizationRole>;
  /** Retrieves organization-tag relationships for a specific organization. */
  organizationTags: Array<OrganizationTag>;
  /** Retrieves organization-user relationships for a specific organization. */
  organizationUsers: Array<OrganizationUser>;
  /** Get a paginated list of organizations. */
  organizations: OrganizationPage;
  /** Retrieves permission-tag relationships for a specific permission. */
  permissionTags: Array<PermissionTag>;
  /** Retrieves a paginated list of permissions within the specified scope. */
  permissions: PermissionPage;
  /** Retrieves project-group relationships for a specific project. */
  projectGroups: Array<ProjectGroup>;
  /** Retrieves project-permission relationships for a specific project. */
  projectPermissions: Array<ProjectPermission>;
  /** Retrieves project-role relationships for a specific project. */
  projectRoles: Array<ProjectRole>;
  /** Retrieves project-tag relationships for a specific project. */
  projectTags: Array<ProjectTag>;
  /** Retrieves project-user relationships for a specific project. */
  projectUsers: Array<ProjectUser>;
  /** Get a paginated list of projects within an organization. */
  projects: ProjectPage;
  /** Retrieves role-group relationships for a specific role. */
  roleGroups: Array<RoleGroup>;
  /** Retrieves role-tag relationships for a specific role. */
  roleTags: Array<RoleTag>;
  /** Retrieves a paginated list of roles within the specified scope. */
  roles: RolePage;
  /** Retrieves a paginated list of tags. */
  tags: TagPage;
  /** Retrieves user-role relationships for a specific user. */
  userRoles: Array<UserRole>;
  /** Retrieves user-tag relationships for a specific user. */
  userTags: Array<UserTag>;
  /** Retrieves a paginated list of users within the specified scope. */
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

/** Input type for removing a group-permission relationship. */
export type RemoveGroupPermissionInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
};

/** Input type for removing a group-tag relationship. */
export type RemoveGroupTagInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for removing an organization-group relationship. */
export type RemoveOrganizationGroupInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
};

/** Input type for removing an organization-permission relationship. */
export type RemoveOrganizationPermissionInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
};

/** Input type for removing an organization-project relationship. */
export type RemoveOrganizationProjectInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
};

/** Input type for removing an organization-role relationship. */
export type RemoveOrganizationRoleInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
};

/** Input type for removing an organization-tag relationship. */
export type RemoveOrganizationTagInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for removing an organization-user relationship. */
export type RemoveOrganizationUserInput = {
  /** ID of the organization. */
  organizationId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

export type RemovePermissionTagInput = {
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for removing a project-group relationship. */
export type RemoveProjectGroupInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
};

/** Input type for removing a project-permission relationship. */
export type RemoveProjectPermissionInput = {
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
};

/** Input type for removing a project-role relationship. */
export type RemoveProjectRoleInput = {
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
};

/** Input type for removing a project-tag relationship. */
export type RemoveProjectTagInput = {
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for removing a project-user relationship. */
export type RemoveProjectUserInput = {
  /** ID of the project. */
  projectId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

/** Input type for removing a role-group relationship. */
export type RemoveRoleGroupInput = {
  /** ID of the group. */
  groupId: Scalars['ID']['input'];
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
};

/** Input type for removing a role-tag relationship. */
export type RemoveRoleTagInput = {
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
};

/** Input type for removing a user-role relationship. */
export type RemoveUserRoleInput = {
  /** ID of the role. */
  roleId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

/** Input type for removing a user-tag relationship. */
export type RemoveUserTagInput = {
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
  /** ID of the user. */
  userId: Scalars['ID']['input'];
};

/** Represents a role in the system. */
export type Role = Auditable & {
  __typename?: 'Role';
  /** Timestamp when the role was created. */
  createdAt: Scalars['String']['output'];
  /** Description of the role. */
  description?: Maybe<Scalars['String']['output']>;
  /** List of groups associated with this role. */
  groups?: Maybe<Array<Group>>;
  /** Unique identifier for the role. */
  id: Scalars['ID']['output'];
  /** Name of the role. */
  name: Scalars['String']['output'];
  /** List of tags assigned to the role. */
  tags?: Maybe<Array<Tag>>;
  /** Timestamp when the role was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a role in the system. */
export type RoleGroupsArgs = {
  scope: Scope;
};


/** Represents a role in the system. */
export type RoleTagsArgs = {
  scope: Scope;
};

/** Represents a role-group relationship in the system. */
export type RoleGroup = Auditable & {
  __typename?: 'RoleGroup';
  /** Timestamp when the role-group relationship was created. */
  createdAt: Scalars['String']['output'];
  /** The group associated with this relationship. */
  group?: Maybe<Group>;
  /** ID of the group. */
  groupId: Scalars['ID']['output'];
  /** Unique identifier for the role-group relationship. */
  id: Scalars['ID']['output'];
  /** The role associated with this relationship. */
  role?: Maybe<Role>;
  /** ID of the role. */
  roleId: Scalars['ID']['output'];
  /** Timestamp when the role-group relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a role-group relationship in the system. */
export type RoleGroupGroupArgs = {
  scope: Scope;
};


/** Represents a role-group relationship in the system. */
export type RoleGroupRoleArgs = {
  scope: Scope;
};

/** Represents a paginated list of roles. */
export type RolePage = PaginatedResults & {
  __typename?: 'RolePage';
  /** Whether there are more roles available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** List of roles for the current page. */
  roles: Array<Role>;
  /** Total number of roles across all pages. */
  totalCount: Scalars['Int']['output'];
};

/** Input for sorting roles. */
export type RoleSortInput = {
  field: RoleSortableField;
  order: RoleSortOrder;
};

/** Sort order for roles. */
export enum RoleSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields by which roles can be sorted. */
export enum RoleSortableField {
  Name = 'name'
}

/** Represents a role-tag relationship in the system. */
export type RoleTag = Auditable & {
  __typename?: 'RoleTag';
  /** Timestamp when the role-tag relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the role-tag relationship. */
  id: Scalars['ID']['output'];
  /** The role associated with this relationship. */
  role?: Maybe<Role>;
  /** ID of the role. */
  roleId: Scalars['ID']['output'];
  /** The tag associated with this relationship. */
  tag?: Maybe<Tag>;
  /** ID of the tag. */
  tagId: Scalars['ID']['output'];
  /** Timestamp when the role-tag relationship was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Input type for specifying the scope of a query. */
export type Scope = {
  /** The unique identifier of the tenant. */
  id: Scalars['ID']['input'];
  /** The type of tenant (organization or project). */
  tenant: Tenant;
};

/** Sort direction. */
export enum SortDirection {
  /** Ascending order. */
  Asc = 'ASC',
  /** Descending order. */
  Desc = 'DESC'
}

/** Represents a tag in the system. */
export type Tag = Auditable & {
  __typename?: 'Tag';
  /** Color identifier for the tag (e.g., 'purple', 'indigo', 'blue'). */
  color: Scalars['String']['output'];
  /** Timestamp when the tag was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the tag. */
  id: Scalars['ID']['output'];
  /** Name of the tag. */
  name: Scalars['String']['output'];
  /** Timestamp when the tag was last updated. */
  updatedAt: Scalars['String']['output'];
};

/** Represents a paginated list of tags. */
export type TagPage = PaginatedResults & {
  __typename?: 'TagPage';
  /** Whether there are more tags available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** List of tags in the current page. */
  tags: Array<Tag>;
  /** Total number of tags across all pages. */
  totalCount: Scalars['Int']['output'];
};

/** Available fields for sorting tags. */
export enum TagSortField {
  /** Sort by color. */
  Color = 'COLOR',
  /** Sort by creation date. */
  CreatedAt = 'CREATED_AT',
  /** Sort by name. */
  Name = 'NAME',
  /** Sort by last update date. */
  UpdatedAt = 'UPDATED_AT'
}

/** Input for sorting tags. */
export type TagSortInput = {
  /** Sort direction. */
  direction: SortDirection;
  /** Field to sort by. */
  field: TagSortField;
};

/** Enum for tenant types in the multi-tenant system. */
export enum Tenant {
  /** Organization-level tenant. */
  Organization = 'ORGANIZATION',
  /** Project-level tenant. */
  Project = 'PROJECT'
}

export type UpdateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an existing organization. */
export type UpdateOrganizationInput = {
  /** Name of the organization. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePermissionInput = {
  action?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an existing project. */
export type UpdateProjectInput = {
  /** Description of the project. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Name of the project. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an existing tag. */
export type UpdateTagInput = {
  /** Color identifier for the tag (e.g., 'purple', 'indigo', 'blue'). */
  color?: InputMaybe<Scalars['String']['input']>;
  /** Name of the tag. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input type for updating an existing user. */
export type UpdateUserInput = {
  /** Email address of the user. */
  email: Scalars['String']['input'];
  /** Full name of the user. */
  name: Scalars['String']['input'];
};

/** Represents a user in the system. */
export type User = Auditable & {
  __typename?: 'User';
  /** Timestamp when the user was created. */
  createdAt: Scalars['String']['output'];
  /** Email address of the user. */
  email: Scalars['String']['output'];
  /** Unique identifier for the user. */
  id: Scalars['ID']['output'];
  /** Full name of the user. */
  name: Scalars['String']['output'];
  /** List of roles assigned to the user. */
  roles?: Maybe<Array<Role>>;
  /** List of tags assigned to the user. */
  tags?: Maybe<Array<Tag>>;
  /** Timestamp when the user was last updated. */
  updatedAt: Scalars['String']['output'];
};


/** Represents a user in the system. */
export type UserRolesArgs = {
  scope: Scope;
};


/** Represents a user in the system. */
export type UserTagsArgs = {
  scope: Scope;
};

/** Represents a paginated list of users. */
export type UserPage = PaginatedResults & {
  __typename?: 'UserPage';
  /** Whether there are more users available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Total number of users across all pages. */
  totalCount: Scalars['Int']['output'];
  /** List of users for the current page. */
  users: Array<User>;
};

/** Represents a user-role relationship in the system. */
export type UserRole = Auditable & {
  __typename?: 'UserRole';
  /** Timestamp when the user-role relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the user-role relationship. */
  id: Scalars['ID']['output'];
  /** The role associated with this relationship. */
  role: Role;
  /** ID of the role. */
  roleId: Scalars['ID']['output'];
  /** Timestamp when the user-role relationship was last updated. */
  updatedAt: Scalars['String']['output'];
  /** The user associated with this relationship. */
  user: User;
  /** ID of the user. */
  userId: Scalars['ID']['output'];
};


/** Represents a user-role relationship in the system. */
export type UserRoleRoleArgs = {
  scope: Scope;
};


/** Represents a user-role relationship in the system. */
export type UserRoleUserArgs = {
  scope: Scope;
};

/** Input for sorting users. */
export type UserSortInput = {
  field: UserSortableField;
  order: UserSortOrder;
};

/** Sort order for users. */
export enum UserSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields by which users can be sorted. */
export enum UserSortableField {
  Email = 'email',
  Name = 'name'
}

/** Represents a user-tag relationship in the system. */
export type UserTag = Auditable & {
  __typename?: 'UserTag';
  /** Timestamp when the user-tag relationship was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for the user-tag relationship. */
  id: Scalars['ID']['output'];
  /** The tag associated with this relationship. */
  tag?: Maybe<Tag>;
  /** ID of the tag. */
  tagId: Scalars['ID']['output'];
  /** Timestamp when the user-tag relationship was last updated. */
  updatedAt: Scalars['String']['output'];
  /** The user associated with this relationship. */
  user?: Maybe<User>;
  /** ID of the user. */
  userId: Scalars['ID']['output'];
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
  Group: ResolverTypeWrapper<Group>;
  GroupPage: ResolverTypeWrapper<GroupPage>;
  GroupPermission: ResolverTypeWrapper<GroupPermission>;
  GroupSortInput: GroupSortInput;
  GroupSortOrder: GroupSortOrder;
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
  OrganizationSortOrder: OrganizationSortOrder;
  OrganizationSortableField: OrganizationSortableField;
  OrganizationTag: ResolverTypeWrapper<OrganizationTag>;
  OrganizationUser: ResolverTypeWrapper<OrganizationUser>;
  PaginatedResults: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['PaginatedResults']>;
  Permission: ResolverTypeWrapper<Permission>;
  PermissionPage: ResolverTypeWrapper<PermissionPage>;
  PermissionSortInput: PermissionSortInput;
  PermissionSortOrder: PermissionSortOrder;
  PermissionSortableField: PermissionSortableField;
  PermissionTag: ResolverTypeWrapper<PermissionTag>;
  Project: ResolverTypeWrapper<Project>;
  ProjectGroup: ResolverTypeWrapper<ProjectGroup>;
  ProjectPage: ResolverTypeWrapper<ProjectPage>;
  ProjectPermission: ResolverTypeWrapper<ProjectPermission>;
  ProjectRole: ResolverTypeWrapper<ProjectRole>;
  ProjectSortInput: ProjectSortInput;
  ProjectSortOrder: ProjectSortOrder;
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
  RoleSortOrder: RoleSortOrder;
  RoleSortableField: RoleSortableField;
  RoleTag: ResolverTypeWrapper<RoleTag>;
  Scope: Scope;
  SortDirection: SortDirection;
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
  UserSortOrder: UserSortOrder;
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
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CreatableResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Creatable'] = ResolversParentTypes['Creatable']> = ResolversObject<{
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type GroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Group'] = ResolversParentTypes['Group']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType, RequireFields<GroupPermissionsArgs, 'scope'>>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<GroupTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GroupPage'] = ResolversParentTypes['GroupPage']> = ResolversObject<{
  groups?: Resolver<Array<ResolversTypes['Group']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupPermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GroupPermission'] = ResolversParentTypes['GroupPermission']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType, RequireFields<GroupPermissionGroupArgs, 'scope'>>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType, RequireFields<GroupPermissionPermissionArgs, 'scope'>>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GroupTag'] = ResolversParentTypes['GroupTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  deleteGroup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteGroupArgs, 'id'>>;
  deleteOrganization?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteOrganizationArgs, 'id'>>;
  deletePermission?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeletePermissionArgs, 'id'>>;
  deleteProject?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteProjectArgs, 'id'>>;
  deleteRole?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteRoleArgs, 'id'>>;
  deleteTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteTagArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'id'>>;
  login?: Resolver<ResolversTypes['LoginResponse'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'input'>>;
  removeGroupPermission?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveGroupPermissionArgs, 'input'>>;
  removeGroupTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveGroupTagArgs, 'input'>>;
  removeOrganizationGroup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationGroupArgs, 'input'>>;
  removeOrganizationPermission?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationPermissionArgs, 'input'>>;
  removeOrganizationProject?: Resolver<ResolversTypes['OrganizationProject'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationProjectArgs, 'input'>>;
  removeOrganizationRole?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationRoleArgs, 'input'>>;
  removeOrganizationTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationTagArgs, 'input'>>;
  removeOrganizationUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveOrganizationUserArgs, 'input'>>;
  removePermissionTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemovePermissionTagArgs, 'input'>>;
  removeProjectGroup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveProjectGroupArgs, 'input'>>;
  removeProjectPermission?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveProjectPermissionArgs, 'input'>>;
  removeProjectRole?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveProjectRoleArgs, 'input'>>;
  removeProjectTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveProjectTagArgs, 'input'>>;
  removeProjectUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveProjectUserArgs, 'input'>>;
  removeRoleGroup?: Resolver<ResolversTypes['RoleGroup'], ParentType, ContextType, RequireFields<MutationRemoveRoleGroupArgs, 'input'>>;
  removeRoleTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveRoleTagArgs, 'input'>>;
  removeUserRole?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType, RequireFields<MutationRemoveUserRoleArgs, 'input'>>;
  removeUserTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveUserTagArgs, 'input'>>;
  updateGroup?: Resolver<ResolversTypes['Group'], ParentType, ContextType, RequireFields<MutationUpdateGroupArgs, 'id' | 'input'>>;
  updateOrganization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType, RequireFields<MutationUpdateOrganizationArgs, 'id' | 'input'>>;
  updatePermission?: Resolver<ResolversTypes['Permission'], ParentType, ContextType, RequireFields<MutationUpdatePermissionArgs, 'id' | 'input'>>;
  updateProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationUpdateProjectArgs, 'id' | 'input'>>;
  updateRole?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationUpdateRoleArgs, 'id' | 'input'>>;
  updateTag?: Resolver<ResolversTypes['Tag'], ParentType, ContextType, RequireFields<MutationUpdateTagArgs, 'id' | 'input'>>;
  updateUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateUserArgs, 'id' | 'input'>>;
}>;

export type OrganizationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  projects?: Resolver<Maybe<Array<ResolversTypes['Project']>>, ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  users?: Resolver<Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationGroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationGroup'] = ResolversParentTypes['OrganizationGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationPage'] = ResolversParentTypes['OrganizationPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationPermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationPermission'] = ResolversParentTypes['OrganizationPermission']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationProjectResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationProject'] = ResolversParentTypes['OrganizationProject']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationRoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationRole'] = ResolversParentTypes['OrganizationRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationTag'] = ResolversParentTypes['OrganizationTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationUserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationUser'] = ResolversParentTypes['OrganizationUser']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<PermissionTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermissionPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PermissionPage'] = ResolversParentTypes['PermissionPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['Permission']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermissionTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PermissionTag'] = ResolversParentTypes['PermissionTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  users?: Resolver<Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectGroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectGroup'] = ResolversParentTypes['ProjectGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectGroupProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectPage'] = ResolversParentTypes['ProjectPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectPermission'] = ResolversParentTypes['ProjectPermission']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectPermissionProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectRoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectRole'] = ResolversParentTypes['ProjectRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectRoleProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectTag'] = ResolversParentTypes['ProjectTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectTagProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectUser'] = ResolversParentTypes['ProjectUser']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectUserProjectArgs, 'organizationId'>>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType, RequireFields<RoleGroupsArgs, 'scope'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<RoleTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleGroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RoleGroup'] = ResolversParentTypes['RoleGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType, RequireFields<RoleGroupGroupArgs, 'scope'>>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, RequireFields<RoleGroupRoleArgs, 'scope'>>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RolePage'] = ResolversParentTypes['RolePage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RoleTag'] = ResolversParentTypes['RoleTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag']> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TagPage'] = ResolversParentTypes['TagPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType, RequireFields<UserRolesArgs, 'scope'>>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType, RequireFields<UserTagsArgs, 'scope'>>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserPage'] = ResolversParentTypes['UserPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserRoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserRole'] = ResolversParentTypes['UserRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<UserRoleRoleArgs, 'scope'>>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<UserRoleUserArgs, 'scope'>>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserTag'] = ResolversParentTypes['UserTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  Auditable?: AuditableResolvers<ContextType>;
  Creatable?: CreatableResolvers<ContextType>;
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

