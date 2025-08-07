import { MutationResolvers } from '@/graphql/generated/types';

export const addOrganizationPermissionResolver: MutationResolvers['addOrganizationPermission'] =
  async (_parent, { input }, context) => {
    const organizationPermission =
      await context.providers.organizationPermissions.addOrganizationPermission({
        input,
      });
    return organizationPermission;
  };
