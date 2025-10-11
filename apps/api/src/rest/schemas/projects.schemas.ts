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
  scopeId: z.string().uuid('Invalid scope ID'),
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
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  scope: scopeSchema,
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const createProjectResponseSchema = createSuccessResponseSchema(projectSchema);

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const projectParamsSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
});

export const updateProjectResponseSchema = createSuccessResponseSchema(projectSchema);

export const deleteProjectQuerySchema = z.object({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteProjectResponseSchema = createSuccessResponseSchema(projectSchema);
