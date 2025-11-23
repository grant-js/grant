import { ProjectSortableField, SortOrder } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const projectWithRelationsSchema = projectSchema.extend({
  roles: z.array(z.unknown()).optional(),
  groups: z.array(z.unknown()).optional(),
  permissions: z.array(z.unknown()).optional(),
  users: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
});

export const projectRelationsEnum = z.enum(['roles', 'groups', 'permissions', 'users', 'tags']);

export const getProjectsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z
    .enum(Object.values(ProjectSortableField) as [ProjectSortableField, ...ProjectSortableField[]])
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
    .array(projectRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['roles', 'users', 'tags'],
    }),
});

export const getProjectsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(projectWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createProjectRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').openapi({
    description: 'Name of the project',
    example: 'Mobile App',
  }),
  description: z.string().optional().openapi({
    description: 'Description of the project',
    example: 'iOS and Android mobile application',
  }),
  scope: scopeSchema,
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the project',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the project',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const createProjectResponseSchema = createSuccessResponseSchema(projectSchema);

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional().openapi({
    description: 'Updated name of the project',
    example: 'Mobile App v2',
  }),
  description: z.string().optional().openapi({
    description: 'Updated description of the project',
    example: 'Next generation mobile application',
  }),
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the project',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the project',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const projectParamsSchema = z.object({
  id: z
    .string()
    .uuid('Invalid project ID')
    .openapi({
      description: 'UUID of the project',
      example: '123e4567-e89b-12d3-a456-426614174005',
      param: { in: 'path', name: 'id' },
    }),
});

export const updateProjectResponseSchema = createSuccessResponseSchema(projectSchema);

export const deleteProjectQuerySchema = z.object({
  scopeId: z.uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteProjectResponseSchema = createSuccessResponseSchema(projectSchema);
