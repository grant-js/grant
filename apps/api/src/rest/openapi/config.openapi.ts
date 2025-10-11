import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import {
  authTokensSchema,
  authenticationErrorResponseSchema,
  errorResponseSchema,
  loginRequestSchema,
  loginResultSchema,
  logoutRequestSchema,
  logoutResultSchema,
  notFoundErrorResponseSchema,
  refreshSessionRequestSchema,
  registerRequestSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';

import { registerAccountsOpenApi } from './accounts.openapi';
import { registerAuthEndpoints } from './auth.openapi';
import { registerOrganizationsOpenApi } from './organizations.openapi';
import { registerRolesOpenApi } from './roles.openapi';
import { registerUserEndpoints } from './users.openapi';

/**
 * OpenAPI registry for the REST API
 * Defines all endpoints, request/response schemas, and metadata
 */
export const registry = new OpenAPIRegistry();

/**
 * Register common component schemas that can be reused across endpoints
 */
function registerCommonSchemas() {
  registry.register('ErrorResponse', errorResponseSchema);
  registry.register('ValidationErrorResponse', validationErrorResponseSchema);
  registry.register('AuthenticationErrorResponse', authenticationErrorResponseSchema);

  registry.register('LoginRequest', loginRequestSchema);
  registry.register('LoginResult', loginResultSchema);
  registry.register('RegisterRequest', registerRequestSchema);
  registry.register('AuthTokens', authTokensSchema);
  registry.register('RefreshSessionRequest', refreshSessionRequestSchema);
  registry.register('LogoutRequest', logoutRequestSchema);
  registry.register('LogoutResult', logoutResultSchema);
  registry.register('Not Found Error Response', notFoundErrorResponseSchema);
  registry.register('Validation Error Response', validationErrorResponseSchema);
}

/**
 * Register all API endpoints organized by module
 */
function registerAllEndpoints() {
  registerAuthEndpoints(registry);
  registerAccountsOpenApi(registry);
  registerUserEndpoints(registry);
  registerOrganizationsOpenApi(registry);
  registerRolesOpenApi(registry);
}

/**
 * Initialize the OpenAPI registry with all schemas and endpoints
 */
export function initializeOpenApiRegistry() {
  registerCommonSchemas();
  registerAllEndpoints();
  return registry;
}

/**
 * Generate the complete OpenAPI document
 */
export function generateOpenApiDocument() {
  initializeOpenApiRegistry();

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Grant Platform REST API',
      description:
        'REST API for the Grant Platform - An open-source identity and access management system',
      contact: {
        name: 'Grant Platform',
        url: 'https://github.com/logusgraphics/grant-platform',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local development server',
      },
      {
        url: 'https://api.grant.center',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management endpoints',
      },
      {
        name: 'Accounts',
        description: 'Account management endpoints (personal and organization accounts)',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Organizations',
        description: 'Organization management endpoints',
      },
      {
        name: 'Projects',
        description: 'Project management endpoints',
      },
      {
        name: 'Roles',
        description: 'Role management endpoints',
      },
      {
        name: 'Groups',
        description: 'Group management endpoints',
      },
      {
        name: 'Permissions',
        description: 'Permission management endpoints',
      },
      {
        name: 'Tags',
        description: 'Tag management endpoints',
      },
    ],
    externalDocs: {
      description: 'Find more info on GitHub',
      url: 'https://github.com/logusgraphics/grant-platform',
    },
  });
}
