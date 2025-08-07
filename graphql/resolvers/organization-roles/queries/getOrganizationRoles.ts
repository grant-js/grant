import { QueryResolvers } from '@/graphql/generated/types';

export const getOrganizationRolesResolver: QueryResolvers['organizationRoles'] = async (
  _parent,
  { organizationId },
  context
) => {
  const organizationRoles = await context.providers.organizationRoles.getOrganizationRoles({
    organizationId,
  });
  return organizationRoles.organizationRoles;
};
