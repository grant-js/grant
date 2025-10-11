import { GroupSortableField, SortOrder } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const groupWithRelationsSchema = groupSchema.extend({
  permissions: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
});

export const groupRelationsEnum = z.enum(['permissions', 'tags']);

export const getGroupsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z
    .enum(Object.values(GroupSortableField) as [GroupSortableField, ...GroupSortableField[]])
    .optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim());
      }
      return val;
    })
    .optional(),
  relations: z
    .array(groupRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['permissions', 'tags'],
    }),
});

export const getGroupsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(groupWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createGroupRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  scope: scopeSchema,
  permissionIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const createGroupResponseSchema = createSuccessResponseSchema(groupSchema);

export const updateGroupRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const groupParamsSchema = z.object({
  id: z.string().uuid('Invalid group ID'),
});

export const updateGroupResponseSchema = createSuccessResponseSchema(groupSchema);

export const deleteGroupQuerySchema = z.object({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteGroupResponseSchema = createSuccessResponseSchema(groupSchema);
