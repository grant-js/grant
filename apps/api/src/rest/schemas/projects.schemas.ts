import { ProjectSortableField, SortOrder } from '@grantjs/schema';

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
  scopeId: z.uuid('errors.validation.invalidScopeId'),
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
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
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
  scope: scopeSchema,
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .optional()
    .openapi({
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
    .uuid('errors.validation.invalidProjectId')
    .openapi({
      description: 'UUID of the project',
      example: '123e4567-e89b-12d3-a456-426614174005',
      param: { in: 'path', name: 'id' },
    }),
});

export const updateProjectResponseSchema = createSuccessResponseSchema(projectSchema);

export const deleteProjectQuerySchema = z.object({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteProjectResponseSchema = createSuccessResponseSchema(projectSchema);

const permissionRefCdmSchema = z.object({
  resourceSlug: z.string().min(1),
  action: z.string().min(1),
  permissionId: z.string().uuid().optional(),
  condition: z.record(z.string(), z.unknown()).optional().nullable(),
});

const roleTemplateCdmSchema = z.object({
  externalKey: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  permissionRefs: z.array(permissionRefCdmSchema),
});

const userAssignmentCdmSchema = z.object({
  userId: z.string().uuid(),
  roleTemplateKeys: z.array(z.string()).optional(),
  directPermissionRefs: z.array(permissionRefCdmSchema).optional(),
});

/** Body for POST /api/projects/:id/permissions/sync (canonical data model import). */
export const syncProjectPermissionsRequestSchema = z.object({
  scope: scopeSchema,
  cdmVersion: z.number().int(),
  importId: z.string().optional(),
  roleTemplates: z.array(roleTemplateCdmSchema),
  userAssignments: z.array(userAssignmentCdmSchema),
});

export const syncProjectPermissionsResultSchema = z.object({
  projectId: z.string(),
  importId: z.string().nullable(),
  rolesCreated: z.number(),
  groupsCreated: z.number(),
  roleGroupsLinked: z.number(),
  groupPermissionsLinked: z.number(),
  projectRolesLinked: z.number(),
  projectGroupsLinked: z.number(),
  projectPermissionsLinked: z.number(),
  projectResourcesLinked: z.number(),
  projectUsersEnsured: z.number(),
  userRolesAssigned: z.number(),
  warnings: z.array(z.string()),
});

export const syncProjectPermissionsResponseSchema = createSuccessResponseSchema(
  syncProjectPermissionsResultSchema
);
