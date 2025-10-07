/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query CheckUsername($username: String!) {\n  checkUsername(username: $username) {\n    available\n    username\n  }\n}": typeof types.CheckUsernameDocument,
    "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n    refreshToken\n    accounts {\n      id\n      name\n      slug\n      type\n    }\n  }\n}": typeof types.LoginDocument,
    "mutation RefreshSession($accessToken: String!, $refreshToken: String!) {\n  refreshSession(accessToken: $accessToken, refreshToken: $refreshToken) {\n    accessToken\n    refreshToken\n  }\n}": typeof types.RefreshSessionDocument,
    "mutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    refreshToken\n    account {\n      id\n      name\n      slug\n      type\n    }\n  }\n}": typeof types.RegisterDocument,
    "mutation CreateGroup($input: CreateGroupInput!) {\n  createGroup(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.CreateGroupDocument,
    "mutation DeleteGroup($id: ID!, $scope: Scope!) {\n  deleteGroup(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.DeleteGroupDocument,
    "query GetGroups($scope: Scope!, $page: Int, $limit: Int, $sort: GroupSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  groups(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    groups {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      permissions {\n        id\n        name\n        action\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": typeof types.GetGroupsDocument,
    "mutation UpdateGroup($id: ID!, $input: UpdateGroupInput!) {\n  updateGroup(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.UpdateGroupDocument,
    "mutation CreateOrganization($input: CreateOrganizationInput!) {\n  createOrganization(input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}": typeof types.CreateOrganizationDocument,
    "mutation DeleteOrganization($id: ID!) {\n  deleteOrganization(id: $id) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}": typeof types.DeleteOrganizationDocument,
    "query GetOrganizations($page: Int, $limit: Int, $sort: OrganizationSortInput, $search: String, $ids: [ID!]) {\n  organizations(\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    organizations {\n      id\n      name\n      slug\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": typeof types.GetOrganizationsDocument,
    "mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {\n  updateOrganization(id: $id, input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}": typeof types.UpdateOrganizationDocument,
    "mutation CreatePermission($input: CreatePermissionInput!) {\n  createPermission(input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.CreatePermissionDocument,
    "mutation DeletePermission($id: ID!, $scope: Scope!) {\n  deletePermission(id: $id, scope: $scope) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.DeletePermissionDocument,
    "query GetPermissions($scope: Scope!, $page: Int, $limit: Int, $sort: PermissionSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  permissions(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    permissions {\n      id\n      name\n      action\n      description\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}": typeof types.GetPermissionsDocument,
    "mutation UpdatePermission($id: ID!, $input: UpdatePermissionInput!) {\n  updatePermission(id: $id, input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.UpdatePermissionDocument,
    "mutation CreateProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.CreateProjectDocument,
    "mutation DeleteProject($id: ID!, $scope: Scope!) {\n  deleteProject(id: $id, scope: $scope) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.DeleteProjectDocument,
    "query GetProjects($scope: Scope!, $page: Int, $limit: Int, $sort: ProjectSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  projects(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    projects {\n      id\n      name\n      slug\n      description\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": typeof types.GetProjectsDocument,
    "mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n  updateProject(id: $id, input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.UpdateProjectDocument,
    "mutation CreateRole($input: CreateRoleInput!) {\n  createRole(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.CreateRoleDocument,
    "mutation DeleteRole($id: ID!, $scope: Scope!) {\n  deleteRole(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.DeleteRoleDocument,
    "query GetRoles($scope: Scope!, $page: Int, $limit: Int, $sort: RoleSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  roles(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    roles {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      groups {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": typeof types.GetRolesDocument,
    "mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {\n  updateRole(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": typeof types.UpdateRoleDocument,
    "mutation CreateTag($input: CreateTagInput!) {\n  createTag(input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}": typeof types.CreateTagDocument,
    "mutation DeleteTag($id: ID!, $scope: Scope!) {\n  deleteTag(id: $id, scope: $scope) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}": typeof types.DeleteTagDocument,
    "query GetTags($scope: Scope!, $page: Int, $limit: Int, $sort: TagSortInput, $search: String, $ids: [ID!]) {\n  tags(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    tags {\n      id\n      name\n      color\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}": typeof types.GetTagsDocument,
    "mutation UpdateTag($id: ID!, $input: UpdateTagInput!) {\n  updateTag(id: $id, input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}": typeof types.UpdateTagDocument,
    "mutation CreateUser($input: CreateUserInput!) {\n  createUser(input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}": typeof types.CreateUserDocument,
    "mutation DeleteUser($id: ID!, $scope: Scope!) {\n  deleteUser(id: $id, scope: $scope) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}": typeof types.DeleteUserDocument,
    "query GetUsers($scope: Scope!, $page: Int, $limit: Int, $sort: UserSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  users(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    users {\n      id\n      name\n      createdAt\n      updatedAt\n      roles {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": typeof types.GetUsersDocument,
    "mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {\n  updateUser(id: $id, input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}": typeof types.UpdateUserDocument,
};
const documents: Documents = {
    "query CheckUsername($username: String!) {\n  checkUsername(username: $username) {\n    available\n    username\n  }\n}": types.CheckUsernameDocument,
    "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n    refreshToken\n    accounts {\n      id\n      name\n      slug\n      type\n    }\n  }\n}": types.LoginDocument,
    "mutation RefreshSession($accessToken: String!, $refreshToken: String!) {\n  refreshSession(accessToken: $accessToken, refreshToken: $refreshToken) {\n    accessToken\n    refreshToken\n  }\n}": types.RefreshSessionDocument,
    "mutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    refreshToken\n    account {\n      id\n      name\n      slug\n      type\n    }\n  }\n}": types.RegisterDocument,
    "mutation CreateGroup($input: CreateGroupInput!) {\n  createGroup(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": types.CreateGroupDocument,
    "mutation DeleteGroup($id: ID!, $scope: Scope!) {\n  deleteGroup(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": types.DeleteGroupDocument,
    "query GetGroups($scope: Scope!, $page: Int, $limit: Int, $sort: GroupSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  groups(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    groups {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      permissions {\n        id\n        name\n        action\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": types.GetGroupsDocument,
    "mutation UpdateGroup($id: ID!, $input: UpdateGroupInput!) {\n  updateGroup(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": types.UpdateGroupDocument,
    "mutation CreateOrganization($input: CreateOrganizationInput!) {\n  createOrganization(input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}": types.CreateOrganizationDocument,
    "mutation DeleteOrganization($id: ID!) {\n  deleteOrganization(id: $id) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}": types.DeleteOrganizationDocument,
    "query GetOrganizations($page: Int, $limit: Int, $sort: OrganizationSortInput, $search: String, $ids: [ID!]) {\n  organizations(\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    organizations {\n      id\n      name\n      slug\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": types.GetOrganizationsDocument,
    "mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {\n  updateOrganization(id: $id, input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}": types.UpdateOrganizationDocument,
    "mutation CreatePermission($input: CreatePermissionInput!) {\n  createPermission(input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}": types.CreatePermissionDocument,
    "mutation DeletePermission($id: ID!, $scope: Scope!) {\n  deletePermission(id: $id, scope: $scope) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}": types.DeletePermissionDocument,
    "query GetPermissions($scope: Scope!, $page: Int, $limit: Int, $sort: PermissionSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  permissions(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    permissions {\n      id\n      name\n      action\n      description\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}": types.GetPermissionsDocument,
    "mutation UpdatePermission($id: ID!, $input: UpdatePermissionInput!) {\n  updatePermission(id: $id, input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}": types.UpdatePermissionDocument,
    "mutation CreateProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}": types.CreateProjectDocument,
    "mutation DeleteProject($id: ID!, $scope: Scope!) {\n  deleteProject(id: $id, scope: $scope) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}": types.DeleteProjectDocument,
    "query GetProjects($scope: Scope!, $page: Int, $limit: Int, $sort: ProjectSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  projects(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    projects {\n      id\n      name\n      slug\n      description\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": types.GetProjectsDocument,
    "mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n  updateProject(id: $id, input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}": types.UpdateProjectDocument,
    "mutation CreateRole($input: CreateRoleInput!) {\n  createRole(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": types.CreateRoleDocument,
    "mutation DeleteRole($id: ID!, $scope: Scope!) {\n  deleteRole(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": types.DeleteRoleDocument,
    "query GetRoles($scope: Scope!, $page: Int, $limit: Int, $sort: RoleSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  roles(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    roles {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      groups {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": types.GetRolesDocument,
    "mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {\n  updateRole(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}": types.UpdateRoleDocument,
    "mutation CreateTag($input: CreateTagInput!) {\n  createTag(input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}": types.CreateTagDocument,
    "mutation DeleteTag($id: ID!, $scope: Scope!) {\n  deleteTag(id: $id, scope: $scope) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}": types.DeleteTagDocument,
    "query GetTags($scope: Scope!, $page: Int, $limit: Int, $sort: TagSortInput, $search: String, $ids: [ID!]) {\n  tags(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    tags {\n      id\n      name\n      color\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}": types.GetTagsDocument,
    "mutation UpdateTag($id: ID!, $input: UpdateTagInput!) {\n  updateTag(id: $id, input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}": types.UpdateTagDocument,
    "mutation CreateUser($input: CreateUserInput!) {\n  createUser(input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}": types.CreateUserDocument,
    "mutation DeleteUser($id: ID!, $scope: Scope!) {\n  deleteUser(id: $id, scope: $scope) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}": types.DeleteUserDocument,
    "query GetUsers($scope: Scope!, $page: Int, $limit: Int, $sort: UserSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  users(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    users {\n      id\n      name\n      createdAt\n      updatedAt\n      roles {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}": types.GetUsersDocument,
    "mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {\n  updateUser(id: $id, input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}": types.UpdateUserDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query CheckUsername($username: String!) {\n  checkUsername(username: $username) {\n    available\n    username\n  }\n}"): (typeof documents)["query CheckUsername($username: String!) {\n  checkUsername(username: $username) {\n    available\n    username\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n    refreshToken\n    accounts {\n      id\n      name\n      slug\n      type\n    }\n  }\n}"): (typeof documents)["mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n    refreshToken\n    accounts {\n      id\n      name\n      slug\n      type\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation RefreshSession($accessToken: String!, $refreshToken: String!) {\n  refreshSession(accessToken: $accessToken, refreshToken: $refreshToken) {\n    accessToken\n    refreshToken\n  }\n}"): (typeof documents)["mutation RefreshSession($accessToken: String!, $refreshToken: String!) {\n  refreshSession(accessToken: $accessToken, refreshToken: $refreshToken) {\n    accessToken\n    refreshToken\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    refreshToken\n    account {\n      id\n      name\n      slug\n      type\n    }\n  }\n}"): (typeof documents)["mutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    refreshToken\n    account {\n      id\n      name\n      slug\n      type\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateGroup($input: CreateGroupInput!) {\n  createGroup(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation CreateGroup($input: CreateGroupInput!) {\n  createGroup(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation DeleteGroup($id: ID!, $scope: Scope!) {\n  deleteGroup(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation DeleteGroup($id: ID!, $scope: Scope!) {\n  deleteGroup(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetGroups($scope: Scope!, $page: Int, $limit: Int, $sort: GroupSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  groups(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    groups {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      permissions {\n        id\n        name\n        action\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"): (typeof documents)["query GetGroups($scope: Scope!, $page: Int, $limit: Int, $sort: GroupSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  groups(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    groups {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      permissions {\n        id\n        name\n        action\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateGroup($id: ID!, $input: UpdateGroupInput!) {\n  updateGroup(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation UpdateGroup($id: ID!, $input: UpdateGroupInput!) {\n  updateGroup(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateOrganization($input: CreateOrganizationInput!) {\n  createOrganization(input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation CreateOrganization($input: CreateOrganizationInput!) {\n  createOrganization(input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation DeleteOrganization($id: ID!) {\n  deleteOrganization(id: $id) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation DeleteOrganization($id: ID!) {\n  deleteOrganization(id: $id) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetOrganizations($page: Int, $limit: Int, $sort: OrganizationSortInput, $search: String, $ids: [ID!]) {\n  organizations(\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    organizations {\n      id\n      name\n      slug\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"): (typeof documents)["query GetOrganizations($page: Int, $limit: Int, $sort: OrganizationSortInput, $search: String, $ids: [ID!]) {\n  organizations(\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    organizations {\n      id\n      name\n      slug\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {\n  updateOrganization(id: $id, input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {\n  updateOrganization(id: $id, input: $input) {\n    id\n    name\n    slug\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreatePermission($input: CreatePermissionInput!) {\n  createPermission(input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation CreatePermission($input: CreatePermissionInput!) {\n  createPermission(input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation DeletePermission($id: ID!, $scope: Scope!) {\n  deletePermission(id: $id, scope: $scope) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation DeletePermission($id: ID!, $scope: Scope!) {\n  deletePermission(id: $id, scope: $scope) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetPermissions($scope: Scope!, $page: Int, $limit: Int, $sort: PermissionSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  permissions(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    permissions {\n      id\n      name\n      action\n      description\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}"): (typeof documents)["query GetPermissions($scope: Scope!, $page: Int, $limit: Int, $sort: PermissionSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  permissions(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    permissions {\n      id\n      name\n      action\n      description\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdatePermission($id: ID!, $input: UpdatePermissionInput!) {\n  updatePermission(id: $id, input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation UpdatePermission($id: ID!, $input: UpdatePermissionInput!) {\n  updatePermission(id: $id, input: $input) {\n    id\n    name\n    action\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation CreateProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation DeleteProject($id: ID!, $scope: Scope!) {\n  deleteProject(id: $id, scope: $scope) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation DeleteProject($id: ID!, $scope: Scope!) {\n  deleteProject(id: $id, scope: $scope) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetProjects($scope: Scope!, $page: Int, $limit: Int, $sort: ProjectSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  projects(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    projects {\n      id\n      name\n      slug\n      description\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"): (typeof documents)["query GetProjects($scope: Scope!, $page: Int, $limit: Int, $sort: ProjectSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  projects(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    projects {\n      id\n      name\n      slug\n      description\n      createdAt\n      updatedAt\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n  updateProject(id: $id, input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {\n  updateProject(id: $id, input: $input) {\n    id\n    name\n    slug\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateRole($input: CreateRoleInput!) {\n  createRole(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation CreateRole($input: CreateRoleInput!) {\n  createRole(input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation DeleteRole($id: ID!, $scope: Scope!) {\n  deleteRole(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation DeleteRole($id: ID!, $scope: Scope!) {\n  deleteRole(id: $id, scope: $scope) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetRoles($scope: Scope!, $page: Int, $limit: Int, $sort: RoleSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  roles(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    roles {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      groups {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"): (typeof documents)["query GetRoles($scope: Scope!, $page: Int, $limit: Int, $sort: RoleSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  roles(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    roles {\n      id\n      name\n      description\n      createdAt\n      updatedAt\n      groups {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {\n  updateRole(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {\n  updateRole(id: $id, input: $input) {\n    id\n    name\n    description\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateTag($input: CreateTagInput!) {\n  createTag(input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation CreateTag($input: CreateTagInput!) {\n  createTag(input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation DeleteTag($id: ID!, $scope: Scope!) {\n  deleteTag(id: $id, scope: $scope) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation DeleteTag($id: ID!, $scope: Scope!) {\n  deleteTag(id: $id, scope: $scope) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetTags($scope: Scope!, $page: Int, $limit: Int, $sort: TagSortInput, $search: String, $ids: [ID!]) {\n  tags(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    tags {\n      id\n      name\n      color\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}"): (typeof documents)["query GetTags($scope: Scope!, $page: Int, $limit: Int, $sort: TagSortInput, $search: String, $ids: [ID!]) {\n  tags(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n  ) {\n    tags {\n      id\n      name\n      color\n      createdAt\n      updatedAt\n    }\n    totalCount\n    hasNextPage\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateTag($id: ID!, $input: UpdateTagInput!) {\n  updateTag(id: $id, input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation UpdateTag($id: ID!, $input: UpdateTagInput!) {\n  updateTag(id: $id, input: $input) {\n    id\n    name\n    color\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateUser($input: CreateUserInput!) {\n  createUser(input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation CreateUser($input: CreateUserInput!) {\n  createUser(input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation DeleteUser($id: ID!, $scope: Scope!) {\n  deleteUser(id: $id, scope: $scope) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation DeleteUser($id: ID!, $scope: Scope!) {\n  deleteUser(id: $id, scope: $scope) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetUsers($scope: Scope!, $page: Int, $limit: Int, $sort: UserSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  users(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    users {\n      id\n      name\n      createdAt\n      updatedAt\n      roles {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"): (typeof documents)["query GetUsers($scope: Scope!, $page: Int, $limit: Int, $sort: UserSortInput, $search: String, $ids: [ID!], $tagIds: [ID!]) {\n  users(\n    scope: $scope\n    page: $page\n    limit: $limit\n    sort: $sort\n    search: $search\n    ids: $ids\n    tagIds: $tagIds\n  ) {\n    users {\n      id\n      name\n      createdAt\n      updatedAt\n      roles {\n        id\n        name\n        tags {\n          id\n          name\n          color\n          isPrimary\n        }\n      }\n      tags {\n        id\n        name\n        color\n        isPrimary\n      }\n    }\n    totalCount\n    hasNextPage\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {\n  updateUser(id: $id, input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {\n  updateUser(id: $id, input: $input) {\n    id\n    name\n    createdAt\n    updatedAt\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;