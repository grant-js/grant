import { RoleSortableField, SortOrder } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const roleWithRelationsSchema = roleSchema.extend({
  groups: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
});

export const roleRelationsEnum = z.enum(['groups', 'tags']);

export const getRolesQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z
    .enum(Object.values(RoleSortableField) as [RoleSortableField, ...RoleSortableField[]])
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
    .array(roleRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['groups', 'tags'],
    }),
});

export const getRolesResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(roleWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createRoleRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  scope: scopeSchema,
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const createRoleResponseSchema = createSuccessResponseSchema(roleSchema);

export const updateRoleRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const roleParamsSchema = z.object({
  id: z.string().uuid('Invalid role ID'),
});

export const updateRoleResponseSchema = createSuccessResponseSchema(roleSchema);

export const deleteRoleQuerySchema = z.object({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
});

export const deleteRoleResponseSchema = createSuccessResponseSchema(roleSchema);
