import { join } from 'path';

import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { Mutation } from '@/graphql/resolvers/mutations';
import { Query } from '@/graphql/resolvers/queries';
import { resolvers as scalarResolvers } from '@/graphql/resolvers/scalars';

import { groupResolver as Group } from './groups/fields';
import { permissionResolver as Permission } from './permissions/fields';
import { roleResolver as Role } from './roles/fields';
import { userResolver as User } from './users/fields';

const typeDefs = loadFilesSync(join(process.cwd(), 'graphql/schema'), {
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
    Permission,
  },
});
