import { MutationResolvers } from '@/graphql/generated/types';

export const addOrganizationTagResolver: MutationResolvers['addOrganizationTag'] = async (
  _parent,
  { input },
  context
) => {
  const organizationTag = await context.providers.organizationTags.addOrganizationTag({
    input,
  });
  return organizationTag;
};
