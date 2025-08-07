import { QueryResolvers } from '@/graphql/generated/types';

export const getOrganizationPermissionsResolver: QueryResolvers['organizationPermissions'] = async (
  _parent,
  { organizationId },
  context
) => {
  const organizationPermissions =
    await context.providers.organizationPermissions.getOrganizationPermissions({
      organizationId,
    });
  return organizationPermissions;
};
