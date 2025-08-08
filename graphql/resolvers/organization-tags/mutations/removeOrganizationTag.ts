import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationTagResolver: MutationResolvers['removeOrganizationTag'] = async (
  _parent,
  { input },
  context
) => {
  const success = await context.providers.organizationTags.removeOrganizationTag({
    input,
  });
  return success;
};
