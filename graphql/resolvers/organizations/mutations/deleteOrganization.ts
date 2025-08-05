import { MutationResolvers } from '@/graphql/generated/types';

export const deleteOrganizationResolver: MutationResolvers['deleteOrganization'] = async (
  _parent,
  { id },
  context
) => {
  const deleted = await context.providers.organizations.deleteOrganization({ id });
  return deleted;
};
