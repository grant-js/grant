import { ResolverFn } from '@/graphql/generated/types';
import { Tenant } from '@/graphql/generated/types';
import { Context } from '@/graphql/types';

/**
 * Common group field resolver that works for both organization and project contexts
 * Reusable across all organization-* and project-* resolvers
 */
export const createGroupFieldResolver =
  <T extends { groupId: string }>(
    scopeFactory: (parent: T) => { tenant: Tenant; id: string }
  ): ResolverFn<any, T, Context, any> =>
  async (parent, _args, context) => {
    // Get the group by groupId (optimized - no need to fetch all groups)
    const groupsResult = await context.providers.groups.getGroups({
      ids: [parent.groupId],
      scope: scopeFactory(parent),
      limit: -1,
    });

    const group = groupsResult.groups[0];

    if (!group) {
      throw new Error(`Group with ID ${parent.groupId} not found`);
    }

    return group;
  };

/**
 * Convenience function for organization group field resolvers
 */
export const createOrganizationGroupFieldResolver = <
  T extends { groupId: string; organizationId: string },
>() =>
  createGroupFieldResolver<T>((parent) => ({
    tenant: Tenant.Organization,
    id: parent.organizationId,
  }));

/**
 * Convenience function for project group field resolvers
 */
export const createProjectGroupFieldResolver = <
  T extends { groupId: string; projectId: string },
>() =>
  createGroupFieldResolver<T>((parent) => ({
    tenant: Tenant.Project,
    id: parent.projectId,
  }));
