import { QueryResolvers } from '@/graphql/generated/types';

export const getOrganizationsResolver: QueryResolvers['organizations'] = async (
  _parent,
  { page = 1, limit = 10, sort, search, ids },
  context
) => {
  const organizations = await context.providers.organizations.getOrganizations({
    limit,
    page,
    sort,
    search,
    ids,
  });
  return organizations;
};
