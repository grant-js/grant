import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteOrganizationResolver: MutationResolvers<GraphqlContext>['deleteOrganization'] =
  async (_parent, { id }, context) => {
    const deleted = await context.handlers.organizations.deleteOrganization({ id });
    return deleted;
  };
