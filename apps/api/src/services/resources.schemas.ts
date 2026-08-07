import { permissionConditionSchema } from '@grantjs/core';
import { ResourceSortableField } from '@grantjs/schema';
import { z } from 'zod';

import {
  actionSchema,
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  paginatedResponseSchema,
  queryParamsSchema,
  scopeSchema,
  slugSchema,
  sortOrderSchema,
} from './common/schemas';

const resourceSortableFieldSchema = z.enum(
  Object.values(ResourceSortableField) as [ResourceSortableField, ...ResourceSortableField[]]
);
const resourceSortInputSchema = z.object({
  field: resourceSortableFieldSchema,
  order: sortOrderSchema,
});

export const getResourcesParamsSchema = queryParamsSchema.extend({
  sort: resourceSortInputSchema.nullable().optional(),
});

export const createResourceParamsSchema = z.object({
  name: nonEmptyNameSchema,
  slug: slugSchema,
  description: descriptionSchema,
  actions: z.array(actionSchema).nullable().optional(),
  isActive: z.boolean().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const updateResourceParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    scope: scopeSchema,
    name: nonEmptyNameSchema.nullable().optional(),
    slug: slugSchema.nullable().optional(),
    description: descriptionSchema.nullable().optional(),
    actions: z.array(actionSchema).nullable().optional(),
    isActive: z.boolean().nullable().optional(),
    tagIds: z.array(idSchema).nullable().optional(),
    primaryTagId: z
      .union([idSchema, z.literal(''), z.null()])
      .nullable()
      .optional()
      .transform((val) => (val === '' ? null : val)),
  }),
});

export const deleteResourceParamsSchema = deleteSchema.extend({
  id: idSchema,
});

/** Permission row embedded on Resource (no nested `resource` — avoids circular zod with permissionSchema). */
const resourcePermissionSchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema.nullable(),
  action: actionSchema,
  resourceId: idSchema.nullable(),
  condition: permissionConditionSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
});

export const resourceSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.nullable(),
  actions: z.array(actionSchema),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  permissions: z.array(resourcePermissionSchema).optional(),
});

export const resourcePageSchema = paginatedResponseSchema(resourceSchema).transform((data) => ({
  resources: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
