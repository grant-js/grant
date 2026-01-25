import { OrganizationSortableField, SortOrder } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

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

export const organizationRelationsEnum = z.enum([
  'projects',
  'roles',
  'groups',
  'permissions',
  'users',
  'tags',
]);

export const getOrganizationsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z
    .enum(
      Object.values(OrganizationSortableField) as [
        OrganizationSortableField,
        ...OrganizationSortableField[],
      ]
    )
    .optional(),
  sortOrder: z.enum(Object.values(SortOrder) as [SortOrder, ...SortOrder[]]).optional(),
  relations: z
    .array(organizationRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['projects', 'users', 'tags'],
    }),
});

export const getOrganizationsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(organizationWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createOrganizationRequestSchema = z.object({
  scope: scopeSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').openapi({
    description: 'Name of the organization',
    example: 'Acme Corporation',
  }),
});

export const createOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);

export const updateOrganizationRequestSchema = z.object({
  scope: scopeSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional().openapi({
    description: 'Updated name of the organization',
    example: 'Acme Corp',
  }),
});

export const organizationParamsSchema = z.object({
  id: z
    .string()
    .uuid('Invalid organization ID')
    .openapi({
      description: 'UUID of the organization',
      example: '123e4567-e89b-12d3-a456-426614174000',
      param: { in: 'path', name: 'id' },
    }),
});

export const updateOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);

export const deleteOrganizationQuerySchema = z.object({
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);
