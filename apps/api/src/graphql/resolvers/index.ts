import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { Mutation } from '@/graphql/resolvers/mutations';
import { Query } from '@/graphql/resolvers/queries';
import { resolvers as scalarResolvers } from '@/graphql/resolvers/scalars';
import { ConfigurationError } from '@/lib/errors';

import { groupResolver as Group } from './groups/fields';
import { permissionResolver as Permission } from './permissions/fields';
import { projectAppResolver as ProjectApp } from './project-apps/fields';
import { resourceResolver as Resource } from './resources/fields';
import { rolePermissionResolver as RolePermission } from './role-permissions/fields';
import { roleResolver as Role } from './roles/fields';
import { userPermissionResolver as UserPermission } from './user-permissions/fields';
import { userResolver as User } from './users/fields';

function resolveGraphqlSchemaDir(): string {
  const candidates = [
    join(process.cwd(), '../../packages/@grantjs/schema/dist/schema'),
    join(process.cwd(), '../../packages/@grantjs/schema/src/schema'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }
  throw new ConfigurationError(
    'GraphQL schema directory not found (expected packages/@grantjs/schema/dist/schema or src/schema)'
  );
}

const typeDefs = loadFilesSync(resolveGraphqlSchemaDir(), {
  extensions: ['graphql'],
  ignoreIndex: true,
});

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: {
    ...scalarResolvers,
    Query,
    Mutation,
    User,
    Group,
    Role,
    RolePermission,
    UserPermission,
    Permission,
    ProjectApp,
    Resource,
  },
});
