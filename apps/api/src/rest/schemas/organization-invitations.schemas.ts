import {
  OrganizationInvitationSortableField,
  OrganizationInvitationStatus,
} from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export const organizationInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  roleId: z.string(),
  status: z.enum(
    Object.values(OrganizationInvitationStatus) as [
      OrganizationInvitationStatus,
      ...OrganizationInvitationStatus[],
    ]
  ),
  expiresAt: z.string(),
  invitedBy: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const organizationInvitationWithRelationsSchema = organizationInvitationSchema.extend({
  organization: z.unknown().optional(),
  role: z.unknown().optional(),
  inviter: z.unknown().optional(),
});

export const invitationParamsSchema = z.object({
  id: z
    .string()
    .uuid('Invalid invitation ID')
    .openapi({
      description: 'UUID of the invitation to revoke',
      example: '123e4567-e89b-12d3-a456-426614174002',
      param: { in: 'path', name: 'id' },
    }),
});

export const invitationTokenParamsSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .openapi({
      description: 'Unique invitation token',
      example: 'inv_a1b2c3d4e5f6g7h8i9j0',
      param: { in: 'path', name: 'token' },
    }),
});

export const inviteMemberRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').openapi({
    description: 'UUID of the organization to invite the member to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  }),
  email: z.string().email('Invalid email address').openapi({
    description: 'Email address of the user to invite',
    example: 'newmember@example.com',
  }),
  roleId: z.string().uuid('Invalid role ID').openapi({
    description: 'UUID of the role to assign to the invited member',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const inviteMemberResponseSchema = createSuccessResponseSchema(organizationInvitationSchema);

export const getOrganizationInvitationsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').openapi({
    description: 'UUID of the organization to list invitations for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  }),
  status: z
    .enum(
      Object.values(OrganizationInvitationStatus) as [
        OrganizationInvitationStatus,
        ...OrganizationInvitationStatus[],
      ]
    )
    .optional()
    .openapi({
      description: 'Filter invitations by status (pending, accepted, expired, revoked)',
      example: 'pending',
    }),
  page: z.number().int().min(1).optional().openapi({
    description: 'Page number (1-indexed)',
    example: 1,
  }),
  limit: z.number().int().min(-1).max(100).optional().openapi({
    description: 'Number of items per page (-1 for all)',
    example: 50,
  }),
  search: z.string().min(2, 'Search term must be at least 2 characters').optional().openapi({
    description: 'Search term to filter invitations by email',
    example: 'john@example.com',
  }),
  sortField: z
    .enum(
      Object.values(OrganizationInvitationSortableField) as [
        OrganizationInvitationSortableField,
        ...OrganizationInvitationSortableField[],
      ]
    )
    .optional()
    .openapi({
      description: 'Field to sort by',
      example: 'createdAt',
    }),
  sortOrder: z
    .enum(['asc', 'desc'] as const)
    .optional()
    .openapi({
      description: 'Sort order',
      example: 'desc',
    }),
  ids: z
    .array(z.string().uuid())
    .optional()
    .openapi({
      description: 'Filter by specific invitation IDs',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
});

export const getOrganizationInvitationsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(organizationInvitationSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const acceptInvitationRequestSchema = z.object({
  token: z.string().min(1, 'Token is required').openapi({
    description: 'Unique invitation token received via email',
    example: 'inv_a1b2c3d4e5f6g7h8i9j0',
  }),
  userData: z
    .object({
      name: z.string().min(1, 'Name is required').openapi({
        description: "User's full name",
        example: 'Jane Doe',
      }),
      username: z.string().min(3, 'Username must be at least 3 characters').openapi({
        description: 'Unique username for the account',
        example: 'janedoe',
      }),
      password: z.string().min(8, 'Password must be at least 8 characters').openapi({
        description: 'Secure password (minimum 8 characters)',
        example: 'SecureP@ssw0rd',
      }),
    })
    .optional()
    .openapi({
      description: 'Registration data for new users. Required if the email does not exist.',
    }),
});

export const acceptInvitationResponseSchema = createSuccessResponseSchema(
  z.object({
    requiresRegistration: z.boolean(),
    user: z.unknown().nullable(),
    account: z.unknown().nullable(),
    isNewUser: z.boolean(),
    invitation: organizationInvitationSchema,
  })
);

export const revokeInvitationResponseSchema = createSuccessResponseSchema(
  organizationInvitationSchema
);

export const resendInvitationEmailResponseSchema = createSuccessResponseSchema(
  organizationInvitationSchema
);

export const getInvitationResponseSchema = createSuccessResponseSchema(
  organizationInvitationWithRelationsSchema
);

export const getInvitationByTokenQuerySchema = z.object({
  relations: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim());
      }
      return val;
    })
    .optional()
    .openapi({
      description:
        'Comma-separated list of relations to include. Available: organization, role, inviter',
      example: 'organization,role,inviter',
    }),
});
