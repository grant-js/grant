import { OrganizationModel } from '@logusgraphics/grant-database';
import { QueryResolvers } from '@logusgraphics/grant-schema';

import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { GraphqlContext } from '@/graphql/types';

export const getOrganizationsResolver: QueryResolvers<GraphqlContext>['organizations'] = async (
  _parent,
  args,
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof OrganizationModel>(info, ['organizations']);

  return context.controllers.organizations.getOrganizations({
    ...args,
    requestedFields,
  });
};
