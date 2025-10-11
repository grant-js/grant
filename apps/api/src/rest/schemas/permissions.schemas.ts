import { PermissionSortableField, SortOrder } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const permissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  action: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const permissionWithRelationsSchema = permissionSchema.extend({
  tags: z.array(z.unknown()).optional(),
});

export const permissionRelationsEnum = z.enum(['tags']);

export const getPermissionsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z
    .enum(
      Object.values(PermissionSortableField) as [
        PermissionSortableField,
        ...PermissionSortableField[],
      ]
    )
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
    .array(permissionRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['tags'],
    }),
});

export const getPermissionsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(permissionWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createPermissionRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  action: z.string().min(1, 'Action is required'),
  scope: scopeSchema,
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const createPermissionResponseSchema = createSuccessResponseSchema(permissionSchema);

export const updatePermissionRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().optional(),
  action: z.string().min(1, 'Action is required').optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const permissionParamsSchema = z.object({
  id: z.string().uuid('Invalid permission ID'),
});

export const updatePermissionResponseSchema = createSuccessResponseSchema(permissionSchema);

export const deletePermissionQuerySchema = z.object({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deletePermissionResponseSchema = createSuccessResponseSchema(permissionSchema);
