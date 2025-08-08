import { Scope, Tenant } from '@/graphql/generated/types';

/**
 * Default organization ID for the current application.
 * In a real application, this would come from user context, URL parameters, or authentication.
 */
const DEFAULT_ORGANIZATION_ID = '1';

/**
 * Default project ID for the current application.
 * In a real application, this would come from user context, URL parameters, or authentication.
 */
const DEFAULT_PROJECT_ID = '1';

/**
 * Creates a scope for organization-level queries.
 */
export function createOrganizationScope(organizationId: string = DEFAULT_ORGANIZATION_ID): Scope {
  return {
    tenant: Tenant.Organization,
    id: organizationId,
  };
}

/**
 * Creates a scope for project-level queries.
 */
export function createProjectScope(projectId: string = DEFAULT_PROJECT_ID): Scope {
  return {
    tenant: Tenant.Project,
    id: projectId,
  };
}

/**
 * Gets the default organization scope for the current application.
 * This is a temporary solution until proper multi-tenant context is implemented.
 */
export function getDefaultOrganizationScope(): Scope {
  return createOrganizationScope();
}

/**
 * Gets the default project scope for the current application.
 * This is a temporary solution until proper multi-tenant context is implemented.
 */
export function getDefaultProjectScope(): Scope {
  return createProjectScope();
}
