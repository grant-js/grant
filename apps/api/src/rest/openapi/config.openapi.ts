import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { config } from '@/config';
import {
  authenticationErrorResponseSchema,
  authTokensSchema,
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
import { registerJwksOpenApi } from './jwks.openapi';
import { registerMeEndpoints } from './me.openapi';
import { registerOrganizationInvitationsOpenApi } from './organization-invitations.openapi';
import { registerOrganizationMembersOpenApi } from './organization-members.openapi';
import { registerOrganizationsOpenApi } from './organizations.openapi';
import { registerPermissionsOpenApi } from './permissions.openapi';
import { registerProjectAppsOpenApi } from './project-apps.openapi';
import { registerProjectsOpenApi } from './projects.openapi';
import { registerResourcesOpenApi } from './resources.openapi';
import { registerRolesOpenApi } from './roles.openapi';
import { registerRuntimeConfigOpenApi } from './runtime-config.openapi';
import { registerSigningKeysOpenApi } from './signing-keys.openapi';
import { registerTagsOpenApi } from './tags.openapi';
import { registerUserEndpoints } from './users.openapi';
import { registerWebhookSubscriptionsOpenApi } from './webhook-subscriptions.openapi';

/**
 * OpenAPI registry for the REST API
 * Defines all endpoints, request/response schemas, and metadata
 */
const registry = new OpenAPIRegistry();

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
  registerRuntimeConfigOpenApi(registry);
  registerAuthEndpoints(registry);
  registerMeEndpoints(registry);
  registerApiKeysOpenApi(registry);
  registerUserEndpoints(registry);
  registerOrganizationsOpenApi(registry);
  registerOrganizationInvitationsOpenApi(registry);
  registerOrganizationMembersOpenApi(registry);
  registerProjectsOpenApi(registry);
  registerProjectAppsOpenApi(registry);
  registerRolesOpenApi(registry);
  registerGroupsOpenApi(registry);
  registerPermissionsOpenApi(registry);
  registerResourcesOpenApi(registry);
  registerTagsOpenApi(registry);
  registerJwksOpenApi(registry);
  registerSigningKeysOpenApi(registry);
  registerWebhookSubscriptionsOpenApi(registry);
}

/**
 * Initialize the OpenAPI registry with all schemas and endpoints
 */
function initializeOpenApiRegistry() {
  registerCommonSchemas();
  registerAllEndpoints();
  return registry;
}

/**
 * The OpenAPI document, generated once per process and then reused.
 *
 * Generation walks the whole endpoint registry — 87 paths — and measured 260 ms in the
 * shipped container on a full CPU core. `createApp()` used to pay that at boot, on
 * every cold start, for a document most requests never ask for: it is read by
 * `/api-docs` and `/api-docs.json` and by nothing else.
 *
 * That is cheap on a long-running server, which boots once. It is not cheap on Lambda,
 * where a measured cold start of 8.9 s sits against a 10 s init ceiling — past which
 * Lambda re-runs init inside the invocation and the caller waits for it.
 *
 * The document is immutable once built (the registry is populated by module imports,
 * not by request state), so caching it is safe and the first caller pays for everyone.
 */
let cachedDocument: ReturnType<typeof generateOpenApiDocument> | undefined;

export function getOpenApiDocument(): ReturnType<typeof generateOpenApiDocument> {
  return (cachedDocument ??= generateOpenApiDocument());
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
      version: config.app.version,
      title: 'Grant REST API',
      description: 'REST API for the Grant - An open-source identity and access management system',
      contact: {
        name: 'Ale Heredia',
        url: 'https://grantjs.org',
        email: 'support@grantjs.org',
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
        name: 'Project Apps',
        description: 'OAuth project app (client) management endpoints',
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
      {
        name: 'JWKS',
        description: 'JSON Web Key Set discovery endpoints for JWT verification',
      },
      {
        name: 'Signing Keys',
        description: 'Project signing key management and rotation endpoints',
      },
      {
        name: 'Config',
        description: 'Public runtime configuration for frontends (no auth)',
      },
    ],
    externalDocs: {
      description: 'Find more info on GitHub',
      url: 'https://github.com/grant-js/grant',
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
