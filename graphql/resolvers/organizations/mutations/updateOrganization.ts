import { MutationResolvers } from '@/graphql/generated/types';

export const updateOrganizationResolver: MutationResolvers['updateOrganization'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedOrganization = await context.providers.organizations.updateOrganization({
    id,
    input,
  });
  return updatedOrganization;
};
