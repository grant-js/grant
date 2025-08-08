import { ResolverFn } from '@/graphql/generated/types';
import { Context } from '@/graphql/types';

/**
 * Common organization field resolver for organization pivot types
 * Reusable across all organization-* resolvers (organization-users, organization-roles, etc.)
 */
export const createOrganizationFieldResolver =
  <T extends { organizationId: string }>(): ResolverFn<any, T, Context, any> =>
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
