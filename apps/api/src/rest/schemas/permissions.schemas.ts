import { permissionConditionSchema } from '@grantjs/core';
import { PermissionSortableField, SortOrder } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  actionSlugSchema,
  createStringArrayQuerySchema,
  createSuccessResponseSchema,
  listQuerySchema,
  scopeIdSchema,
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
  primaryTag: z.unknown().nullable().optional(),
  tags: z.array(z.unknown()).optional(),
  tagCount: z.number().optional(),
});

const permissionFieldsEnum = z.enum(['primaryTag', 'tagCount']);
const permissionRelationsEnum = z.enum(['tags']);

export const getPermissionsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: scopeIdSchema,
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
  fields: createStringArrayQuerySchema(permissionFieldsEnum)
    .optional()
    .openapi({
      description: 'Computed fields to include in the response',
      example: ['primaryTag', 'tagCount'],
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
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
      description: 'Name of the permission',
      example: 'Read Users',
    }),
  description: z.string().optional().openapi({
    description: 'Description of the permission',
    example: 'Allows reading user data',
  }),
  action: actionSlugSchema.openapi({
    description:
      'Action identifier for the permission (lowercase, letters, digits, hyphens, plus only; no spaces)',
    example: 'read',
  }),
  resourceId: z.string().uuid().nullable().optional().openapi({
    description: 'ID of the resource this permission applies to',
    example: '123e4567-e89b-12d3-a456-426614174001',
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
  condition: permissionConditionSchema
    .nullable()
    .optional()
    .openapi({
      description:
        'Condition expression for the permission. Can be null, empty object {}, or a valid condition expression.',
      example: { StringEquals: { 'user.metadata.department': 'sales' } },
    }),
});

export const createPermissionResponseSchema = createSuccessResponseSchema(permissionSchema);

export const updatePermissionRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .optional()
    .openapi({
      description: 'Updated name of the permission',
      example: 'Read All Users',
    }),
  description: z.string().optional().openapi({
    description: 'Updated description of the permission',
    example: 'Allows reading all user data across the system',
  }),
  action: actionSlugSchema.optional().openapi({
    description:
      'Updated action identifier for the permission (lowercase, letters, digits, hyphens, plus only; no spaces)',
    example: 'read',
  }),
  resourceId: z.string().uuid().nullable().optional().openapi({
    description: 'ID of the resource this permission applies to',
    example: '123e4567-e89b-12d3-a456-426614174001',
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
  condition: permissionConditionSchema
    .nullable()
    .optional()
    .openapi({
      description:
        'Condition expression for the permission. Can be null, empty object {}, or a valid condition expression.',
      example: { StringEquals: { 'user.metadata.department': 'sales' } },
    }),
});

export const permissionParamsSchema = z.object({
  id: z.uuid('errors.validation.invalidPermissionId').openapi({
    description: 'UUID of the permission',
    example: '123e4567-e89b-12d3-a456-426614174007',
    param: { in: 'path', name: 'id' },
  }),
});

export const updatePermissionResponseSchema = createSuccessResponseSchema(permissionSchema);

export const deletePermissionQuerySchema = z.object({
  scopeId: scopeIdSchema,
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deletePermissionResponseSchema = createSuccessResponseSchema(permissionSchema);
