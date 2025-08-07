import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationPermissionResolver: MutationResolvers['removeOrganizationPermission'] =
  async (_parent, { input }, context) => {
    const success = await context.providers.organizationPermissions.removeOrganizationPermission({
      input,
    });
    return success;
  };
