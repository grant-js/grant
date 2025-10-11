import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  createTagRequestSchema,
  createTagResponseSchema,
  deleteTagQuerySchema,
  deleteTagResponseSchema,
  errorResponseSchema,
  getTagsQuerySchema,
  getTagsResponseSchema,
  notFoundErrorResponseSchema,
  tagParamsSchema,
  tagSchema,
  updateTagRequestSchema,
  updateTagResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';

export function registerTagsOpenApi(registry: OpenAPIRegistry) {
  registry.register('Tag', tagSchema);
  registry.register('GetTagsQuery', getTagsQuerySchema);
  registry.register('GetTagsResponse', getTagsResponseSchema);
  registry.register('TagParams', tagParamsSchema);

  /**
   * GET /api/tags
   */
  registry.registerPath({
    method: 'get',
    path: '/api/tags',
    tags: ['Tags'],
    summary: 'List tags',
    description: `
List tags with optional filtering, pagination, and sorting.

### Scope
Tags are scoped to a tenant context. You must provide:
- \`scopeId\`: The UUID of the scope (account, organization, or project)
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Filtering
- \`search\`: Search by tag name
- \`sortField\`: Sort by field (\`name\`, \`color\`, \`createdAt\`, \`updatedAt\`)
- \`sortOrder\`: Sort order (\`ASC\` or \`DESC\`)

### Pagination
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)

### Tag Colors
Tags use hex color codes (e.g., \`#FF5733\`) for visual categorization in the UI.
    `.trim(),
    request: {
      query: getTagsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved tags',
        content: {
          'application/json': {
            schema: getTagsResponseSchema,
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
   * POST /api/tags
   */
  registry.registerPath({
    method: 'post',
    path: '/api/tags',
    tags: ['Tags'],
    summary: 'Create a new tag',
    description: `
Create a new tag within a scope.

### Scope
The tag is created within the specified scope:
- \`scope.id\`: The UUID of the scope (account, organization, or project)
- \`scope.tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Color
The color field must be a valid hex color code:
- Format: \`#RRGGBB\` (e.g., \`#FF5733\`, \`#3498DB\`)
- Must be exactly 6 hex characters after the \`#\` symbol

### Usage
Tags can be assigned to multiple resources (users, groups, roles, permissions, projects) for:
- Visual organization and categorization
- Filtering and searching
- Access control and grouping
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createTagRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Tag created successfully',
        content: {
          'application/json': {
            schema: createTagResponseSchema,
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
   * PATCH /api/tags/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/tags/{id}',
    tags: ['Tags'],
    summary: 'Update a tag',
    description: `
Update an existing tag's details.

All fields are optional - only provide the fields you want to update.

### Name
- \`name\`: Update the tag name (1-255 characters)

### Color
- \`color\`: Update the tag color (must be a valid hex color: \`#RRGGBB\`)

**Note**: Updating a tag affects all resources that use this tag. The changes are immediately visible across users, groups, roles, permissions, and projects that have this tag assigned.
    `.trim(),
    request: {
      params: tagParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateTagRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Tag updated successfully',
        content: {
          'application/json': {
            schema: updateTagResponseSchema,
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
        description: 'Tag not found',
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
   * DELETE /api/tags/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/tags/{id}',
    tags: ['Tags'],
    summary: 'Delete a tag',
    description: `
Delete a tag (soft delete by default).

### Scope
You must provide the scope context:
- \`scopeId\`: The UUID of the scope where the tag exists
- \`tenant\`: The tenant type (\`account\`, \`organization\`, or \`project\`)

### Deletion Type
- By default, tags are soft deleted (marked as deleted but retained in the database)
- Set \`hardDelete=true\` to permanently delete the tag

**Warning**: 
- Deleting a tag removes it from all resources (users, groups, roles, permissions, projects)
- Hard deletion is irreversible and will permanently remove all tag associations
- If this tag is set as a primary tag on any resource, that resource will need a new primary tag
    `.trim(),
    request: {
      params: tagParamsSchema,
      query: deleteTagQuerySchema,
    },
    responses: {
      200: {
        description: 'Tag deleted successfully',
        content: {
          'application/json': {
            schema: deleteTagResponseSchema,
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
        description: 'Tag not found',
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
