import { TAG_COLORS, TagColor } from '@grantjs/constants';
import { SortOrder, TagSortField } from '@grantjs/schema';

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
  scopeId: z.uuid('errors.validation.invalidScopeId'),
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
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
      description: 'Name of the tag',
      example: 'Frontend',
    }),
  color: z
    .enum(TAG_COLORS as [TagColor, ...TagColor[]], {
      message: 'errors.validation.colorInvalid',
    })
    .openapi({
      description: 'Tag color (named color from the allowed palette)',
      example: 'blue',
    }),
  scope: scopeSchema,
});

export const createTagResponseSchema = createSuccessResponseSchema(tagSchema);

export const updateTagRequestSchema = z.object({
  scope: scopeSchema,
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .optional()
    .openapi({
      description: 'Updated name of the tag',
      example: 'Backend',
    }),
  color: z
    .enum(TAG_COLORS as [TagColor, ...TagColor[]], {
      message: 'errors.validation.colorInvalid',
    })
    .optional()
    .openapi({
      description: 'Updated tag color (named color from the allowed palette)',
      example: 'emerald',
    }),
});

export const tagParamsSchema = z.object({
  id: z
    .string()
    .uuid('errors.validation.invalidTagId')
    .openapi({
      description: 'UUID of the tag',
      example: '123e4567-e89b-12d3-a456-426614174008',
      param: { in: 'path', name: 'id' },
    }),
});

export const updateTagResponseSchema = createSuccessResponseSchema(tagSchema);

export const deleteTagBodySchema = z.object({
  scope: scopeSchema,
  hardDelete: z.boolean().optional().default(false),
});

export const deleteTagQuerySchema = z.object({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteTagResponseSchema = createSuccessResponseSchema(tagSchema);
