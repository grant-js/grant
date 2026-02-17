import {
  OrganizationInvitationStatus,
  OrganizationMemberSortableField,
  Tenant,
} from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema, scopeSchema } from '@/rest/schemas/common.schemas';

export const getOrganizationMembersQuerySchema = z.object({
  scopeId: z.uuid('errors.validation.invalidScopeId').openapi({
    description: 'UUID of the scope to list members for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  }),
  tenant: z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]).openapi({
    description: 'Tenant of the scope to list members for',
    example: 'organization',
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
  search: z.string().min(2, 'errors.validation.searchMin2').optional().openapi({
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

export const updateOrganizationMemberParamsSchema = z.object({
  userId: z.string().openapi({
    description: 'UUID of the user to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  }),
});

export const updateOrganizationMemberBodySchema = z.object({
  scope: scopeSchema.openapi({
    description: 'Scope context for the organization membership',
  }),
  roleId: z.string().openapi({
    description: 'UUID of the new role to assign to the member',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const updateOrganizationMemberResponseSchema = createSuccessResponseSchema(
  z.object({
    id: z.string(),
    userId: z.string(),
    roleId: z.string(),
    organizationId: z.string(),
  })
);

export const removeOrganizationMemberParamsSchema = z.object({
  userId: z.string().openapi({
    description: 'UUID of the user to remove',
    example: '123e4567-e89b-12d3-a456-426614174000',
  }),
});

export const removeOrganizationMemberBodySchema = z.object({
  scope: scopeSchema.openapi({
    description: 'Scope context for the organization membership',
  }),
});

export const removeOrganizationMemberResponseSchema = createSuccessResponseSchema(
  z.object({
    success: z.boolean(),
  })
);
