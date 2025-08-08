import { jwtProvider } from '@/graphql/providers/auth/jwt';
import { AuthDataProvider } from '@/graphql/providers/auth/types';
import { userFakerProvider } from '@/graphql/providers/users/faker';
import { UserDataProvider } from '@/graphql/providers/users/types';

import { groupPermissionFakerProvider } from './providers/group-permissions/faker';
import { GroupPermissionDataProvider } from './providers/group-permissions/types';
import { groupTagFakerProvider } from './providers/group-tags/faker';
import { GroupTagDataProvider } from './providers/group-tags/types';
import { groupFakerProvider } from './providers/groups/faker';
import { GroupDataProvider } from './providers/groups/types';
import { organizationGroupFakerProvider } from './providers/organization-groups/faker';
import { OrganizationGroupDataProvider } from './providers/organization-groups/types';
import { organizationPermissionFakerProvider } from './providers/organization-permissions/faker';
import { OrganizationPermissionDataProvider } from './providers/organization-permissions/types';
import { organizationProjectFakerProvider } from './providers/organization-projects/faker';
import { OrganizationProjectDataProvider } from './providers/organization-projects/types';
import { organizationRoleFakerProvider } from './providers/organization-roles/faker';
import { OrganizationRoleDataProvider } from './providers/organization-roles/types';
import { organizationTagFakerProvider } from './providers/organization-tags/faker';
import { OrganizationTagDataProvider } from './providers/organization-tags/types';
import { organizationUserFakerProvider } from './providers/organization-users/faker';
import { OrganizationUserDataProvider } from './providers/organization-users/types';
import { organizationFakerProvider } from './providers/organizations/faker';
import { OrganizationDataProvider } from './providers/organizations/types';
import { permissionTagFakerProvider } from './providers/permission-tags/faker';
import { PermissionTagDataProvider } from './providers/permission-tags/types';
import { permissionFakerProvider } from './providers/permissions/faker';
import { PermissionDataProvider } from './providers/permissions/types';
import { projectGroupFakerProvider } from './providers/project-groups/faker';
import { ProjectGroupDataProvider } from './providers/project-groups/types';
import { projectPermissionFakerProvider } from './providers/project-permissions/faker';
import { ProjectPermissionDataProvider } from './providers/project-permissions/types';
import { projectRoleFakerProvider } from './providers/project-roles/faker';
import { ProjectRoleDataProvider } from './providers/project-roles/types';
import { projectTagFakerProvider } from './providers/project-tags/faker';
import { ProjectTagDataProvider } from './providers/project-tags/types';
import { projectUserFakerProvider } from './providers/project-users/faker';
import { ProjectUserDataProvider } from './providers/project-users/types';
import { projectFakerProvider } from './providers/projects/faker';
import { ProjectDataProvider } from './providers/projects/types';
import { roleGroupFakerProvider } from './providers/role-groups/faker';
import { RoleGroupDataProvider } from './providers/role-groups/types';
import { roleTagFakerProvider } from './providers/role-tags/faker';
import { RoleTagDataProvider } from './providers/role-tags/types';
import { roleFakerProvider } from './providers/roles/faker';
import { RoleDataProvider } from './providers/roles/types';
import { tagFakerProvider } from './providers/tags/faker';
import { TagDataProvider } from './providers/tags/types';
import { userRoleFakerProvider } from './providers/user-roles/faker';
import { UserRoleDataProvider } from './providers/user-roles/types';
import { userTagFakerProvider } from './providers/user-tags/faker';
import { UserTagDataProvider } from './providers/user-tags/types';

export interface ModuleProviders {
  auth: AuthDataProvider;
  users: UserDataProvider;
  roles: RoleDataProvider;
  groups: GroupDataProvider;
  organizations: OrganizationDataProvider;
  organizationProjects: OrganizationProjectDataProvider;
  organizationRoles: OrganizationRoleDataProvider;
  organizationGroups: OrganizationGroupDataProvider;
  organizationPermissions: OrganizationPermissionDataProvider;
  organizationUsers: OrganizationUserDataProvider;
  organizationTags: OrganizationTagDataProvider;
  projects: ProjectDataProvider;
  projectRoles: ProjectRoleDataProvider;
  projectGroups: ProjectGroupDataProvider;
  projectPermissions: ProjectPermissionDataProvider;
  projectUsers: ProjectUserDataProvider;
  projectTags: ProjectTagDataProvider;
  permissions: PermissionDataProvider;
  userRoles: UserRoleDataProvider;
  roleGroups: RoleGroupDataProvider;
  groupPermissions: GroupPermissionDataProvider;
  tags: TagDataProvider;
  userTags: UserTagDataProvider;
  roleTags: RoleTagDataProvider;
  groupTags: GroupTagDataProvider;
  permissionTags: PermissionTagDataProvider;
  // Add other modules here as we create them
}

export interface GraphQLConfig {
  providers: ModuleProviders;
}

// Default configuration using faker providers for users and JWT for auth
export const graphqlConfig: GraphQLConfig = {
  providers: {
    auth: jwtProvider,
    users: userFakerProvider,
    roles: roleFakerProvider,
    groups: groupFakerProvider,
    organizations: organizationFakerProvider,
    organizationProjects: organizationProjectFakerProvider,
    organizationRoles: organizationRoleFakerProvider,
    organizationGroups: organizationGroupFakerProvider,
    organizationPermissions: organizationPermissionFakerProvider,
    organizationUsers: organizationUserFakerProvider,
    organizationTags: organizationTagFakerProvider,
    projects: projectFakerProvider,
    projectRoles: projectRoleFakerProvider,
    projectGroups: projectGroupFakerProvider,
    projectPermissions: projectPermissionFakerProvider,
    projectUsers: projectUserFakerProvider,
    projectTags: projectTagFakerProvider,
    permissions: permissionFakerProvider,
    userRoles: userRoleFakerProvider,
    roleGroups: roleGroupFakerProvider,
    groupPermissions: groupPermissionFakerProvider,
    tags: tagFakerProvider,
    userTags: userTagFakerProvider,
    roleTags: roleTagFakerProvider,
    groupTags: groupTagFakerProvider,
    permissionTags: permissionTagFakerProvider,
  },
};
