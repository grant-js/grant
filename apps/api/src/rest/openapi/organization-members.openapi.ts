import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  errorResponseSchema,
  getOrganizationMembersQuerySchema,
  getOrganizationMembersResponseSchema,
  notFoundErrorResponseSchema,
  organizationMemberSchema,
  removeOrganizationMemberBodySchema,
  removeOrganizationMemberParamsSchema,
  removeOrganizationMemberResponseSchema,
  updateOrganizationMemberBodySchema,
  updateOrganizationMemberParamsSchema,
  updateOrganizationMemberResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';

export function registerOrganizationMembersOpenApi(registry: OpenAPIRegistry) {
  registry.register('OrganizationMember', organizationMemberSchema);
  registry.register('GetOrganizationMembersQuery', getOrganizationMembersQuerySchema);
  registry.register('GetOrganizationMembersResponse', getOrganizationMembersResponseSchema);
  registry.register('UpdateOrganizationMemberParams', updateOrganizationMemberParamsSchema);
  registry.register('UpdateOrganizationMemberBody', updateOrganizationMemberBodySchema);
  registry.register('UpdateOrganizationMemberResponse', updateOrganizationMemberResponseSchema);
  registry.register('RemoveOrganizationMemberParams', removeOrganizationMemberParamsSchema);
  registry.register('RemoveOrganizationMemberBody', removeOrganizationMemberBodySchema);
  registry.register('RemoveOrganizationMemberResponse', removeOrganizationMemberResponseSchema);

  /**
   * GET /api/organization-members
   */
  registry.registerPath({
    method: 'get',
    path: '/api/organization-members',
    tags: ['Organization Members'],
    summary: 'List organization members',
    description: `
List all members (both active users and pending invitations) for a scope.

### Query Parameters:
- \`scopeId\`: UUID of the scope (organization or project) - required
- \`tenant\`: Tenant type (\`organization\` or \`project\`) - required
- \`status\`: Filter by invitation status (optional)
  - \`pending\`: Pending invitations
  - \`accepted\`: Accepted invitations (active members)
  - \`expired\`: Expired invitations
  - \`revoked\`: Revoked invitations

### Pagination:
- \`page\`: Page number (1-indexed, default: 1)
- \`limit\`: Items per page (default: 50, use -1 for all)

### Search & Sorting:
- \`search\`: Search by member name or email (min 2 characters)
- \`sortField\`: Sort by field (\`name\`, \`email\`, \`createdAt\`, \`role\`)
- \`sortOrder\`: Sort order (\`asc\` or \`desc\`)

### Response:
Returns a unified list of members and invitations with the following fields:
- \`id\`: Member ID (user ID or invitation ID)
- \`name\`: Member name (user name or invited email)
- \`email\`: Member email
- \`type\`: \`MEMBER\` for active users, \`INVITATION\` for pending invitations
- \`role\`: Assigned role (if any)
- \`status\`: Invitation status (for invitations only)
- \`user\`: Full user object (for members only)
- \`invitation\`: Full invitation object (for invitations only)
    `.trim(),
    request: {
      query: getOrganizationMembersQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved organization members',
        content: {
          'application/json': {
            schema: getOrganizationMembersResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
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
   * PATCH /api/organization-members/:userId
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/organization-members/{userId}',
    tags: ['Organization Members'],
    summary: 'Update organization member role',
    description: `
Update the role of an existing organization member.

### Path Parameters:
- \`userId\`: UUID of the user whose role should be updated

### Request Body:
- \`scope\`: Scope context with \`id\` and \`tenant\`
- \`roleId\`: UUID of the new role to assign

### Use Cases:
- Promote a member to a higher role (e.g., Viewer → Developer)
- Demote a member to a lower role (e.g., Admin → Viewer)
- Change a member's role type (e.g., Developer → Admin)

### Authorization:
Requires \`organization-member:update\` permission in the specified scope.
Only Organization Owners and Admins can update member roles.

### Notes:
- Cannot change your own role
- Cannot demote the last Owner of an organization
- Role changes take effect immediately
    `.trim(),
    request: {
      params: updateOrganizationMemberParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateOrganizationMemberBodySchema,
            example: {
              scope: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                tenant: 'organization',
              },
              roleId: '123e4567-e89b-12d3-a456-426614174001',
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully updated member role',
        content: {
          'application/json': {
            schema: updateOrganizationMemberResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error or invalid role assignment',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Member not found',
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
   * DELETE /api/organization-members/:userId
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/organization-members/{userId}',
    tags: ['Organization Members'],
    summary: 'Remove organization member',
    description: `
Remove a member from an organization.

### Path Parameters:
- \`userId\`: UUID of the user to remove from the organization

### Request Body:
- \`scope\`: Scope context with \`id\` and \`tenant\`

### Use Cases:
- Remove a member who has left the organization
- Revoke access for a member who no longer needs it
- Clean up organization membership

### Authorization:
Requires \`organization-member:remove\` permission in the specified scope.
Only Organization Owners and Admins can remove members.

### Notes:
- Cannot remove yourself from the organization
- Cannot remove the last Owner of an organization
- Removal takes effect immediately
- The user's access to organization resources is revoked immediately
- This action does not delete the user's account, only their membership
    `.trim(),
    request: {
      params: removeOrganizationMemberParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: removeOrganizationMemberBodySchema,
            example: {
              scope: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                tenant: 'organization',
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully removed member from organization',
        content: {
          'application/json': {
            schema: removeOrganizationMemberResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error or cannot remove member',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Member not found',
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
