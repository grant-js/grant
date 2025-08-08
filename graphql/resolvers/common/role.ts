import { ResolverFn } from '@/graphql/generated/types';
import { Tenant } from '@/graphql/generated/types';
import { Context } from '@/graphql/types';

/**
 * Common role field resolver that works for both organization and project contexts
 * Reusable across all organization-* and project-* resolvers
 */
export const createRoleFieldResolver =
  <T extends { roleId: string }>(
    scopeFactory: (parent: T) => { tenant: Tenant; id: string }
  ): ResolverFn<any, T, Context, any> =>
  async (parent, _args, context) => {
    // Get the role by roleId (optimized - no need to fetch all roles)
    const rolesResult = await context.providers.roles.getRoles({
      ids: [parent.roleId],
      scope: scopeFactory(parent),
      limit: -1,
    });

    const role = rolesResult.roles[0];

    if (!role) {
      throw new Error(`Role with ID ${parent.roleId} not found`);
    }

    return role;
  };

/**
 * Convenience function for organization role field resolvers
 */
export const createOrganizationRoleFieldResolver = <
  T extends { roleId: string; organizationId: string },
>() =>
  createRoleFieldResolver<T>((parent) => ({
    tenant: Tenant.Organization,
    id: parent.organizationId,
  }));

/**
 * Convenience function for project role field resolvers
 */
export const createProjectRoleFieldResolver = <T extends { roleId: string; projectId: string }>() =>
  createRoleFieldResolver<T>((parent) => ({
    tenant: Tenant.Project,
    id: parent.projectId,
  }));
