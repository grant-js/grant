import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const login: MutationResolvers<GraphqlContext>['login'] = async (_, args, context) => {
  return context.controllers.accounts.login(args);
};
