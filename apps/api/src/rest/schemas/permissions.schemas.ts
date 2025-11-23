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
  scopeId: z.uuid('Invalid scope ID'),
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
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').openapi({
    description: 'Name of the permission',
    example: 'Read Users',
  }),
  description: z.string().optional().openapi({
    description: 'Description of the permission',
    example: 'Allows reading user data',
  }),
  action: z.string().min(1, 'Action is required').openapi({
    description: 'Action identifier for the permission',
    example: 'users:read',
  }),
  scope: scopeSchema,
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the permission',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the permission',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const createPermissionResponseSchema = createSuccessResponseSchema(permissionSchema);

export const updatePermissionRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional().openapi({
    description: 'Updated name of the permission',
    example: 'Read All Users',
  }),
  description: z.string().optional().openapi({
    description: 'Updated description of the permission',
    example: 'Allows reading all user data across the system',
  }),
  action: z.string().min(1, 'Action is required').optional().openapi({
    description: 'Updated action identifier for the permission',
    example: 'users:read:all',
  }),
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the permission',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the permission',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const permissionParamsSchema = z.object({
  id: z
    .string()
    .uuid('Invalid permission ID')
    .openapi({
      description: 'UUID of the permission',
      example: '123e4567-e89b-12d3-a456-426614174007',
      param: { in: 'path', name: 'id' },
    }),
});

export const updatePermissionResponseSchema = createSuccessResponseSchema(permissionSchema);

export const deletePermissionQuerySchema = z.object({
  scopeId: z.uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deletePermissionResponseSchema = createSuccessResponseSchema(permissionSchema);
