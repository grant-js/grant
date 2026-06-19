import { GroupSortableField, SortOrder } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createStringArrayQuerySchema,
  createSuccessResponseSchema,
  jsonSchema,
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
  permissionCount: z.number().optional(),
  permissions: z.array(z.unknown()).optional(),
  primaryTag: z.unknown().nullable().optional(),
  tags: z.array(z.unknown()).optional(),
  tagCount: z.number().optional(),
});

export const groupFieldsEnum = z.enum(['permissionCount', 'primaryTag', 'tagCount']);
export const groupRelationsEnum = z.enum(['permissions', 'tags']);

export const getGroupsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  sortField: z
    .enum(Object.values(GroupSortableField) as [GroupSortableField, ...GroupSortableField[]])
    .optional(),
  sortOrder: z.enum(Object.values(SortOrder) as [SortOrder, ...SortOrder[]]).optional(),
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
  fields: createStringArrayQuerySchema(groupFieldsEnum)
    .optional()
    .openapi({
      description: 'Computed fields to include in the response',
      example: ['primaryTag', 'permissionCount', 'tagCount'],
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
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
      description: 'Name of the group',
      example: 'Engineering Team',
    }),
  description: z.string().optional().openapi({
    description: 'Description of the group',
    example: 'Development and engineering staff',
  }),
  metadata: jsonSchema.optional().openapi({
    description: 'Arbitrary key-value metadata for the group',
    example: { department: 'engineering', tier: 'premium' },
  }),
  scope: scopeSchema,
  permissionIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of permission IDs to assign to the group',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the group',
      example: ['123e4567-e89b-12d3-a456-426614174002'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the group',
    example: '123e4567-e89b-12d3-a456-426614174002',
  }),
});

export const createGroupResponseSchema = createSuccessResponseSchema(groupSchema);

export const updateGroupRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .optional()
    .openapi({
      description: 'Updated name of the group',
      example: 'Senior Engineering Team',
    }),
  description: z.string().optional().openapi({
    description: 'Updated description of the group',
    example: 'Senior development and engineering staff',
  }),
  metadata: jsonSchema.optional().openapi({
    description: 'Arbitrary key-value metadata for the group',
    example: { department: 'engineering', tier: 'premium' },
  }),
  permissionIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of permission IDs to assign to the group',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the group',
      example: ['123e4567-e89b-12d3-a456-426614174002'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the group',
    example: '123e4567-e89b-12d3-a456-426614174002',
  }),
});

export const groupParamsSchema = z.object({
  id: z
    .string()
    .uuid('errors.validation.invalidGroupId')
    .openapi({
      description: 'UUID of the group',
      example: '123e4567-e89b-12d3-a456-426614174006',
      param: { in: 'path', name: 'id' },
    }),
});

export const updateGroupResponseSchema = createSuccessResponseSchema(groupSchema);

export const deleteGroupQuerySchema = z.object({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteGroupResponseSchema = createSuccessResponseSchema(groupSchema);
