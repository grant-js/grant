import { AuthDataProvider } from '@/graphql/providers/auth/types';
import { UserDataProvider } from '@/graphql/providers/users/types';
import { userFakerProvider } from '@/graphql/providers/users/faker';
import { jwtProvider } from '@/graphql/providers/auth/jwt';
import { RoleDataProvider } from './providers/roles/types';
import { roleFakerProvider } from './providers/roles/faker';
import { GroupDataProvider } from './providers/groups/types';
import { PermissionDataProvider } from './providers/permissions/types';
import { groupFakerProvider } from './providers/groups/faker';
import { permissionFakerProvider } from './providers/permissions/faker';
import { UserRoleDataProvider } from './providers/user-roles/types';
import { userRoleFakerProvider } from './providers/user-roles/faker';
import { RoleGroupDataProvider } from './providers/role-groups/types';
import { roleGroupFakerProvider } from './providers/role-groups/faker';
import { GroupPermissionDataProvider } from './providers/group-permissions/types';
import { groupPermissionFakerProvider } from './providers/group-permissions/faker';
import { TagDataProvider } from './providers/tags/types';
import { tagFakerProvider } from './providers/tags/faker';
import { UserTagDataProvider } from './providers/user-tags/types';
import { userTagFakerProvider } from './providers/user-tags/faker';
import { RoleTagDataProvider } from './providers/role-tags/types';
import { roleTagFakerProvider } from './providers/role-tags/faker';
import { GroupTagDataProvider } from './providers/group-tags/types';
import { groupTagFakerProvider } from './providers/group-tags/faker';

export interface ModuleProviders {
  auth: AuthDataProvider;
  users: UserDataProvider;
  roles: RoleDataProvider;
  groups: GroupDataProvider;
  permissions: PermissionDataProvider;
  userRoles: UserRoleDataProvider;
  roleGroups: RoleGroupDataProvider;
  groupPermissions: GroupPermissionDataProvider;
  tags: TagDataProvider;
  userTags: UserTagDataProvider;
  roleTags: RoleTagDataProvider;
  groupTags: GroupTagDataProvider;
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
    permissions: permissionFakerProvider,
    userRoles: userRoleFakerProvider,
    roleGroups: roleGroupFakerProvider,
    groupPermissions: groupPermissionFakerProvider,
    tags: tagFakerProvider,
    userTags: userTagFakerProvider,
    roleTags: roleTagFakerProvider,
    groupTags: groupTagFakerProvider,
  },
};
