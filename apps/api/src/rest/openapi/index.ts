/**
 * OpenAPI configuration and registry
 *
 * This module organizes OpenAPI endpoint definitions by domain:
 * - auth.openapi.ts: Authentication endpoints
 * - accounts.openapi.ts: Account management endpoints
 * - users.openapi.ts: User management endpoints
 * - organizations.openapi.ts: Organization endpoints
 * - organization-invitations.openapi.ts: Organization invitation endpoints
 * - organization-members.openapi.ts: Organization member endpoints
 * - projects.openapi.ts: Project endpoints
 * - roles.openapi.ts: Role endpoints
 * - groups.openapi.ts: Group endpoints
 * - permissions.openapi.ts: Permission endpoints
 * - tags.openapi.ts: Tag endpoints
 */

export { registerApiKeysOpenApi } from './api-keys.openapi';
export { registerAuthEndpoints } from './auth.openapi';
export { generateOpenApiDocument, initializeOpenApiRegistry, registry } from './config.openapi';
export { registerGroupsOpenApi } from './groups.openapi';
export { registerMeEndpoints } from './me.openapi';
export { registerOrganizationInvitationsOpenApi } from './organization-invitations.openapi';
export { registerOrganizationMembersOpenApi } from './organization-members.openapi';
export { registerOrganizationsOpenApi } from './organizations.openapi';
export { registerPermissionsOpenApi } from './permissions.openapi';
export { registerProjectsOpenApi } from './projects.openapi';
export { registerResourcesOpenApi } from './resources.openapi';
export { registerRolesOpenApi } from './roles.openapi';
export { registerTagsOpenApi } from './tags.openapi';
export { registerUserEndpoints } from './users.openapi';
