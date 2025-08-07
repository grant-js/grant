import { OrganizationRoleResolvers } from '@/graphql/generated/types';

export const organizationRoleOrganizationResolver: OrganizationRoleResolvers['organization'] =
  async (parent, _args, context) => {
    // Get the organization by organizationId (optimized - no need to fetch all organizations)
    const organizationsResult = await context.providers.organizations.getOrganizations({
      ids: [parent.organizationId],
    });

    const organization = organizationsResult.organizations[0];

    if (!organization) {
      throw new Error(`Organization with ID ${parent.organizationId} not found`);
    }

    return organization;
  };
