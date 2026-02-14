import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { config } from '@/config';
import {
  authTokensSchema,
  authenticationErrorResponseSchema,
  errorResponseSchema,
  loginRequestSchema,
  loginResultSchema,
  logoutRequestSchema,
  logoutResultSchema,
  notFoundErrorResponseSchema,
  registerRequestSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';

import { registerApiKeysOpenApi } from './api-keys.openapi';
import { registerAuthEndpoints } from './auth.openapi';
import { registerGroupsOpenApi } from './groups.openapi';
import { registerMeEndpoints } from './me.openapi';
import { registerOrganizationInvitationsOpenApi } from './organization-invitations.openapi';
import { registerOrganizationMembersOpenApi } from './organization-members.openapi';
import { registerOrganizationsOpenApi } from './organizations.openapi';
import { registerPermissionsOpenApi } from './permissions.openapi';
import { registerProjectsOpenApi } from './projects.openapi';
import { registerResourcesOpenApi } from './resources.openapi';
import { registerRolesOpenApi } from './roles.openapi';
import { registerTagsOpenApi } from './tags.openapi';
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
  registerMeEndpoints(registry);
  registerApiKeysOpenApi(registry);
  registerUserEndpoints(registry);
  registerOrganizationsOpenApi(registry);
  registerOrganizationInvitationsOpenApi(registry);
  registerOrganizationMembersOpenApi(registry);
  registerProjectsOpenApi(registry);
  registerRolesOpenApi(registry);
  registerGroupsOpenApi(registry);
  registerPermissionsOpenApi(registry);
  registerResourcesOpenApi(registry);
  registerTagsOpenApi(registry);
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

  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Grant REST API',
      description: 'REST API for the Grant - An open-source identity and access management system',
      contact: {
        name: 'Grant',
        url: 'https://github.com/logusgraphics/grant',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: config.app.url,
        description: config.app.isProduction ? 'Production server' : 'Local development server',
      },
      ...(!config.app.isProduction
        ? [{ url: config.swagger.productionUrl, description: 'Production server' }]
        : []),
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management endpoints',
      },
      {
        name: 'Me',
        description: 'Self user management endpoints (profile, account, sessions, authentication)',
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
        name: 'Organization Invitations',
        description: 'Organization member invitation and onboarding endpoints',
      },
      {
        name: 'Organization Members',
        description: 'Organization member management endpoints',
      },
      {
        name: 'Projects',
        description: 'Project management endpoints',
      },
      {
        name: 'API Keys',
        description: 'API key management and authentication endpoints',
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
        name: 'Resources',
        description: 'Resource management endpoints for fine-grained access control',
      },
      {
        name: 'Tags',
        description: 'Tag management endpoints',
      },
    ],
    externalDocs: {
      description: 'Find more info on GitHub',
      url: 'https://github.com/logusgraphics/grant',
    },
  });

  return {
    ...document,
    security: [{ bearerAuth: [] }],
    components: {
      ...(document.components || {}),
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from authentication endpoints',
        },
      },
    },
  };
}
