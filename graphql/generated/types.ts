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

export type AddPermissionTagInput = {
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
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
  /** Adds a permission-tag relationship. */
  addPermissionTag: PermissionTag;
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
  /** Removes a permission-tag relationship. */
  removePermissionTag: Scalars['Boolean']['output'];
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
export type MutationAddPermissionTagArgs = {
  input: AddPermissionTagInput;
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
export type MutationRemovePermissionTagArgs = {
  input: RemovePermissionTagInput;
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
  /** Unique identifier for the organization. */
  id: Scalars['ID']['output'];
  /** Name of the organization. */
  name: Scalars['String']['output'];
  /** URL-friendly slug for the organization. */
  slug: Scalars['String']['output'];
  /** Timestamp when the organization was last updated. */
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
  /** Unique identifier for the project. */
  id: Scalars['ID']['output'];
  /** Name of the project. */
  name: Scalars['String']['output'];
  /** URL-friendly slug for the project. */
  slug: Scalars['String']['output'];
  /** Timestamp when the project was last updated. */
  updatedAt: Scalars['String']['output'];
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

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  /** Retrieves group-permission relationships. */
  groupPermissions: Array<GroupPermission>;
  /** Retrieves group-tag relationships for a specific group. */
  groupTags: Array<GroupTag>;
  /** Retrieves a paginated list of groups. */
  groups: GroupPage;
  /** Get a paginated list of organizations. */
  organizations: OrganizationPage;
  /** Retrieves permission-tag relationships for a specific permission. */
  permissionTags: Array<PermissionTag>;
  /** Retrieves a paginated list of permissions. */
  permissions: PermissionPage;
  /** Get a paginated list of projects. */
  projects: ProjectPage;
  /** Retrieves role-group relationships for a specific role. */
  roleGroups: Array<RoleGroup>;
  /** Retrieves role-tag relationships for a specific role. */
  roleTags: Array<RoleTag>;
  /** Retrieves a paginated list of roles. */
  roles: RolePage;
  /** Retrieves a paginated list of tags. */
  tags: TagPage;
  /** Retrieves user-role relationships for a specific user. */
  userRoles: Array<UserRole>;
  /** Retrieves user-tag relationships for a specific user. */
  userTags: Array<UserTag>;
  /** Retrieves a paginated list of users. */
  users: UserPage;
};


export type QueryGroupPermissionsArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryGroupTagsArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryGroupsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<GroupSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryOrganizationsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit: Scalars['Int']['input'];
  page: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationSortInput>;
};


export type QueryPermissionTagsArgs = {
  permissionId: Scalars['ID']['input'];
};


export type QueryPermissionsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<PermissionSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryProjectsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit: Scalars['Int']['input'];
  page: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ProjectSortInput>;
};


export type QueryRoleGroupsArgs = {
  roleId: Scalars['ID']['input'];
};


export type QueryRoleTagsArgs = {
  roleId: Scalars['ID']['input'];
};


export type QueryRolesArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<RoleSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryTagsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<TagSortInput>;
};


export type QueryUserRolesArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUserTagsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
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

