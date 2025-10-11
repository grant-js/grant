import { SortOrder } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const userWithRelationsSchema = userSchema.extend({
  roles: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
  accounts: z.array(z.unknown()).optional(),
  authenticationMethods: z.array(z.unknown()).optional(),
});

export const userRelationsEnum = z.enum(['roles', 'tags', 'accounts', 'authenticationMethods']);

export const getUsersQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
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
    .array(userRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['roles', 'tags'],
    }),
});

export const getUsersResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(userWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  }),
  'Paginated list of users'
);

export const createUserRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  scope: scopeSchema,
  roleIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const createUserResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully created user'
);

export const updateUserRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  roleIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const userParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

export const updateUserResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully updated user'
);

export const deleteUserQuerySchema = z.object({
  scopeId: z.string().uuid('Invalid scope ID'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteUserResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully deleted user'
);
