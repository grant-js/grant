import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  createResourceRequestSchema,
  createResourceResponseSchema,
  deleteResourceQuerySchema,
  deleteResourceResponseSchema,
  errorResponseSchema,
  getResourcesQuerySchema,
  getResourcesResponseSchema,
  notFoundErrorResponseSchema,
  resourceParamsSchema,
  resourceSchema,
  resourceWithRelationsSchema,
  updateResourceRequestSchema,
  updateResourceResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export function registerResourcesOpenApi(registry: OpenAPIRegistry) {
  registry.register('Resource', resourceSchema);
  registry.register('ResourceWithRelations', resourceWithRelationsSchema);
  registry.register('GetResourcesQuery', getResourcesQuerySchema);
  registry.register('GetResourcesResponse', getResourcesResponseSchema);
  registry.register(
    'GetResourceResponse',
    createSuccessResponseSchema(resourceWithRelationsSchema)
  );
  registry.register('ResourceParams', resourceParamsSchema);

  /**
   * GET /api/resources
   */
  registry.registerPath({
    method: 'get',
    path: '/api/resources',
    tags: ['Resources'],
    summary: 'List resources',
    description: `
List resources with optional filtering, pagination, and relation loading.

### Scope
Resources are scoped to a tenant context. You must provide:
- \`scopeId\`: The UUID of the scope (project)
- \`tenant\`: The tenant type (must be \`organization-project\` or \`account-project\`)

**Note**: Resources are only supported at the project level.

### Filtering
- \`search\`: Search by resource name or slug
- \`isActive\`: Filter by active status (\`true\` or \`false\`)
- \`ids\`: Filter by specific resource IDs (comma-separated or array)
- \`sortField\`: Sort by field (\`name\`, \`slug\`, \`createdAt\`, \`updatedAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)

### Actions
Resources define a set of actions that can be performed on them. Default actions include:
- \`read\`: View the resource
- \`write\`: Create new items in the resource
- \`update\`: Modify existing items
- \`delete\`: Remove items from the resource

Custom actions can be defined when creating or updating a resource.
    `.trim(),
    request: {
      query: getResourcesQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved resources',
        content: {
          'application/json': {
            schema: getResourcesResponseSchema,
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
   * POST /api/resources
   */
  registry.registerPath({
    method: 'post',
    path: '/api/resources',
    tags: ['Resources'],
    summary: 'Create a new resource',
    description: `
Create a new resource within a project scope.

### Scope
The resource is created within the specified scope:
- \`scope.id\`: The UUID of the project
- \`scope.tenant\`: The tenant type (must be \`organization-project\` or \`account-project\`)

**Note**: Resources are automatically attached to the project specified in the scope.

### Actions
You can define custom actions for the resource:
- \`actions\`: Array of action strings (e.g., ["read", "write", "delete", "share"])
- If not provided, default actions will be used: ["read", "write", "update", "delete"]

### Slug
The slug must be URL-friendly:
- Only lowercase letters, numbers, and hyphens
- Example: "user-documents", "api-keys", "file-uploads"

### Active Status
- \`isActive\`: Whether the resource is active (default: \`true\`)
- Inactive resources cannot be used in permission definitions
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createResourceRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Resource created successfully',
        content: {
          'application/json': {
            schema: createResourceResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body',
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
   * PATCH /api/resources/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/resources/{id}',
    tags: ['Resources'],
    summary: 'Update a resource',
    description: `
Update an existing resource's details.

All fields are optional - only provide the fields you want to update.

### Actions
- \`actions\`: Replace the entire actions array with new values
- All actions must be provided if updating (array is replaced, not merged)

### Slug
- \`slug\`: Update the URL-friendly identifier
- Must follow the same rules as creation (lowercase, numbers, hyphens only)

### Active Status
- \`isActive\`: Toggle the resource's active status
- Setting to \`false\` prevents the resource from being used in new permissions
    `.trim(),
    request: {
      params: resourceParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateResourceRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Resource updated successfully',
        content: {
          'application/json': {
            schema: updateResourceResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters or body',
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
        description: 'Resource not found',
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
   * DELETE /api/resources/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/resources/{id}',
    tags: ['Resources'],
    summary: 'Delete a resource',
    description: `
Delete a resource (soft delete by default).

### Scope
You must provide the scope context:
- \`scopeId\`: The UUID of the project where the resource exists
- \`tenant\`: The tenant type (must be \`organization-project\` or \`account-project\`)

### Deletion Type
- By default, resources are soft deleted (marked as deleted but retained in the database)
- Set \`hardDelete=true\` to permanently delete the resource

**Warning**: Hard deletion is irreversible and will:
- Remove the resource from all associated projects
- Cascade to related permissions (permissions with this resource will have their \`resourceId\` set to null)
- Remove all project-resource relationships

### Impact on Permissions
When a resource is deleted:
- Permissions that reference this resource will have their \`resourceId\` set to \`null\`
- The permission itself is not deleted, but it will no longer be resource-specific
- You should review and update affected permissions after deleting a resource
    `.trim(),
    request: {
      params: resourceParamsSchema,
      query: deleteResourceQuerySchema,
    },
    responses: {
      200: {
        description: 'Resource deleted successfully',
        content: {
          'application/json': {
            schema: deleteResourceResponseSchema,
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
        description: 'Resource not found',
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
}
