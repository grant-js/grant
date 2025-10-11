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
  scopeId: z.string().uuid('Invalid scope ID'),
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
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'),
  scope: scopeSchema,
});

export const createTagResponseSchema = createSuccessResponseSchema(tagSchema);

export const updateTagRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
});

export const tagParamsSchema = z.object({
  id: z.string().uuid('Invalid tag ID'),
});

export const updateTagResponseSchema = createSuccessResponseSchema(tagSchema);

export const deleteTagQuerySchema = z.object({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteTagResponseSchema = createSuccessResponseSchema(tagSchema);
