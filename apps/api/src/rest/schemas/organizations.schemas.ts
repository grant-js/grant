import { OrganizationSortableField, SortOrder } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema, listQuerySchema } from '@/rest/schemas/common.schemas';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const organizationWithRelationsSchema = organizationSchema.extend({
  projects: z.array(z.unknown()).optional(),
  roles: z.array(z.unknown()).optional(),
  groups: z.array(z.unknown()).optional(),
  permissions: z.array(z.unknown()).optional(),
  users: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
});

export const getOrganizationsQuerySchema = listQuerySchema.extend({
  sortField: z
    .enum(
      Object.values(OrganizationSortableField) as [
        OrganizationSortableField,
        ...OrganizationSortableField[],
      ]
    )
    .optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
});

export const getOrganizationsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(organizationWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createOrganizationRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
});

export const createOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);

export const updateOrganizationRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
});

export const organizationParamsSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
});

export const updateOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);

export const deleteOrganizationQuerySchema = z.object({
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);
