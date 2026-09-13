import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  errorResponseSchema,
  notFoundErrorResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';
import {
  clearProjectAppPictureRequestSchema,
  confirmProjectAppPictureUploadRequestSchema,
  createProjectAppRequestSchema,
  createProjectAppResponseSchema,
  deleteProjectAppQuerySchema,
  deleteProjectAppResponseSchema,
  getProjectAppsQuerySchema,
  getProjectAppsResponseSchema,
  projectAppIdParamsSchema,
  projectAppPageSchema,
  projectAppSchema,
  requestProjectAppPictureUploadUrlRequestSchema,
  requestProjectAppPictureUploadUrlResponseSchema,
  updateProjectAppRequestSchema,
  updateProjectAppResponseSchema,
  uploadProjectAppPictureRequestSchema,
  uploadProjectAppPictureResponseSchema,
} from '@/rest/schemas/project-apps.schemas';

/**
 * Register Project Apps (OAuth) endpoints in the OpenAPI registry
 */
export function registerProjectAppsOpenApi(registry: OpenAPIRegistry) {
  registry.register('ProjectApp', projectAppSchema);
  registry.register('ProjectAppPage', projectAppPageSchema);
  registry.register('CreateProjectAppResponse', createProjectAppResponseSchema);
  registry.register('GetProjectAppsQuery', getProjectAppsQuerySchema);
  registry.register('CreateProjectAppRequest', createProjectAppRequestSchema);
  registry.register('UpdateProjectAppRequest', updateProjectAppRequestSchema);
  registry.register('ProjectAppIdParams', projectAppIdParamsSchema);
  registry.register('DeleteProjectAppQuery', deleteProjectAppQuerySchema);
  registry.register('UploadProjectAppPictureRequest', uploadProjectAppPictureRequestSchema);
  registry.register('UploadProjectAppPictureResponse', uploadProjectAppPictureResponseSchema);
  registry.register(
    'RequestProjectAppPictureUploadUrlRequest',
    requestProjectAppPictureUploadUrlRequestSchema
  );
  registry.register(
    'RequestProjectAppPictureUploadUrlResponse',
    requestProjectAppPictureUploadUrlResponseSchema
  );
  registry.register(
    'ConfirmProjectAppPictureUploadRequest',
    confirmProjectAppPictureUploadRequestSchema
  );

  const createProjectAppSuccessSchema = createSuccessResponseSchema(createProjectAppResponseSchema);

  /**
   * GET /api/project-apps
   */
  registry.registerPath({
    method: 'get',
    path: '/api/project-apps',
    tags: ['Project Apps'],
    summary: 'List project apps',
    description: `
List OAuth project apps for the given project scope.

### Scope
- \`scopeId\`: The scope ID in format \`orgId:projectId\` (organizationProject) or \`accountId:projectId\` (accountProject)
- \`tenant\`: \`organizationProject\` or \`accountProject\`

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)

### Filtering
- \`ids\`: Filter by project app IDs (comma-separated or array)
    `.trim(),
    request: {
      query: getProjectAppsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved project apps',
        content: {
          'application/json': {
            schema: getProjectAppsResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/project-apps
   */
  registry.registerPath({
    method: 'post',
    path: '/api/project-apps',
    tags: ['Project Apps'],
    summary: 'Create a project app',
    description: `
Create an OAuth project app (client) for the given project scope.

### Scope
- \`scope.id\`: \`orgId:projectId\` or \`accountId:projectId\`
- \`scope.tenant\`: \`organizationProject\` or \`accountProject\`

### Redirect URIs
At least one redirect URI is required. Used for OAuth callback validation.

### Allow sign-up and sign-up role
When \`allowSignUp\` is true (default), \`signUpRoleId\` is required and must be a role that exists in the project (project_roles). New users who sign in via this app are assigned this role.

### Tags
You can optionally assign tags to the project app:
- \`tagIds\`: Array of tag UUIDs
- \`primaryTagId\`: UUID of the primary tag (must be included in tagIds)

### Client secret
Returned only once on create. Store it securely; it cannot be retrieved later.
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createProjectAppRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Project app created successfully',
        content: {
          'application/json': {
            schema: createProjectAppSuccessSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * PATCH /api/project-apps/{id}
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/project-apps/{id}',
    tags: ['Project Apps'],
    summary: 'Update a project app',
    description: `
Update an existing project app (name, redirect URIs, OAuth scopes, tags).

### Scope
Provide \`scope\` in the body (same format as create) to authorize the update.

### Tags
- \`tagIds\`: Replace all tags with new array
- \`primaryTagId\`: Set or update the primary tag (must be included in tagIds)
    `.trim(),
    request: {
      params: projectAppIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateProjectAppRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Project app updated successfully',
        content: {
          'application/json': {
            schema: updateProjectAppResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project app not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * DELETE /api/project-apps/{id}
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/project-apps/{id}',
    tags: ['Project Apps'],
    summary: 'Delete a project app',
    description: `
Delete a project app. Scope is provided via query parameters.

### Scope (query)
- \`scopeId\`: \`orgId:projectId\` or \`accountId:projectId\`
- \`tenant\`: \`organizationProject\` or \`accountProject\`
    `.trim(),
    request: {
      params: projectAppIdParamsSchema,
      query: deleteProjectAppQuerySchema,
    },
    responses: {
      200: {
        description: 'Project app deleted successfully',
        content: {
          'application/json': {
            schema: deleteProjectAppResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Project app not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/project-apps/{id}/picture',
    tags: ['Project Apps'],
    summary: 'Upload a project-app picture',
    description:
      'Upload an app logo (jpeg/png/gif/webp, max 5MB). Requires ProjectApp:Update on the app\'s project scope.',
    request: {
      params: projectAppIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: uploadProjectAppPictureRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Picture uploaded successfully',
        content: { 'application/json': { schema: uploadProjectAppPictureResponseSchema } },
      },
      400: {
        description: 'Invalid request body or file validation failed',
        content: { 'application/json': { schema: validationErrorResponseSchema } },
      },
      401: {
        description: 'Authentication required',
        content: { 'application/json': { schema: authenticationErrorResponseSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
      404: {
        description: 'Project app not found',
        content: { 'application/json': { schema: notFoundErrorResponseSchema } },
      },
      500: {
        description: 'Internal server error',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/project-apps/{id}/picture/upload-url',
    tags: ['Project Apps'],
    summary: 'Request a direct-upload URL for a project-app picture',
    request: {
      params: projectAppIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: requestProjectAppPictureUploadUrlRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Upload URL issued',
        content: {
          'application/json': { schema: requestProjectAppPictureUploadUrlResponseSchema },
        },
      },
      400: {
        description: 'Invalid content type, extension, size, or scope',
        content: { 'application/json': { schema: validationErrorResponseSchema } },
      },
      401: {
        description: 'Authentication required',
        content: { 'application/json': { schema: authenticationErrorResponseSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
      500: {
        description: 'Internal server error',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/project-apps/{id}/picture/confirm',
    tags: ['Project Apps'],
    summary: 'Record a completed direct upload of a project-app picture',
    request: {
      params: projectAppIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: confirmProjectAppPictureUploadRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Upload recorded; the app pictureUrl now points at it',
        content: { 'application/json': { schema: uploadProjectAppPictureResponseSchema } },
      },
      400: {
        description: 'No uploaded file found, or it exceeds the size policy',
        content: { 'application/json': { schema: validationErrorResponseSchema } },
      },
      401: {
        description: 'Authentication required',
        content: { 'application/json': { schema: authenticationErrorResponseSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
      500: {
        description: 'Internal server error',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/project-apps/{id}/picture',
    tags: ['Project Apps'],
    summary: 'Clear a project-app picture',
    description: 'Nulls picture_path and picture_url so the app inherits the project picture.',
    request: {
      params: projectAppIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: clearProjectAppPictureRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Picture cleared',
        content: { 'application/json': { schema: updateProjectAppResponseSchema } },
      },
      400: {
        description: 'Invalid request',
        content: { 'application/json': { schema: validationErrorResponseSchema } },
      },
      401: {
        description: 'Authentication required',
        content: { 'application/json': { schema: authenticationErrorResponseSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
      404: {
        description: 'Project app not found',
        content: { 'application/json': { schema: notFoundErrorResponseSchema } },
      },
      500: {
        description: 'Internal server error',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
    },
  });
}