export type RemovePermissionTagInput = {
  /** ID of the permission. */
  permissionId: Scalars['ID']['input'];
  /** ID of the tag. */
  tagId: Scalars['ID']['input'];
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
  Auditable: ( Group ) | ( GroupPermission ) | ( GroupTag ) | ( Organization ) | ( Permission ) | ( PermissionTag ) | ( Project ) | ( Role ) | ( RoleGroup ) | ( RoleTag ) | ( Tag ) | ( User ) | ( UserRole ) | ( UserTag );
  Creatable: never;
  PaginatedResults: ( GroupPage ) | ( OrganizationPage ) | ( PermissionPage ) | ( ProjectPage ) | ( RolePage ) | ( TagPage ) | ( UserPage );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AddGroupPermissionInput: AddGroupPermissionInput;
  AddGroupTagInput: AddGroupTagInput;
  AddPermissionTagInput: AddPermissionTagInput;
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
  OrganizationPage: ResolverTypeWrapper<OrganizationPage>;
  OrganizationSortInput: OrganizationSortInput;
  OrganizationSortOrder: OrganizationSortOrder;
  OrganizationSortableField: OrganizationSortableField;
  PaginatedResults: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['PaginatedResults']>;
  Permission: ResolverTypeWrapper<Permission>;
  PermissionPage: ResolverTypeWrapper<PermissionPage>;
  PermissionSortInput: PermissionSortInput;
  PermissionSortOrder: PermissionSortOrder;
  PermissionSortableField: PermissionSortableField;
  PermissionTag: ResolverTypeWrapper<PermissionTag>;
  Project: ResolverTypeWrapper<Project>;
  ProjectPage: ResolverTypeWrapper<ProjectPage>;
  ProjectSortInput: ProjectSortInput;
  ProjectSortOrder: ProjectSortOrder;
  ProjectSortableField: ProjectSortableField;
  Query: ResolverTypeWrapper<{}>;
  RemoveGroupPermissionInput: RemoveGroupPermissionInput;
  RemoveGroupTagInput: RemoveGroupTagInput;
  RemovePermissionTagInput: RemovePermissionTagInput;
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
  SortDirection: SortDirection;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Tag: ResolverTypeWrapper<Tag>;
  TagPage: ResolverTypeWrapper<TagPage>;
  TagSortField: TagSortField;
  TagSortInput: TagSortInput;
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
  AddPermissionTagInput: AddPermissionTagInput;
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
  OrganizationPage: OrganizationPage;
  OrganizationSortInput: OrganizationSortInput;
  PaginatedResults: ResolversInterfaceTypes<ResolversParentTypes>['PaginatedResults'];
  Permission: Permission;
  PermissionPage: PermissionPage;
  PermissionSortInput: PermissionSortInput;
  PermissionTag: PermissionTag;
  Project: Project;
  ProjectPage: ProjectPage;
  ProjectSortInput: ProjectSortInput;
  Query: {};
  RemoveGroupPermissionInput: RemoveGroupPermissionInput;
  RemoveGroupTagInput: RemoveGroupTagInput;
  RemovePermissionTagInput: RemovePermissionTagInput;
  RemoveRoleGroupInput: RemoveRoleGroupInput;
  RemoveRoleTagInput: RemoveRoleTagInput;
  RemoveUserRoleInput: RemoveUserRoleInput;
  RemoveUserTagInput: RemoveUserTagInput;
  Role: Role;
  RoleGroup: RoleGroup;
  RolePage: RolePage;
  RoleSortInput: RoleSortInput;
  RoleTag: RoleTag;
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
  __resolveType: TypeResolveFn<'Group' | 'GroupPermission' | 'GroupTag' | 'Organization' | 'Permission' | 'PermissionTag' | 'Project' | 'Role' | 'RoleGroup' | 'RoleTag' | 'Tag' | 'User' | 'UserRole' | 'UserTag', ParentType, ContextType>;
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
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
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
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
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
  addPermissionTag?: Resolver<ResolversTypes['PermissionTag'], ParentType, ContextType, RequireFields<MutationAddPermissionTagArgs, 'input'>>;
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
  removePermissionTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemovePermissionTagArgs, 'input'>>;
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
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationPage'] = ResolversParentTypes['OrganizationPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
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
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectPage'] = ResolversParentTypes['ProjectPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groupPermissions?: Resolver<Array<ResolversTypes['GroupPermission']>, ParentType, ContextType, RequireFields<QueryGroupPermissionsArgs, 'groupId'>>;
  groupTags?: Resolver<Array<ResolversTypes['GroupTag']>, ParentType, ContextType, RequireFields<QueryGroupTagsArgs, 'groupId'>>;
  groups?: Resolver<ResolversTypes['GroupPage'], ParentType, ContextType, Partial<QueryGroupsArgs>>;
  organizations?: Resolver<ResolversTypes['OrganizationPage'], ParentType, ContextType, RequireFields<QueryOrganizationsArgs, 'limit' | 'page'>>;
  permissionTags?: Resolver<Array<ResolversTypes['PermissionTag']>, ParentType, ContextType, RequireFields<QueryPermissionTagsArgs, 'permissionId'>>;
  permissions?: Resolver<ResolversTypes['PermissionPage'], ParentType, ContextType, Partial<QueryPermissionsArgs>>;
  projects?: Resolver<ResolversTypes['ProjectPage'], ParentType, ContextType, RequireFields<QueryProjectsArgs, 'limit' | 'page'>>;
  roleGroups?: Resolver<Array<ResolversTypes['RoleGroup']>, ParentType, ContextType, RequireFields<QueryRoleGroupsArgs, 'roleId'>>;
  roleTags?: Resolver<Array<ResolversTypes['RoleTag']>, ParentType, ContextType, RequireFields<QueryRoleTagsArgs, 'roleId'>>;
  roles?: Resolver<ResolversTypes['RolePage'], ParentType, ContextType, Partial<QueryRolesArgs>>;
  tags?: Resolver<ResolversTypes['TagPage'], ParentType, ContextType, Partial<QueryTagsArgs>>;
  userRoles?: Resolver<Array<ResolversTypes['UserRole']>, ParentType, ContextType, RequireFields<QueryUserRolesArgs, 'userId'>>;
  userTags?: Resolver<Array<ResolversTypes['UserTag']>, ParentType, ContextType, RequireFields<QueryUserTagsArgs, 'userId'>>;
  users?: Resolver<ResolversTypes['UserPage'], ParentType, ContextType, Partial<QueryUsersArgs>>;
}>;

export type RoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleGroupResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RoleGroup'] = ResolversParentTypes['RoleGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
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
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
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
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
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
  OrganizationPage?: OrganizationPageResolvers<ContextType>;
  PaginatedResults?: PaginatedResultsResolvers<ContextType>;
  Permission?: PermissionResolvers<ContextType>;
  PermissionPage?: PermissionPageResolvers<ContextType>;
  PermissionTag?: PermissionTagResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectPage?: ProjectPageResolvers<ContextType>;
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

