import { AuthDataProvider } from '@/graphql/resolvers/auth/providers/types';
import { UserDataProvider } from '@/graphql/resolvers/users/providers/types';
import { userFakerProvider } from '@/graphql/resolvers/users/providers/faker';
import { jwtProvider } from '@/graphql/resolvers/auth/providers/jwt';
import { RoleDataProvider } from './resolvers/roles/providers/types';
import { roleFakerProvider } from './resolvers/roles/providers/faker';
import { GroupDataProvider } from './resolvers/groups/providers/types';
import { PermissionDataProvider } from './resolvers/permissions/providers/types';
import { groupFakerProvider } from './resolvers/groups/providers/faker';
import { permissionFakerProvider } from './resolvers/permissions/providers/faker';

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
