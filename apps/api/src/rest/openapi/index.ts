/**
 * OpenAPI configuration and registry
 *
 * This module organizes OpenAPI endpoint definitions by domain:
 * - auth.openapi.ts: Authentication endpoints
 * - accounts.openapi.ts: Account management endpoints
 * - users.openapi.ts: User management endpoints
 * - organizations.openapi.ts: Organization endpoints
 * - projects.openapi.ts: Project endpoints
 * - roles.openapi.ts: Role endpoints
 * - groups.openapi.ts: Group endpoints
 * - permissions.openapi.ts: Permission endpoints
 * - tags.openapi.ts: Tag endpoints
 */

export { registerAccountsOpenApi } from './accounts.openapi';
export { registerAuthEndpoints } from './auth.openapi';
export { generateOpenApiDocument, initializeOpenApiRegistry, registry } from './config.openapi';
export { registerOrganizationsOpenApi } from './organizations.openapi';
export { registerRolesOpenApi } from './roles.openapi';
export { registerUserEndpoints } from './users.openapi';
