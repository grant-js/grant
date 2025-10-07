import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteOrganizationResolver: MutationResolvers<GraphqlContext>['deleteOrganization'] =
  async (_parent, { id }, context) => {
    const deleted = await context.controllers.organizations.deleteOrganization({ id });
    return deleted;
  };
