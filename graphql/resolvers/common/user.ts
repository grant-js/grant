import { ResolverFn } from '@/graphql/generated/types';
import { Tenant } from '@/graphql/generated/types';
import { Context } from '@/graphql/types';

/**
 * Common user field resolver that works for both organization and project contexts
 * Reusable across all organization-* and project-* resolvers
 */
export const createUserFieldResolver =
  <T extends { userId: string }>(
    scopeFactory: (parent: T) => { tenant: Tenant; id: string }
  ): ResolverFn<any, T, Context, any> =>
  async (parent, _args, context) => {
    // Get the user by userId (optimized - no need to fetch all users)
    const usersResult = await context.providers.users.getUsers({
      ids: [parent.userId],
      scope: scopeFactory(parent),
      limit: -1,
    });

    const user = usersResult.users[0];

    if (!user) {
      throw new Error(`User with ID ${parent.userId} not found`);
    }

    return user;
  };

/**
 * Convenience function for organization user field resolvers
 */
export const createOrganizationUserFieldResolver = <
  T extends { userId: string; organizationId: string },
>() =>
  createUserFieldResolver<T>((parent) => ({
    tenant: Tenant.Organization,
    id: parent.organizationId,
  }));

/**
 * Convenience function for project user field resolvers
 */
export const createProjectUserFieldResolver = <T extends { userId: string; projectId: string }>() =>
  createUserFieldResolver<T>((parent) => ({
    tenant: Tenant.Project,
    id: parent.projectId,
  }));
