import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';

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
  id: z.string().uuid('Invalid invitation ID'),
});

export const invitationTokenParamsSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const inviteMemberRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  email: z.string().email('Invalid email address'),
  roleId: z.string().uuid('Invalid role ID'),
});

export const inviteMemberResponseSchema = createSuccessResponseSchema(organizationInvitationSchema);

export const getOrganizationInvitationsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  status: z
    .enum(
      Object.values(OrganizationInvitationStatus) as [
        OrganizationInvitationStatus,
        ...OrganizationInvitationStatus[],
      ]
    )
    .optional()
    .openapi({
      description: 'Filter invitations by status',
      example: 'pending',
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
  token: z.string().min(1, 'Token is required'),
  userData: z
    .object({
      name: z.string().min(1, 'Name is required'),
      username: z.string().min(3, 'Username must be at least 3 characters'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
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

export const getInvitationResponseSchema = createSuccessResponseSchema(
  organizationInvitationSchema
);
