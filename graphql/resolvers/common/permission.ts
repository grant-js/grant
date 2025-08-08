import { ResolverFn } from '@/graphql/generated/types';
import { Tenant } from '@/graphql/generated/types';
import { Context } from '@/graphql/types';

/**
 * Common permission field resolver that works for both organization and project contexts
 * Reusable across all organization-* and project-* resolvers
 */
export const createPermissionFieldResolver =
  <T extends { permissionId: string }>(
    scopeFactory: (parent: T) => { tenant: Tenant; id: string }
  ): ResolverFn<any, T, Context, any> =>
  async (parent, _args, context) => {
    // Get the permission by permissionId (optimized - no need to fetch all permissions)
    const permissionsResult = await context.providers.permissions.getPermissions({
      ids: [parent.permissionId],
      scope: scopeFactory(parent),
      limit: -1,
    });

    const permission = permissionsResult.permissions[0];

    if (!permission) {
      throw new Error(`Permission with ID ${parent.permissionId} not found`);
    }

    return permission;
  };

/**
 * Convenience function for organization permission field resolvers
 */
export const createOrganizationPermissionFieldResolver = <
  T extends { permissionId: string; organizationId: string },
>() =>
  createPermissionFieldResolver<T>((parent) => ({
    tenant: Tenant.Organization,
    id: parent.organizationId,
  }));

/**
 * Convenience function for project permission field resolvers
 */
export const createProjectPermissionFieldResolver = <
  T extends { permissionId: string; projectId: string },
>() =>
  createPermissionFieldResolver<T>((parent) => ({
    tenant: Tenant.Project,
    id: parent.projectId,
  }));
