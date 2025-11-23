import {
  OrganizationInvitationStatus,
  OrganizationMemberSortableField,
} from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export const getOrganizationMembersQuerySchema = z.object({
  organizationId: z.uuid('Invalid organization ID').openapi({
    description: 'UUID of the organization to list members for',
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
    description: 'Search term to filter members by name or email',
    example: 'john@example.com',
  }),
  sortField: z
    .enum(
      Object.values(OrganizationMemberSortableField) as [
        OrganizationMemberSortableField,
        ...OrganizationMemberSortableField[],
      ]
    )
    .optional()
    .openapi({
      description: 'Field to sort by',
      example: 'name',
    }),
  sortOrder: z
    .enum(['asc', 'desc'] as const)
    .optional()
    .openapi({
      description: 'Sort order',
      example: 'asc',
    }),
});

export const organizationMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  type: z.enum(['MEMBER', 'INVITATION']),
  role: z.any().nullable().optional(),
  status: z.string().nullable().optional(),
  user: z.any().nullable().optional(),
  invitation: z.any().nullable().optional(),
  createdAt: z.date(),
});

export const getOrganizationMembersResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(organizationMemberSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);
