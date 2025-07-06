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

export interface ModuleProviders {
  auth: AuthDataProvider;
  users: UserDataProvider;
  roles: RoleDataProvider;
  groups: GroupDataProvider;
  permissions: PermissionDataProvider;
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
  },
};
