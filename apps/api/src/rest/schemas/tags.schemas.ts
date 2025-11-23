import { SortOrder, TagSortField } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  isPrimary: z.boolean().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const getTagsQuerySchema = listQuerySchema.extend({
  scopeId: z.uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z.enum(Object.values(TagSortField) as [TagSortField, ...TagSortField[]]).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
});

export const getTagsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(tagSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createTagRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').openapi({
    description: 'Name of the tag',
    example: 'Frontend',
  }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .openapi({
      description: 'Hex color code for the tag',
      example: '#3B82F6',
    }),
  scope: scopeSchema,
});

export const createTagResponseSchema = createSuccessResponseSchema(tagSchema);

export const updateTagRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional().openapi({
    description: 'Updated name of the tag',
    example: 'Backend',
  }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional()
    .openapi({
      description: 'Updated hex color code for the tag',
      example: '#10B981',
    }),
});

export const tagParamsSchema = z.object({
  id: z
    .string()
    .uuid('Invalid tag ID')
    .openapi({
      description: 'UUID of the tag',
      example: '123e4567-e89b-12d3-a456-426614174008',
      param: { in: 'path', name: 'id' },
    }),
});

export const updateTagResponseSchema = createSuccessResponseSchema(tagSchema);

export const deleteTagQuerySchema = z.object({
  scopeId: z.uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteTagResponseSchema = createSuccessResponseSchema(tagSchema);
