import { QueryResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { OrganizationModel } from '@/graphql/repositories/organizations/schema';

export const getOrganizationsResolver: QueryResolvers['organizations'] = async (
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
