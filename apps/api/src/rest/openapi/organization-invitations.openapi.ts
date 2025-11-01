import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  authenticationErrorResponseSchema,
  errorResponseSchema,
  getInvitationByTokenQuerySchema,
  getInvitationResponseSchema,
  getOrganizationInvitationsQuerySchema,
  getOrganizationInvitationsResponseSchema,
  invitationParamsSchema,
  invitationTokenParamsSchema,
  inviteMemberRequestSchema,
  inviteMemberResponseSchema,
  notFoundErrorResponseSchema,
  organizationInvitationSchema,
  organizationInvitationWithRelationsSchema,
  revokeInvitationResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';

export function registerOrganizationInvitationsOpenApi(registry: OpenAPIRegistry) {
  registry.register('OrganizationInvitation', organizationInvitationSchema);
  registry.register(
    'OrganizationInvitationWithRelations',
    organizationInvitationWithRelationsSchema
  );
  registry.register('InvitationParams', invitationParamsSchema);
  registry.register('InvitationTokenParams', invitationTokenParamsSchema);

  /**
   * POST /api/organization-invitations/invite
   */
  registry.registerPath({
    method: 'post',
    path: '/api/organization-invitations/invite',
    tags: ['Organization Invitations'],
    summary: 'Invite member to organization',
    description: `
Invite a new or existing user to join an organization with a specific role.

### Process Flow:
1. System checks if user authentication method exists for the email
2. If user exists, verifies they're not already a member of the organization
3. Checks for existing pending invitations
4. Creates invitation record with unique token and 7-day expiration
5. Sends invitation email asynchronously

### Email Invitation:
- Contains invitation URL with unique token
- Valid for 7 days
- Includes organization name, role, and inviter information

### Invitation Status:
- New users will need to complete registration upon accepting
- Existing users can accept and join immediately
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: inviteMemberRequestSchema,
            example: {
              organizationId: '123e4567-e89b-12d3-a456-426614174000',
              email: 'newmember@example.com',
              roleId: '123e4567-e89b-12d3-a456-426614174001',
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Successfully created invitation',
        content: {
          'application/json': {
            schema: inviteMemberResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error or user already invited',
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
   * POST /api/organization-invitations/accept
   */
  registry.registerPath({
    method: 'post',
    path: '/api/organization-invitations/accept',
    tags: ['Organization Invitations'],
    summary: 'Accept organization invitation',
    description: `
Accept an organization invitation using the token received via email.

### Process Flow:
1. Validates invitation token and checks expiration
2. Checks if user authentication method exists for the invited email
3. If user doesn't exist:
   - Requires \`userData\` with registration info (name, username, password)
   - Creates new user, authentication method, and account
   - Returns \`requiresRegistration: false\` with user data
4. If user exists:
   - Directly adds user to organization
   - Returns existing user data
5. Assigns the invitation's specified role to the user
6. Marks invitation as accepted

### Registration Data (for new users):
- \`name\`: User's full name
- \`username\`: Unique username (min 3 characters)
- \`password\`: Secure password (min 8 characters)

### Response:
- \`requiresRegistration\`: true if user data is needed, false otherwise
- \`user\`: User object (null if requires registration)
- \`account\`: Account object (null if requires registration)
- \`isNewUser\`: true if a new user was created
- \`invitation\`: The accepted invitation details
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: acceptInvitationRequestSchema,
            examples: {
              existingUser: {
                summary: 'Existing user accepting invitation',
                description: 'User already has an account in the system',
                value: {
                  token: 'inv_a1b2c3d4e5f6g7h8i9j0',
                },
              },
              newUser: {
                summary: 'New user accepting invitation with registration',
                description: 'User needs to create an account',
                value: {
                  token: 'inv_a1b2c3d4e5f6g7h8i9j0',
                  userData: {
                    name: 'Jane Doe',
                    username: 'janedoe',
                    password: 'SecureP@ssw0rd',
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully accepted invitation',
        content: {
          'application/json': {
            schema: acceptInvitationResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error or invalid invitation',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
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
   * GET /api/organization-invitations/:token
   */
  registry.registerPath({
    method: 'get',
    path: '/api/organization-invitations/{token}',
    tags: ['Organization Invitations'],
    summary: 'Get invitation by token',
    description: `
Retrieve invitation details using the token from the invitation email.
This endpoint is public and doesn't require authentication.

Use this to display invitation information before acceptance, such as:
- Organization name
- Role being offered
- Inviter information
- Expiration date

### Relations:
You can load related data by specifying the \`relations\` query parameter:
- \`organization\`: Include organization details
- \`role\`: Include role details
- \`inviter\`: Include inviter (user) details

Example: \`/api/organization-invitations/{token}?relations=organization,role,inviter\`
    `.trim(),
    request: {
      params: invitationTokenParamsSchema,
      query: getInvitationByTokenQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved invitation',
        content: {
          'application/json': {
            schema: getInvitationResponseSchema,
          },
        },
      },
      404: {
        description: 'Invitation not found or expired',
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
   * GET /api/organization-invitations
   */
  registry.registerPath({
    method: 'get',
    path: '/api/organization-invitations',
    tags: ['Organization Invitations'],
    summary: 'List organization invitations',
    description: `
List all invitations for a specific organization with optional status filtering.

### Query Parameters:
- \`organizationId\`: UUID of the organization (required)
- \`status\`: Filter by invitation status (optional)
  - \`pending\`: Invitation sent but not yet accepted
  - \`accepted\`: Invitation accepted, user joined
  - \`expired\`: Invitation past expiration date
  - \`revoked\`: Invitation manually revoked

### Use Cases:
- View all pending invitations for an organization
- Track accepted invitations
- Audit invitation history
    `.trim(),
    request: {
      query: getOrganizationInvitationsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved invitations',
        content: {
          'application/json': {
            schema: getOrganizationInvitationsResponseSchema,
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
   * DELETE /api/organization-invitations/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/organization-invitations/{id}',
    tags: ['Organization Invitations'],
    summary: 'Revoke invitation',
    description: `
Revoke a pending invitation by soft-deleting it.

This action:
- Marks the invitation as deleted
- Prevents the invitation from being accepted
- Preserves invitation record for audit purposes

Typically used when:
- User was invited by mistake
- Role or permissions need to be changed (revoke and re-invite)
- Organization membership requirements changed
    `.trim(),
    request: {
      params: invitationParamsSchema,
    },
    responses: {
      200: {
        description: 'Successfully revoked invitation',
        content: {
          'application/json': {
            schema: revokeInvitationResponseSchema,
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
      404: {
        description: 'Invitation not found',
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
