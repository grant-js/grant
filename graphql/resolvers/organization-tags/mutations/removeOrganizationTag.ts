import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationTagResolver: MutationResolvers['removeOrganizationTag'] = async (
  _parent,
  { input },
  context
) => {
  const removedOrganizationTag = await context.providers.organizationTags.removeOrganizationTag({
    input,
  });
  return removedOrganizationTag;
};
